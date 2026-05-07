# Logistics AI Analyzer

Ask plain-English questions about your logistics data and get instant AI-generated insights, charts, and analysis — no SQL or spreadsheet formulas required.

Upload a CSV of shipment records, type a question like *"Which carrier has the most delays?"*, and the app returns a written answer plus a bar, line, or pie chart ready for your presentation.

---

## Screenshots

> **Upload & explore** — drag-and-drop CSV upload with an instant searchable data table.

<!-- Add screenshot: public/screenshots/upload.png -->

> **AI insights** — natural-language question → written answer + Recharts visualization.

<!-- Add screenshot: public/screenshots/analysis.png -->

---

## Key Features

- **Drag-and-drop CSV upload** with file validation (`.csv` only, max 10 MB) and a 5-row preview
- **Searchable, sortable, paginated data table** with mobile card layout
- **Natural-language queries** — powered by Claude Sonnet 4 via the Anthropic API
- **Dynamic charts** — bar, line, pie, and table output driven by Claude's response
- **Query history** — last 5 questions are one click away
- **Chart export** — download any chart as a PNG
- **Toast notifications** and graceful error handling at every step
- **Fully accessible** — keyboard navigation, ARIA labels, screen-reader announcements
- **Responsive** — three-column dashboard on wide screens, stacked on mobile

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.5 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| AI | Anthropic SDK + Claude Sonnet 4 | ^0.95.0 |
| CSV parsing | PapaParse | ^5.5.3 |
| Charts | Recharts | ^3.8.1 |
| Runtime | Node.js | 18+ |

---

## Prerequisites

