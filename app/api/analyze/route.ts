import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { isNonEmptyString, isCSVRowArray, isAnalysisResponse } from '@/lib/ai-helpers';
import { analyzeQuery } from '@/lib/data-analyzer';
import type { AnalysisResponse } from '@/types';

// ─── Rate limiting ────────────────────────────────────────────────────────────

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

// ─── Request types ────────────────────────────────────────────────────────────

interface AnalyzeRequest {
  question: string;
  csvData: Record<string, string>[];
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(question: string, context: ReturnType<typeof analyzeQuery>): { system: string; user: string } {
  const { calculation, filtered, matchedRows, totalRows } = context;

  const hasGroups = calculation.groupedData && calculation.groupedData.length > 0;

  const dataBlock = hasGroups
    ? `Aggregated data (${calculation.groupedData!.length} groups — USE THIS as chartData):\n${JSON.stringify(calculation.groupedData, null, 2)}`
    : `Filtered rows (${matchedRows} of ${totalRows} total, showing first ${Math.min(filtered.length, 20)}):\n${JSON.stringify(filtered.slice(0, 20), null, 2)}`;

  const system = `You are a data visualization assistant. The data has ALREADY been filtered and aggregated — do NOT recalculate.

Pre-calculated result:
${calculation.description}

${dataBlock}

Your task:
1. Write a natural language answer using the EXACT numbers from the pre-calculated result
2. Choose chart type: bar (comparisons), line (time trends), pie (proportions ≤6 slices), table (detailed rows)
3. Use the aggregated data above directly as chartData — do NOT alter the numbers
4. Set xKey/yKey to match the data keys

Return ONLY valid JSON — no markdown, no extra keys:
{
  "answer": "Natural language summary referencing exact figures",
  "chartType": "bar" | "line" | "pie" | "table",
  "chartData": [...],
  "chartConfig": {
    "xKey": "...",
    "yKey": "...",
    "title": "..."
  }
}`;

  const user = `Question: "${question}"`;

  return { system, user };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  const { question, csvData } = body as Partial<AnalyzeRequest>;

  if (!isNonEmptyString(question)) {
    return NextResponse.json(
      { error: '`question` is required and must be a non-empty string.' },
      { status: 400 }
    );
  }

  if (question.length > 1000) {
    return NextResponse.json(
      { error: '`question` must be 1000 characters or fewer.' },
      { status: 400 }
    );
  }

  if (!isCSVRowArray(csvData)) {
    return NextResponse.json(
      { error: '`csvData` must be a non-empty array of string-valued objects.' },
      { status: 400 }
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'Server configuration error. Please contact support.' },
      { status: 503 }
    );
  }

  // Pre-filter and pre-aggregate BEFORE calling AI
  const analysisContext = analyzeQuery(question, csvData);

  const { system, user } = buildPrompt(question, analysisContext);

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  let rawContent: string;
  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    rawContent = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!rawContent) throw new Error('Empty response from AI service.');
  } catch (err) {
    console.error('[analyze] Groq API error:', err);
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) {
        return NextResponse.json(
          { error: 'AI service is currently busy. Please try again shortly.' },
          { status: 503 }
        );
      }
      if (err.status === 401) {
        return NextResponse.json(
          { error: 'Server configuration error. Please contact support.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: `AI service error (${err.status}): ${err.message}` },
        { status: 502 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to get a response from the AI service: ${msg}` },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    const cleaned = rawContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'AI returned an unparseable response. Please try again.' },
      { status: 502 }
    );
  }

  if (!isAnalysisResponse(parsed)) {
    return NextResponse.json(
      { error: 'AI response did not match the expected format. Please try again.' },
      { status: 502 }
    );
  }

  // Attach the filtered source rows so the frontend can show a "View Data" panel
  const responseWithSource: AnalysisResponse = {
    ...(parsed as AnalysisResponse),
    sourceData: analysisContext.filtered,
    matchedRows: analysisContext.matchedRows,
    totalRows: analysisContext.totalRows,
  };

  return NextResponse.json<AnalysisResponse>(responseWithSource, { status: 200 });
}
