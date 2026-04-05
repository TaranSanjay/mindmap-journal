# MindMap Journal

An AI-powered psychological journal that analyses emotional patterns over time using a conversational agent, NLI scoring, and an LSTM mood classifier.

## Features

- **Conversational journal agent** — asks targeted follow-up questions to understand the emotional nuance behind entries
- **5-dimension emotion scoring** — Joy, Calm, Sadness, Anxiety, Anger each rated 1–10
- **Composite daily score** — weighted formula produces a single daily wellbeing score
- **Mood dashboard** — timeline chart, emotion breakdown, streak tracking, radar chart
- **Privacy-first** — encrypted at rest, row-level security, no PII in analytics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Charts | Recharts |
| Auth + DB | Supabase (PostgreSQL + Row Level Security) |
| AI Agent | Anthropic Claude (claude-sonnet-4) |
| ML Model | PyTorch LSTM — FastAPI on Railway |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/mindmap-journal.git
cd mindmap-journal
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 4. Train the ML model (optional — skip for Claude-only scoring)

```bash
cd ml
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python train.py           # Downloads GoEmotions, trains ~20 epochs
python server.py          # Start FastAPI on port 8000
```

### 5. Run the dev server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment

### Vercel (frontend)

```bash
npm install -g vercel
vercel
```

Add all `.env.local` variables in the Vercel dashboard under **Settings → Environment Variables**.

### Railway (ML service)

1. Push the repo to GitHub
2. Create a new Railway project → deploy from GitHub
3. Set root directory to `ml/`
4. Set start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add env vars: `MODEL_PATH`, `VOCAB_PATH`, `INTERNAL_SECRET`
6. Copy the Railway public URL → add as `ML_SERVICE_URL` in Vercel env vars

---

## Security Notes

- JWT tokens stored in `httpOnly` cookies (XSS-proof)
- Row Level Security: every DB query is auto-scoped to `auth.uid()`
- Rate limiting: 100 requests/hour per user on all API routes
- Input sanitisation: all user content length-capped and stripped before LLM calls
- ML service is internal-only, protected by `X-Internal-Secret` header
- HSTS, CSP, X-Frame-Options headers set on all responses
- No PII stored in analytics or feedback tables

---

## ML Model Details

The LSTM emotion classifier is trained on the [GoEmotions](https://huggingface.co/datasets/go_emotions) dataset (58k Reddit comments, 28 emotion labels) mapped to our 5 dimensions.

**Architecture:** 2-layer Bidirectional LSTM with attention pooling, 5 independent sigmoid regression heads

**Training features:**
- Xavier uniform init for input weights, orthogonal for recurrent weights
- Cosine Annealing with Warm Restarts LR scheduling (T₀=5, η_min=1e-6)
- AdamW optimiser with L2 weight decay (1e-4)
- Input/recurrent dropout (0.3)
- Gradient clipping (max norm = 1.0)

**Performance (validation set):**
- Overall ±1 accuracy: ~72%
- Best validation MSE: ~1.8

---

## Project Structure

```
mindmap-journal/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── journal/page.tsx        ← main chat UI
│   ├── dashboard/page.tsx      ← analytics
│   └── api/
│       ├── agent/route.ts      ← conversational agent
│       └── entries/route.ts    ← journal CRUD
├── components/
│   └── dashboard/
│       ├── EmotionRadar.tsx
│       ├── MoodTimeline.tsx
│       └── EmotionBreakdown.tsx
├── lib/
│   ├── supabase.ts
│   ├── utils.ts               ← scoring formula + helpers
│   ├── rate-limit.ts
│   └── types.ts
├── ml/
│   ├── model.py               ← LSTM architecture
│   ├── train.py               ← training + performance report
│   ├── server.py              ← FastAPI inference service
│   └── requirements.txt
├── supabase/
│   └── schema.sql             ← DB schema + RLS policies
└── styles/
    └── globals.css
```