- **Node.js 18 or higher** — [download](https://nodejs.org/)
- **npm 9+** (comes with Node.js)
- **An Anthropic API key** — [get one free](https://console.anthropic.com/) (takes ~2 minutes)

---

## Local Setup

### 1 — Clone the repository

```bash
git clone <your-repo-url>
cd logistics-ai-tool
```

### 2 — Install dependencies

```bash
npm install
```

### 3 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and add your key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

> **Where to get the key:** Log in to [console.anthropic.com](https://console.anthropic.com/), go to **API Keys**, and click **Create Key**. Copy the value — you won't be able to see it again.

### 4 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the dashboard.

---

## Try It With Sample Data

A ready-made CSV lives at `public/sample-logistics.csv`. It contains **75 shipment records** spanning February–April 2025 across six carriers and ten US city pairs — ideal for demoing every query type.

Download it from the running app at [http://localhost:3000/sample-logistics.csv](http://localhost:3000/sample-logistics.csv), then upload it on the dashboard.

**Suggested demo queries:**

| Question | Expected chart |
|---|---|
| Which routes had the most delays? | Bar chart |
| Show average delivery cost by carrier | Bar chart |
| What's the delay trend over time? | Line chart |
| What percentage of shipments were delayed? | Pie chart |
| Which destinations have the best on-time rate? | Bar chart |
| List the top 10 most expensive shipments | Table |

---

## CSV Format

The app works with **any** CSV that has a header row. For logistics data, the recommended columns are:

| Column | Type | Example |
|---|---|---|
| `shipment_id` | string | `SHP-1001` |
| `route` | string | `NYC-LAX` |
| `origin` | string | `New York` |
| `destination` | string | `Los Angeles` |
| `carrier` | string | `FastFreight` |
| `scheduled_date` | YYYY-MM-DD | `2025-03-15` |
| `actual_delivery_date` | YYYY-MM-DD | `2025-03-17` |
| `delay_hours` | number | `48` |
| `status` | string | `delayed` |
| `cost` | number | `1240.00` |

Column names don't have to match exactly — Claude reads whatever headers you provide and adapts its analysis accordingly.

**Limits:** `.csv` files only, maximum **10 MB**, maximum **200 rows sent to Claude** per query (larger files are sampled automatically with a summary appended so aggregate questions still work).

---

## Architecture Overview

```
app/
├── page.tsx              # Root client component — state, layout, data flow
└── api/
    └── analyze/
        └── route.ts      # POST /api/analyze — rate-limits, validates, calls Claude

components/
├── CSVUploader.tsx       # Drag-and-drop upload + PapaParse + preview
├── DataTable.tsx         # Search / sort / paginate table + mobile cards
├── QueryInterface.tsx    # Textarea, example chips, query history
├── ChartDisplay.tsx      # Recharts bar/line/pie/table + export
├── EmptyState.tsx        # Reusable empty/error placeholder
└── ErrorBoundary.tsx     # React error boundary wrapping each panel

lib/
├── csv-parser.ts         # parseCSV(file) → ParsedCSVData
└── ai-helpers.ts         # Data sampling, prompt building, type guards

types/
└── index.ts              # Shared TypeScript interfaces
```

**Request flow:**

```
User uploads CSV
  → PapaParse (client) → ParsedCSVData stored in page state
  → DataTable renders immediately

User submits question
  → POST /api/analyze  { question, csvData[] }
  → ai-helpers samples + summarises rows
  → Anthropic SDK → claude-sonnet-4-20250514
  → Claude returns JSON { answer, chartType, chartData, chartConfig }
  → ChartDisplay renders answer + Recharts chart
```

---

## Deployment to Vercel

Vercel is the fastest path to production for Next.js. The whole process takes about five minutes.

### Option A — Vercel CLI (recommended)

```bash
# Install once
npm i -g vercel

# Deploy from the project directory
vercel

# Follow the prompts, then add your environment variable:
vercel env add ANTHROPIC_API_KEY
```

### Option B — Vercel Dashboard

1. Push your code to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Vercel auto-detects Next.js — no build settings needed.
4. Before clicking **Deploy**, open **Environment Variables** and add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your `sk-ant-...` key
5. Click **Deploy**. Your app will be live at `https://<project>.vercel.app` in ~60 seconds.

### After deployment

- Every `git push` to your main branch triggers an automatic redeploy.
- Add a custom domain under **Project → Settings → Domains**.
- Monitor API usage at [console.anthropic.com](https://console.anthropic.com/).

> **Cost note:** The app uses Claude Sonnet 4, which is priced per token. A typical query against 75 rows costs well under $0.01. See [Anthropic's pricing page](https://www.anthropic.com/pricing) for current rates.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key (`sk-ant-...`) |

No other environment variables are needed. The rate-limit store is in-memory, which resets on each deployment — suitable for demos and single-instance production. For multi-instance deployments, replace the in-memory map in `app/api/analyze/route.ts` with a Redis store (e.g. [Upstash](https://upstash.com/)).

---

## Future Enhancements

- **Multi-file comparison** — upload two CSVs and ask Claude to compare them
- **Persistent query history** — save sessions to `localStorage` or a database
- **Redis rate limiting** — for production multi-instance deployments
- **Authentication** — protect the API route with NextAuth.js or Clerk
- **Streaming responses** — use the Anthropic streaming API to show the answer as it's generated
- **Chart customisation** — let users pick colours, axis labels, and chart type manually
- **Export to PDF** — bundle the answer + chart into a one-click PDF report
- **Scheduled analysis** — cron-triggered analysis of regularly updated data feeds

---

## Pre-Deployment Checklist

Work through this list before going live. Every item is independently verifiable.

### Build & Code Quality

- [ ] `npm run build` completes with no errors
- [ ] `npm run lint` returns no warnings or errors
- [ ] `npx tsc --noEmit` returns no type errors
- [ ] No `console.log` statements in production code
- [ ] `.env.local` is listed in `.gitignore` (never commit API keys)
- [ ] `.env.example` is committed so collaborators know what variables to set

### Environment Variables

- [ ] `ANTHROPIC_API_KEY` is set in `.env.local` (local) and in Vercel Project Settings (production)
- [ ] Key starts with `sk-ant-` and has not been rotated since you copied it
- [ ] Optional: `NEXT_PUBLIC_APP_URL` is set to your production domain for correct OG image URLs

### Features

- [ ] CSV upload works with `public/sample-logistics.csv`
- [ ] File validation rejects non-CSV files with a clear error message
- [ ] File validation rejects files over 10 MB with a clear error message
- [ ] Empty file shows a user-friendly error (not a crash)
- [ ] Data table: search filters results in real time
- [ ] Data table: column sort works ascending and descending
- [ ] Data table: pagination advances and retreats correctly
- [ ] All four example query chips populate the textarea correctly
- [ ] Submitting a query shows the loading skeleton, then renders the answer + chart
- [ ] Chart export downloads a file (PNG or SVG fallback)
- [ ] Uploading a second CSV replaces the first without a page reload
- [ ] Query history shows the last five questions and clicking one restores it

### Error Scenarios

- [ ] Submitting a query with no CSV loaded is blocked (button disabled)
- [ ] API error (e.g., invalid key) shows a helpful error toast — no raw error text exposed
- [ ] Rate limit (10 req/min) surfaces a friendly "please wait" message
- [ ] Network offline shows the network error toast

### Responsive / Accessibility

- [ ] Mobile (375 px): upload, table cards, and query panel stack vertically
- [ ] Tablet (768 px): two-column layout renders correctly
- [ ] Desktop (1280 px+): three-column dashboard is visible
- [ ] All interactive elements reachable by keyboard (Tab, Enter, Space)
- [ ] ⌘K / Ctrl+K focuses the query textarea from anywhere
- [ ] Screen reader: ARIA labels present on upload zone, table sort buttons, pagination nav

### Performance

- [ ] `npm run build` output shows `/ (Static)` for the home route — no unexpected SSR
- [ ] Recharts `ResponsiveContainer` renders without hydration mismatch warnings in browser console
- [ ] No "Maximum update depth exceeded" React warnings in console

### Vercel-Specific

- [ ] `vercel.json` is committed
- [ ] Project is linked: `vercel link` (or imported via dashboard)
- [ ] `ANTHROPIC_API_KEY` added under **Project → Settings → Environment Variables** for Production
- [ ] First deployment succeeds: `vercel --prod`
- [ ] Production URL opens and the app loads without a white screen
- [ ] `/sample-logistics.csv` is publicly accessible at the production URL

---

## Troubleshooting

**`ANTHROPIC_API_KEY` not found error on `/api/analyze`**
Make sure you have a `.env.local` file (not `.env`) and that you restarted `npm run dev` after adding the key.

**"Only .csv files are accepted" but my file is a CSV**
Check that the file extension is lowercase `.csv`. Some systems save as `.CSV` — rename it.

**Charts don't render / blank chart area**
This usually means Claude returned a `chartType` of `"none"` or an empty `chartData` array. Try rephrasing your question to ask for a specific comparison, e.g. "Compare delay hours by carrier as a bar chart."

**Rate limit hit (429)**
The API route allows 10 requests per minute per IP. Wait 60 seconds and try again. Increase `MAX_REQUESTS` in `app/api/analyze/route.ts` if needed for your use case.
