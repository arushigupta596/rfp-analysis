# IRCTC RFP Vendor Analyzer

AI-powered vendor evaluation tool for the IRCTC AI Chatbot RFP 2025. Upload three vendor `.docx` proposals, and the system queries a pre-indexed RFP and scores each vendor using QCBS methodology.

## Architecture

```
ONE TIME (locally):
  RFP PDF → PageIndex (Python) → frontend/lib/rfp-index.json → commit to GitHub

EVERY ANALYSIS (runs on Vercel):
  3 vendor .docx uploads
        ↓
  mammoth parses → plain text
        ↓
  TypeScript tree search queries rfp-index.json
  (finds relevant nodes by reasoning with Claude)
        ↓
  Relevant RFP sections + vendor text → Claude via OpenRouter
        ↓
  Structured JSON → Results dashboard
```

## Project Structure

```
RFP-Analyzer/
├── frontend/                  # Next.js 14 app (deploy to Vercel)
│   ├── app/
│   │   ├── page.tsx           # Upload page
│   │   ├── results/page.tsx   # Results dashboard
│   │   └── api/analyze/       # Route handler (mammoth + LLM)
│   ├── lib/
│   │   ├── rfp-index.json     # Pre-built RFP index (commit this)
│   │   ├── pageindex-retriever.ts  # TypeScript tree search
│   │   └── prompts.ts         # Evaluation prompt builder
│   └── .env.local.example
├── backend/                   # Legacy Python backend (unused for Vercel deploy)
│   ├── rfp_index.json         # Source index built by PageIndex
│   └── pageindex_lib/         # Cloned PageIndex repo
└── scripts/
    ├── build-rfp-index.py     # ONE-TIME: PDF → rfp-index.json
    └── requirements.txt
```

---

## Setup

### 1. Install frontend dependencies
```bash
cd frontend
npm install
```

### 2. Add environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local and add your OpenRouter API key
```

### 3. Build RFP index (ONE TIME ONLY)
```bash
# From project root
pip install -r scripts/requirements.txt

python3 scripts/build-rfp-index.py --pdf /path/to/rfp.pdf
# Output: frontend/lib/rfp-index.json

git add frontend/lib/rfp-index.json
git commit -m "Add RFP index (52 nodes)"
git push
```

The `frontend/lib/rfp-index.json` already contains the pre-built index for `85281205_TD_169_Lnf9.pdf`.

### 4. Run locally
```bash
cd frontend
npm run dev
# Opens http://localhost:3000
```

### 5. Deploy to Vercel
```bash
vercel --prod
# Add OPENROUTER_API_KEY in Vercel dashboard → Settings → Environment Variables
```

---

## How it works

1. **RFP is pre-indexed** — PageIndex builds a 52-node tree index of the RFP PDF. This JSON is committed to the repo and loaded at runtime (no PDF needed on Vercel).

2. **User uploads 3 vendor `.docx` files** — mammoth extracts plain text from each file in the Next.js API route.

3. **TypeScript tree search** — `lib/pageindex-retriever.ts` sends the flat node list to Claude with 6 parallel queries (eligibility, technical scoring, deliverables, SLA, commercial terms, compliance). Claude scores each node 0–10 for relevance.

4. **QCBS evaluation** — `lib/prompts.ts` builds a structured prompt with the retrieved RFP sections + vendor texts. Claude returns a JSON report with eligibility flags, technical scores, missing deliverables, and QCBS rankings.

5. **Results dashboard** — `/results` page shows the winner banner, QCBS summary, eligibility grid, technical breakdown, missing deliverables, strengths/risks, and the RFP sections used.

---

## Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key (get from openrouter.ai) |
