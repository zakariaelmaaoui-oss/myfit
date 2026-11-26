# SHADOW FIT — The Ultimate AI Fitness Hunter System

A dark-neon fitness RPG: real nutrition tracking, adaptive training, daily quests, XP/ranks and **THE SYSTEM**, an AI agent that reads and writes your real data with tool calling (Darija, العربية, Français, English).

Stack: React 18 + TypeScript + Tailwind (Vite) · Supabase (Postgres + RLS + Auth + private Storage) · Vercel serverless functions (`/api`) · Groq (AI, server-side only).

## Setup (one time)
1. **Database** — Supabase → SQL Editor → paste the whole of `supabase/shadow_fit.sql` → Run. Tables are prefixed `sf_`, so older tables are not touched. Safe to run again.
2. **Vercel → Settings → Environment Variables**

| Variable | Needed for | Where it lives |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | everything (public values) | browser + server |
| `GROQ_API_KEY` | THE SYSTEM chat, food photos, weekly AI evaluation | **server only** |
| `GROQ_MODEL` (optional) | default `openai/gpt-oss-120b`, falls back to `gpt-oss-20b` / `qwen` | server |
| `GROQ_VISION_MODEL` (optional) | food photos, default `qwen/qwen3.8-27b` | server |
| `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | push reminders only | server (except the public VAPID key) |

3. **Hourly reminders (optional)** — Vercel’s free plan runs crons once a day. For morning / pre-workout / evening pushes, add GitHub repository secrets `SHADOW_FIT_URL` and `CRON_SECRET`; `.github/workflows/notify.yml` then calls `/api/notify` every hour.

No secret key is ever shipped to the browser.

## What is real
- **Awakening**: profile → safe targets (Mifflin-St Jeor, moderate deficit, safety floors, no deficit for minors/pregnancy/medical cases).
- **THE SYSTEM** (`/api/system`): agent loop (max 6 steps) with 17 tools: log/delete food, water, exercise sets, finish workout, adjust difficulty, rebuild plan, quests, weight, check-in, progress, meal suggestions, memory. Action cards are built **only from database results**; failures are shown as “NOT SAVED”.
- **Nutrition**: verified USDA database (211 foods), custom foods, recipes, manual/AI estimates (clearly labelled), food photo → AI estimate.
- **Food library**: 98 hand-written recipes, 11 cuisines (Moroccan first), calculated macros, servings scaling, healthier/cheaper ingredient swaps, approximate Moroccan prices, favorites, diet/allergy filters, AI meal & day planner.
- **Training**: 50 exercises (home / gym / bands / dumbbells / cardio), animated original figures, plan generator (2–6 days), set logging, rest timer, PRs, **adaptive progression** (2 good sessions → step up; 2 hard → step back; poor recovery → hold; deload every 5th week).
- **RPG**: XP (once per event, enforced by a DB unique key), levels, ranks E→S, 5 attributes, daily quests that complete from real logs, weekly challenges, achievements, streaks, level-up animation. No rewards for eating less or over-training.
- **Progress**: weight curve, measurements, private progress photos, weekly AI evaluation with a safe target review (needs ≥ 3 weeks of data, never from one day).

## Develop
```
npm install
npm test          # unit + engine tests (in-memory DB)
npm run build
VITE_FAKE_DB=1 npm run dev   # UI with an in-memory database (no Supabase needed)
AGENT_LIVE=1 GROQ_API_KEY=... npx vitest run e2e/agent.live.test.ts   # live AI agent test
```
