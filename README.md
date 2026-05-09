<div align="center">
  <img src="frontend/public/IPLLogo.webp" alt="IPL Logo" width="120" />

  <h1>Probicket</h1>
  <p><strong>AI-powered IPL Player Akinator</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
    <img src="https://img.shields.io/badge/Express-4-green?style=flat-square&logo=express" />
    <img src="https://img.shields.io/badge/Gemini-AI-blue?style=flat-square&logo=google" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" />
    <img src="https://img.shields.io/badge/Google_Sheets-data-brightgreen?style=flat-square&logo=googlesheets" />
  </p>

  <p><em>Built for the <strong>GDG AI Akinator Hackathon</strong> — guess any IPL cricketer in 12 smart questions.</em></p>
</div>

---

## What is this?

Probicket is an AI-powered guessing game inspired by the classic Akinator — but built exclusively for the **Indian Premier League (IPL)**. Think of any IPL cricketer (past or present), and the system will identify them by asking up to 12 adaptive yes/no questions.

**It was built as a submission for the GDG AI Akinator Hackathon**, which challenged teams to create an intelligent, dynamic deduction system using LLMs — with no hardcoded decision trees allowed.

---

## How it works

```
User thinks of an IPL player
        │
        ▼
  AI asks Question 1
  (picks attribute with ~50% split across all candidates)
        │
     User answers: Yes / No / Maybe / Don't Know
        │
        ▼
  System filters candidate pool locally (instant)
  Remaining 0%/100% attributes are excluded from future questions
        │
        ▼
  Repeat until:
  ┌─────────────────────────────────────────────────┐
  │  confidence ≥ 80%  →  AI makes a guess          │
  │  candidates = 1    →  AI makes a guess          │
  │  12 questions done →  AI makes best guess       │
  └─────────────────────────────────────────────────┘
        │
     User confirms correct / wrong
     └─ Wrong? → Continue game up to 12 questions
```

### Key design decisions

| Layer | Approach | Why |
|-------|----------|-----|
| Question selection (large pool) | **Pure local math** — picks the attribute closest to 50/50 split | Instant, deterministic, no Gemini tokens |
| Question selection (small pool ≤15) | **Gemini generates contextual question** using actual player names | Player-aware phrasing ("Is this player known for finishing matches from No. 7?") |
| Candidate filtering | **100% local TypeScript** — no AI call | Avoids hallucination; deterministic elimination |
| Final guess | **Gemini** with candidate names + Q&A history | Best use of reasoning capability |
| Player data | **Google Sheets** (seeded via Gemini enrichment script) | Easy to update, no database needed |

---

## Tech stack

### Backend
- **Node.js + Express + TypeScript** — REST API
- **Zod** — request/env validation
- **Google Sheets API** — player database (read) + feedback log (write)
- **Gemini AI** (`gemini-2.5-flash-lite`) — contextual question generation + final guess
- **pnpm** — package manager

### Frontend
- **Next.js 16** (App Router, React 19)
- **Tailwind CSS v4** — utility styling with OKLCH design tokens
- **motion/react v12** — animations and micro-interactions
- **TanStack Query v5** — server state, mutation management
- **next-view-transitions** — page transition animations
- **canvas-confetti** — celebration on correct guess
- **pnpm** — package manager

---

## Project structure

```
probicket/
├── backend/
│   ├── src/
│   │   ├── config/          # Zod-validated env config
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── interfaces/      # IPlayerRepository, IAIService, ISessionStore
│   │   ├── middleware/       # Validation, rate limiting, error handling
│   │   ├── repositories/    # Google Sheets data access
│   │   ├── routes/          # Express route definitions
│   │   ├── schemas/         # Zod schemas (player rows, request bodies)
│   │   ├── services/        # GameService, GeminiAIService, SessionStore, Cache
│   │   ├── types/           # TypeScript interfaces
│   │   └── utils/           # Logger, Sheets client
│   └── scripts/
│       └── seed-players.ts  # One-time: CSV + Gemini → Google Sheets
│
└── frontend/
    └── src/
        ├── app/             # Next.js App Router pages (/, /game, /result)
        ├── components/
        │   ├── game/        # QuestionCard, AnswerGrid, ProgressBar, GuessReveal…
        │   └── ui/          # Button, Badge, Spinner, ThemeToggle, DotGrid
        ├── lib/
        │   ├── api/         # Fetch interceptor + typed game API functions
        │   └── hooks/       # TanStack Query hooks (useStartGame, useAnswerQuestion…)
        ├── providers/       # QueryProvider
        └── types/           # Shared type definitions
```

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/game/start` | Start a new game session |
| `POST` | `/api/v1/game/:id/answer` | Submit an answer (`yes/no/maybe/don't_know`) |
| `POST` | `/api/v1/game/:id/reject-guess` | Reject the AI's guess and continue |
| `POST` | `/api/v1/game/:id/feedback` | Log correct player name (learning signal) |
| `GET`  | `/api/v1/game/:id/state` | Get current session state |
| `GET`  | `/api/v1/health` | Health check + player count |

