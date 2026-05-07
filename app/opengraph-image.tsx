import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Logistics AI Analyzer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 60%, #f0fdf4 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: '600', color: '#64748b', letterSpacing: '0.05em' }}>
            LOGISTICS AI ANALYZER
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: '800',
            color: '#0f172a',
            lineHeight: '1.1',
            maxWidth: '800px',
            marginBottom: '28px',
          }}
        >
          Ask your logistics data anything.
        </div>

        {/* Sub */}
        <p
          style={{
            fontSize: '26px',
            color: '#475569',
            maxWidth: '700px',
            lineHeight: '1.5',
            margin: '0 0 48px',
          }}
        >
          Upload a CSV. Get AI-powered insights, trends, and charts — instantly.
        </p>

        {/* Pill badges */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Claude AI', 'Next.js 16', 'Recharts'].map((label) => (
            <div
              key={label}
              style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '999px',
                padding: '8px 20px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#4338ca',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
