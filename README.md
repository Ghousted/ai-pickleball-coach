# AI Coach

A coaching PWA for people who play a sport (sample sport: pickleball). Upload a clip, get tips tied to
moments in it, pick a quest (a 10-drill program on your play days), compare two clips, and earn XP.
Built from `PRD.md`, `sitemap.md`, `user-journey.md` and the "AI Coach Prototype v2" design.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No accounts are needed to run it locally:

| Setting not set | What the app uses instead |
| --- | --- |
| `DATABASE_URL` | PGlite, a local Postgres in `.data/pglite` (migrated on start) |
| `BLOB_READ_WRITE_TOKEN` | Clips stored in `.data/uploads`, sent to this server |
| `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | `AI_PROVIDER=mock`: sample answers from the design |

Copy `.env.example` to `.env.local` to use the real services. With Neon, run `npm run db:migrate` once.

## Stack (PRD section 7)

Next.js 16 PWA · Better Auth (email and password) · Neon Postgres with Drizzle · Vercel Blob (private
store, direct upload from the phone) · Gemini or OpenRouter, picked by `AI_PROVIDER`.

## How the AI part works

- `knowledge/pickleball.md` is sent with every review. Each tip names one cue from it.
- `src/lib/ai/agents.ts` holds four plain functions that return validated JSON:
  Review (read, then advise: observations first, 0 to 5 tips), Grade (a drill clip), Compare, and
  Coach (tailors a quest's 10 drills to the unflagged tips). Code, not the AI, assigns drills to play days
  and adds the "not medical advice" note.
- Long jobs: `POST /api/videos/[id]/review` moves the video to `reviewing` in one atomic update, runs the
  agent with `after()` (`maxDuration` 300 s, AI call stops at 240 s), and the page polls. A job stuck
  for more than about 5 minutes is marked `failed` and the page shows Try again.

## Map

| Screen (design) | Route |
| --- | --- |
| 01 Landing, sign up, sign in | `/` |
| 03 Setup | `/setup` |
| 05b Film wizard / 05 How to film | `/film/wizard`, `/film` |
| 04 Videos / 06 Upload | `/videos`, `/videos/upload` |
| 08 Reviewing, 09 Reward, 10 Tips, 16 Can't review, 17 Failed | `/videos/[id]` |
| 11 Coach chat | `/chat?thread=general` or `?thread=<videoId>` |
| 13a Quest home / 12 Choose / 13 Quest path | `/quests`, `/quests/choose`, `/quests/path` |
| 14 Drill / 14b Drill grade | `/drills/[id]`, `/drills/[id]/grade` |
| 19 Compare pick / 20 Before and after | `/compare`, `/compare/[id]` |
| 22 Journey | `/journey` |
| 24 You / 25 Badges / 26 Edit / 23 Flagged | `/you`, `/you/badges`, `/you/edit`, `/you/flagged` |