---

## Local setup

### Prerequisites
- Node.js 20+
- pnpm (`npm i -g pnpm`)
- A Google Cloud project with **Google Sheets API** enabled
- A **Gemini API key** from [aistudio.google.com](https://aistudio.google.com)

---

### 1. Clone and install

```bash
git clone <repo-url>
cd probicket

# Install backend deps
cd backend && pnpm install

# Install frontend deps
cd ../frontend && pnpm install
```

---

### 2. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```env
NODE_ENV=development
PORT=3001

# Google Cloud service account (enable Sheets API + create SA + download JSON key)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sheet ID — from the URL: /spreadsheets/d/<THIS_PART>/edit
SHEETS_SPREADSHEET_ID=your_spreadsheet_id

SHEETS_PLAYERS_TAB=Players
SHEETS_FEEDBACK_TAB=Feedback

# Gemini — free tier works fine
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash-lite

SESSION_TTL_MS=1800000
ALLOWED_ORIGIN=http://localhost:3000
```

> **Google Sheets setup:**
> 1. `console.cloud.google.com` → Create project → Enable **Google Sheets API**
> 2. IAM → Service Accounts → Create → Download JSON key
> 3. Create a blank Google Sheet with tabs named **Players** and **Feedback**
> 4. Share the sheet with the service account email (Editor)

---

### 3. Seed the player database

Place the IPL player CSVs in `backend/scripts/data/`:
- `ipl_player_database.csv` — canonical player names, teams, years active
- `IPLPlayerAuctionData.csv` — roles, origin (Indian/Overseas), auction teams

Then run:

```bash
cd backend
pnpm seed
```

This reads both CSVs, calls Gemini to enrich player attributes (nationality, batting hand, bowling style, IPL achievements etc.), and writes ~150–200 notable players to your Google Sheet. Takes ~2 minutes. Spot-check 5–10 rows afterwards.

---

### 4. Start the backend

```bash
cd backend
pnpm dev
# → Server running on port 3001 with N players loaded
```

---

### 5. Configure and start the frontend

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
pnpm dev
# → Ready on http://localhost:3000
```

---

### 6. Play

Open [http://localhost:3000](http://localhost:3000), think of an IPL player, and start answering!

---

## How the AI deduction works

### Question selection (the smart part)

After each answer, the candidate pool is filtered. The next question is selected by finding the attribute with **maximum information gain** — the one whose true/false ratio across remaining candidates is closest to 50/50:

```typescript
// Pure local computation — no API call needed
function selectBestAttribute(candidates, askedAttributes) {
  let bestScore = Infinity
  for (const attr of ALL_ATTRIBUTES) {
    const ratio = candidates.filter(p => getAttributeValue(p, attr)).length / candidates.length
    if (ratio === 0 || ratio === 1) continue  // already known from context — skip
    const score = Math.abs(0.5 - ratio)
    if (score < bestScore) { bestScore = score; best = attr }
  }
}
```

**Zero-information attributes are automatically excluded.** If you answer "Yes, they're a batsman", the attributes `role:bowler`, `role:allrounder`, and `role:wicketkeeper` become 0% across the remaining pool and are never asked again.

### Player attributes used for deduction

`isForeignPlayer` · `role` (batsman/bowler/allrounder/wicketkeeper) · `batsRightHanded` · `bowlingStyle` (fast/spin/none) · `hasWonIPL` · `isCurrentlyCaptain` · `isVeteran` (debut ≤ 2012) · `hasPlayedOver100IPLMatches` · `hasPlayedTestCricket` · `hasPlayedWorldCup` · `isWellKnown` · `hasPlayedForMoreThanOneTeam`

---

## GDG Hackathon context

This project was built for the **GDG AI Akinator Hackathon**, which required teams to:

- Build an AI system that identifies an IPL player through ≤12 adaptive questions
- Use genuine AI reasoning — **no hardcoded decision trees allowed**
- Maximise information gain at each step
- Deliver a smooth, engaging user experience
- Implement learning from incorrect guesses (feedback loop to Sheets)

**Our approach:** The information-maximising attribute selector handles the deduction logic deterministically (fastest path, no AI cost), while Gemini handles the parts that genuinely benefit from language understanding — contextual question phrasing for small pools and the final player identification. This keeps the game snappy and the Gemini usage minimal and purposeful.

---

## Authors

Built by **Anmol Kumar** for GDG Hackathon 2025.
