# studyUML

A gamified, ADHD-friendly study platform for college courses. Five questions at a time, XP for every answer, a level bar that moves while you watch, and spaced repetition doing the actual teaching underneath.

**Phase 0 (this repo state):** the complete core loop for one skill, *Smart Pointers* from Computing IV. No skill-tree map, no minibosses, no leagues, no streaks, no auth, no content pipeline. Those come in later phases; the schema already has room for them.

## Quick start

Requirements: Node 22, pnpm 10, Docker (for Postgres) or a local Postgres 16.

```bash
cp .env.example .env
docker compose up -d postgres        # Postgres 16 on localhost:5432 (Redis is defined too, unused in Phase 0)
pnpm install
pnpm db:migrate && pnpm db:seed      # schema + Computing IV tree + 30 Smart Pointers questions
pnpm dev                             # http://localhost:3000
```

Every request acts as the seeded dev user (`DEV_USER_EMAIL`). To start over: `pnpm db:reset`.

## The rules of the game

All tunables live in one file, `src/domain/config.ts`. The functions that apply them are pure and unit-tested.

**A session** is exactly 5 questions, always shown as "3 of 5". Wrong answers reveal the correct answer and the explanation, then you move on. Nothing is re-queued, nothing auto-advances, and there are no hearts or lives.

**XP per answer.** Base XP is `8 + 4 × difficulty` (difficulty 1–5 → 12–28). Correct answers are scaled by how they were reached, then by the combo:

| Outcome | Meaning | Multiplier |
|---|---|---|
| first try | first attempt ever on this question | ×1.0 |
| still got it | already answered correctly before, back for review | ×0.8 |
| got it this time | earlier attempts were wrong, correct now | ×0.6 |
| wrong | pays `max(2, 15% of base)`: 2–4 XP, never zero | flat |

**Combo** counts consecutive correct answers within a session: ×1.0, ×1.0, ×1.1, ×1.2, ×1.35, ×1.5 (cap at 5). A miss resets it to zero and nothing else. Amount = `round(base × outcome × combo)`, minimum 1.

**Levels.** XP to go from level *L* to *L+1* is `round(50 × L^1.5)`: 50, 141, 260, 400, 559, … Level 1 starts at 0 XP; a perfect first session is 123 XP, so the first level-up lands during the first session. The bar always shows a short-horizon line: "2 more correct → level up" when reachable this session, otherwise "N XP to level L+1".

**Spaced repetition.** Every user × question pair is an SM-2 card. Quality: first try 5, review 4, eventually-correct 3, wrong 1. Intervals run 1 day → 6 days → previous × ease; ease floors at 1.3; a wrong answer resets the interval and counts as a lapse. Cards that are due, and questions never yet answered correctly, are pulled back into sessions automatically.

**Session builder** fills the 5 slots in order: unseen questions of the current lesson (author order) → questions in this lesson never yet answered correctly → due cards in this lesson → due cards from earlier lessons → weakest cards in the skill → anything, least recently seen. A **lesson is complete** when every question in it has been answered correctly at least once; a **skill is complete** when every lesson is. When everything is complete, "Continue" becomes review (due cards) or practice (nothing due).

**XP is a ledger.** `xp_events` is append-only, enforced by a database trigger; the current total is always `SUM(amount)`. Corrections are new rows.

## Layout

```
src/domain/      pure game logic: xp, levels, combo, sm2, grading, session-builder, continue-resolver (+ tests)
src/db/          Drizzle schema (src/db/schema), migrations (drizzle/), idempotent seed + content (src/db/seed)
src/server/      the database-touching layer: current user seam, session service (the answer transaction), server actions
src/app/         Next.js App Router: / (Continue), /session/[id] (the loop), /session/[id]/summary
src/components/  LevelBar, ComboMeter, ProgressPips, XpBurst, FeedbackPanel, question widgets
e2e/             Playwright smoke test of the whole loop against a production build
```

ESLint forbids `src/domain` from importing the database, Next.js, or React. That is what keeps it testable in milliseconds.

The answer path is one transaction (`submitAnswer` in `src/server/sessions.ts`): lock the session → grade → classify outcome → combo → XP → append attempt, SM-2 card, XP event → advance session → roll lesson and skill progress → return everything the client needs to animate. Grading is server-authoritative; the answer key never reaches the browser.

## Content

Content is hand-written in a small typed DSL (`src/db/seed/define.ts`): `mc`, `tf`, `blank` (fill in the code), `diag` (what's wrong with this code). Each question carries difficulty, explanation, per-distractor feedback, and a `source_section`. The seed upserts by slug, so editing a question and re-running `pnpm db:seed` updates it in place without touching anyone's history.

Only questions with `status = 'approved'` are ever served. Generated questions (later phase) will arrive as `draft` and go through a review step before flipping to `approved`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` / `pnpm lint` | `next typegen && tsc`, ESLint |
| `pnpm test` | unit tests (vitest, no database) |
| `pnpm test:integration` | the answer transaction against `DATABASE_URL_TEST` |
| `pnpm test:e2e` | production build + Playwright smoke test on port 3100 against `DATABASE_URL_TEST` |
| `pnpm db:generate` | new migration from schema changes |
| `pnpm db:migrate` | apply migrations (plain Node, no TypeScript toolchain needed) |
| `pnpm db:seed` | upsert the course tree and questions |
| `pnpm db:reset` | drop everything, migrate, seed (development only) |
| `pnpm db:studio` | Drizzle Studio |

`pnpm test:e2e` needs `pnpm exec playwright install chromium` once, or `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome` to use an existing binary.

## Deploying (Hetzner via Coolify)

The `Dockerfile` builds a standalone Next.js image; on start it applies migrations, then serves on port 3000 with a `/api/health` healthcheck. In Coolify: create a Postgres 16 service, point the app at this repo with the Dockerfile build pack, and set `DATABASE_URL` and `DEV_USER_EMAIL`. Seed once from the container: `node --import tsx src/db/seed/seed.ts` is not available in the runtime image, so run `pnpm db:seed` from a machine that can reach the database, or add the seed to a one-off job.

## Not in Phase 0 (and where it will plug in)

| Later | Hook already present |
|---|---|
| Auth.js sign-in | `users` is shaped like the Auth.js adapter table; `getCurrentUser()` is the only place that decides who you are |
| Streaks and earned freezes | `users.timezone`, `xp_reason.streak_bonus`, timestamps on every attempt |
| Minibosses | `session_mode` (add `boss`), `xp_reason.boss` |
| Leagues, Redis, BullMQ | `REDIS_URL` reserved; `xp_events` is the ledger leagues will read |
| Skill-tree map | `user_progress.status` already carries lock state |
| Generated questions + review CLI | `questions.status/source/source_section/review_notes/reviewed_by` |
| Achievements | tables only |
