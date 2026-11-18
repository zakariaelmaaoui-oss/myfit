# MyFit — Eat Better. Feel Better. Live Better.

A mobile-first nutrition and healthy-lifestyle web app (installable PWA) in **English, French, Arabic (RTL) and Moroccan Darija**.
MyFit contains **no artificial intelligence**: no chatbot, no image/food recognition, no generated advice, recipes, plans or reports. Everything comes from verified food data, standard formulas, stored recipes and content, and what the user enters.

## Features

| Area | What it does |
|---|---|
| Accounts | Register, log in, log out, password recovery (email), change password, onboarding wizard, editable profile |
| Calculator | BMR (Mifflin-St Jeor), TDEE, calorie target, protein/carbs/fat, fiber, fluids, added-sugar guidance. Moderate deficit only (≤ 500 kcal or 20 %, never below BMR / 1200 F / 1500 M). **No deficit** for under-18s, pregnancy, breastfeeding, medical supervision, eating-disorder history or BMI < 18.5 |
| Food database | 211 foods from **USDA FoodData Central SR Legacy**, each with its FDC ID. Unknown values are shown as "unknown", never guessed. Users can correct values (saved as their own food) |
| Diary | Breakfast, lunch, dinner, snacks, drinks. Add with grams or reference servings, edit, delete. Totals per meal and per day |
| My Fridge | Pick ingredients by hand (no camera), with quantities and expiry dates → matching stored recipes, with what's missing |
| Recipes | 50 stored recipes (36 Moroccan, plus variations): harira, bissara, zaalouk, taktouka, couscous, tagines, rfissa, msemen, baghrir, khobz, harcha… Nutrition is **calculated from the ingredient quantities**. Filters: lowest cost, high protein, low added sugar, vegetarian, Moroccan, quick, available ingredients, favourites |
| Meal planner | Day and week views, choose / replace / remove meals, adjust portions, totals, record a planned meal in the diary, build a shopping list |
| Shopping & budget | List by category, mark as bought, edit, remove. Budget in MAD. **No built-in prices**: costs use only prices the user enters |
| Sugar tracker | Total, added and natural sugar; weekly and monthly views; list of high-added-sugar products; education; WHO 10 % / 5 % / custom guidance; gentle alerts |
| Barcode | Open Food Facts lookup (optional), camera scanning where the browser supports BarcodeDetector, otherwise manual entry; marked "not verified" |
| Emotional wellness | Hunger check-in (physical / emotional / craving), private journal, craving journal with weekly patterns, breathing exercises, 3-minute guided stress exercise, relaxation, tips, coping ideas. Suggests professional support after repeated loss-of-control or distress entries |
| Water / walking | 150 / 250 / 500 ml + custom amounts, adjustable goal, history. Walking timer (keeps running across pages), manual minutes and steps, goal, history |
| Healthy drinks | 6 recipes with calculated values, and a clear note: no "detox" claims |
| Weight | Weight, waist and other measurements, private photos, weekly and monthly averages, goal progress, note on daily fluctuations, pause option |
| Reports | Weekly report from stored data only ("no data" when missing); nutrition and activity charts |
| Sleep / cycle | Optional, off by default, need consent |
| Notifications | Reminders (water, walking, meals, meal prep, habits, weekly report) at chosen times, quiet hours, inbox. Supportive over-target and added-sugar messages (can be turned off) |
| Privacy | Consent for sensitive data, JSON export, full account deletion (rows and photos) |

## Run locally

```bash
npm install
```

```bash
npm run dev
```

With no Supabase keys, the app runs in **device mode**: accounts (PBKDF2-hashed passwords) and data stay in that browser. This is good for trying it out, but it is not for production.

## Connect Supabase (production database)

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/migrations/20261118000000_init.sql`, then `supabase/seed.sql`. This creates the tables, Row Level Security, the private `progress-photos` bucket and the `delete_my_account()` function, and loads the foods and recipes.
3. Go to **Authentication → URL Configuration** and set the Site URL to your Vercel URL. Add `https://YOUR-DOMAIN/reset-password` to the Redirect URLs.
4. Go to **Project Settings → API** and copy the Project URL and the `anon` public key into the environment variables below.
5. Backups: Supabase makes daily backups on paid plans (Database → Backups). On the free plan, export regularly with `supabase db dump`.

## Deploy to Vercel (any account)

1. Push this folder to a GitHub repository owned by, or shared with, the Vercel account you want to use.
2. In **that** Vercel account: **Add New → Project → Import** the repository. Vercel detects Vite automatically (build `npm run build`, output `dist`). `vercel.json` already handles SPA routing and security headers.
3. Under **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENABLE_OPENFOODFACTS` = `true` (optional)
4. Deploy, then put the deployment URL into Supabase (step 3 above).

Using the CLI instead, logged in to the account you want:

```bash
npx vercel logout
```

```bash
npx vercel login
```

```bash
npx vercel --prod
```

## Tests

```bash
npm test
```
Unit tests: formulas, portions, safety rules, reports, the food and recipe data, and translation completeness.

```bash
npm run verify:db
```
Runs the migration and seed on a real PostgreSQL engine (PGlite) and checks that Row Level Security keeps users apart.

```bash
npm run build && npx vite preview --port 4173
```

```bash
node e2e/run.mjs
```
64 end-to-end checks on an iPhone-sized screen.

## Data sources
- USDA FoodData Central, SR Legacy (April 2018), public domain. Rebuild with `scripts/build_foods.py`, then regenerate the seed with `npm run seed`.
- Mifflin-St Jeor (1990); US Institute of Medicine fiber AI (14 g/1000 kcal); WHO guideline on sugars intake (2015).
- Open Food Facts (optional, community data, marked unverified).

## Limitations
- Reminders only fire while the app is open or running in the background. Push notifications when the app is fully closed would need a push server (Web Push + VAPID keys), which is not included.
- Automatic step counting (Apple Health / Google Fit) can't be accessed from a web app; steps are entered by hand.
- SR Legacy has no added-sugar values. Added sugar is 0 for single unprocessed foods and equal to total sugar for pure sweeteners and sugar-only drinks; otherwise it is "unknown".
- Some Moroccan ingredients have no USDA entry (preserved lemon, fenugreek, yeast, argan oil). Each affected recipe says how it handles this.
- Arabic UI is Modern Standard Arabic; Darija covers messages, education and exercises. The translations should be reviewed by a native speaker.
