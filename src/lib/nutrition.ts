// SHADOW FIT nutrition engine — pure, deterministic functions (unit-tested in nutrition.test.ts).
// Formulas:
//  * BMR: Mifflin-St Jeor (1990). Male: 10W + 6.25H − 5A + 5 ; Female: 10W + 6.25H − 5A − 161.
//    "Other / prefer not to say" uses the midpoint constant (−78).
//  * TDEE = BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725 / 1.9).
//  * Weight loss: moderate deficit = min(500 kcal, 20 % of TDEE), never below max(BMR, 1200 F / 1500 M / 1350 other).
//  * Muscle development: +10 % of TDEE, max +300 kcal.
//  * Fat 30 % of energy, protein g/kg by goal (capped at 35 % energy), carbohydrate = remainder.
//  * Fiber: 14 g per 1000 kcal (US Institute of Medicine adequate intake).
//  * Fluids: 35 ml/kg/day, clamped to 1.5–3.5 L, including all drinks.
//  * Added sugar guidance: WHO — under 10 % of energy (5 % optional stricter goal), 4 kcal/g.

export type Sex = 'female' | 'male' | 'other';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'healthy' | 'muscle';

export const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

export interface Nutrients {
  kcal: number | null; protein: number | null; carbs: number | null; fat: number | null;
  fiber: number | null; sugar: number | null; addedSugar: number | null; sodium?: number | null;
}
export const NUTRIENT_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'addedSugar'] as const;
export type NutrientKey = typeof NUTRIENT_KEYS[number];

export interface ProfileInput {
  age: number; sex: Sex; heightCm: number; weightKg: number; activity: Activity; goal: Goal;
  pregnant?: boolean; breastfeeding?: boolean; medicalSupervision?: boolean; eatingDisorderHistory?: boolean;
  sugarGuidancePct?: 5 | 10; customAddedSugarG?: number | null; waterGoalMl?: number | null;
}

export interface Targets {
  bmr: number | null; tdee: number | null; kcal: number | null;
  protein: number | null; carbs: number | null; fat: number | null; fiber: number | null;
  waterMl: number; addedSugarMaxG: number | null;
  effectiveGoal: Goal;
  restrictions: RestrictionReason[];
  deficit: number; // kcal removed from TDEE (0 if none)
  floorApplied: boolean;
  bmi: number;
}
export type RestrictionReason = 'minor' | 'pregnant' | 'breastfeeding' | 'medical' | 'eating_disorder' | 'underweight';

export function round(n: number, d = 0): number {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

export function bmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const c = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return round(base + c);
}

export function tdee(bmrValue: number, activity: Activity): number {
  return round(bmrValue * ACTIVITY_FACTORS[activity]);
}

export function calorieFloor(sex: Sex): number {
  return sex === 'male' ? 1500 : sex === 'female' ? 1200 : 1350;
}

export function restrictionsFor(p: ProfileInput): RestrictionReason[] {
  const r: RestrictionReason[] = [];
  if (p.age < 18) r.push('minor');
  if (p.pregnant) r.push('pregnant');
  if (p.breastfeeding) r.push('breastfeeding');
  if (p.medicalSupervision) r.push('medical');
  if (p.eatingDisorderHistory) r.push('eating_disorder');
  if (bmi(p.weightKg, p.heightCm) < 18.5) r.push('underweight');
  return r;
}

export function waterTarget(weightKg: number, override?: number | null): number {
  if (override && override >= 500 && override <= 5000) return Math.round(override);
  const ml = Math.min(3500, Math.max(1500, weightKg * 35));
  return Math.round(ml / 50) * 50;
}

export function computeTargets(p: ProfileInput): Targets {
  const restrictions = restrictionsFor(p);
  const b = bmi(p.weightKg, p.heightCm);
  const waterMl = waterTarget(p.weightKg, p.waterGoalMl);
  // Adult formulas are not valid for minors: no calorie target is produced.
  if (restrictions.includes('minor')) {
    return { bmr: null, tdee: null, kcal: null, protein: null, carbs: null, fat: null, fiber: null,
      waterMl, addedSugarMaxG: null, effectiveGoal: 'healthy', restrictions, deficit: 0, floorApplied: false, bmi: b };
  }
  const B = bmr(p.weightKg, p.heightCm, p.age, p.sex);
  const T = tdee(B, p.activity);
  let goal: Goal = p.goal;
  // No automatic deficit for anyone who needs individualised guidance.
  if (goal === 'lose' && restrictions.length > 0) goal = 'healthy';
  let kcal = T;
  let deficit = 0;
  let floorApplied = false;
  if (goal === 'lose') {
    deficit = Math.min(500, round(T * 0.2));
    kcal = T - deficit;
    const floor = Math.max(B, calorieFloor(p.sex));
    if (kcal < floor) { kcal = Math.min(T, floor); deficit = T - kcal; floorApplied = true; }
  } else if (goal === 'muscle') {
    kcal = T + Math.min(300, round(T * 0.1));
  }
  kcal = round(kcal);
  const gPerKg = goal === 'muscle' ? 1.6 : goal === 'lose' ? 1.2 : 1.0;
  let protein = round(p.weightKg * gPerKg);
  if (protein * 4 > kcal * 0.35) protein = round((kcal * 0.35) / 4);
  const fat = round((kcal * 0.3) / 9);
  const carbs = round((kcal - protein * 4 - fat * 9) / 4);
  const fiber = round((kcal / 1000) * 14);
  const pct = p.sugarGuidancePct ?? 10;
  const addedSugarMaxG = p.customAddedSugarG && p.customAddedSugarG > 0
    ? round(p.customAddedSugarG) : round((kcal * pct / 100) / 4);
  return { bmr: B, tdee: T, kcal, protein, carbs, fat, fiber, waterMl, addedSugarMaxG,
    effectiveGoal: goal, restrictions, deficit: round(deficit), floorApplied, bmi: b };
}

/** Scale per-100 g values to a quantity in grams. Unknown (null) values stay unknown. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const s = (v: number | null | undefined) => (v === null || v === undefined ? null : round(v * f, 1));
  return { kcal: per100g.kcal === null ? null : round((per100g.kcal ?? 0) * f), protein: s(per100g.protein),
    carbs: s(per100g.carbs), fat: s(per100g.fat), fiber: s(per100g.fiber), sugar: s(per100g.sugar),
    addedSugar: s(per100g.addedSugar), sodium: s(per100g.sodium) };
}

export interface SumResult { totals: Record<NutrientKey, number>; incomplete: Record<NutrientKey, boolean>; }

/** Sum nutrient rows. Unknown values are skipped and the total is flagged "incomplete" (shown as "≥"). */
export function sumNutrients(rows: Nutrients[]): SumResult {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, addedSugar: 0 } as Record<NutrientKey, number>;
  const incomplete = { kcal: false, protein: false, carbs: false, fat: false, fiber: false, sugar: false, addedSugar: false } as Record<NutrientKey, boolean>;
  for (const r of rows) for (const k of NUTRIENT_KEYS) {
    const v = r[k];
    if (v === null || v === undefined) incomplete[k] = true; else totals[k] += v;
  }
  for (const k of NUTRIENT_KEYS) totals[k] = k === 'kcal' ? round(totals[k]) : round(totals[k], 1);
  return { totals, incomplete };
}

/** Naturally occurring sugar = total − added, only when both are known. */
export function naturalSugar(total: number | null, added: number | null): number | null {
  if (total === null || added === null) return null;
  return round(Math.max(0, total - added), 1);
}

export interface RecipeIngredientRef { foodId: string; grams: number; consumed?: boolean }
export function recipeNutrition(ingredients: RecipeIngredientRef[], servings: number,
  lookup: (id: string) => Nutrients | undefined, portionFactor = 1): SumResult {
  const rows: Nutrients[] = [];
  for (const ing of ingredients) {
    if (ing.consumed === false) continue;
    const per = lookup(ing.foodId);
    if (!per) { rows.push({ kcal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, addedSugar: null }); continue; }
    rows.push(scaleNutrients(per, (ing.grams / servings) * portionFactor));
  }
  return sumNutrients(rows);
}

// ---------- date helpers (local time, ISO yyyy-mm-dd) ----------
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return isoDate(dt);
}
export function lastNDays(n: number, end = isoDate()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}
export function startOfWeek(iso: string): string { // Monday
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7;
  return addDays(iso, -dow);
}

// ---------- weight statistics ----------
export interface WeightPoint { date: string; weightKg: number }
export function weeklyAverages(points: WeightPoint[]): { week: string; avg: number; n: number }[] {
  const map = new Map<string, number[]>();
  for (const p of points) { const w = startOfWeek(p.date); map.set(w, [...(map.get(w) ?? []), p.weightKg]); }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([week, arr]) => ({ week, avg: round(arr.reduce((a, b) => a + b, 0) / arr.length, 1), n: arr.length }));
}
export function monthlyAverages(points: WeightPoint[]): { month: string; avg: number; n: number }[] {
  const map = new Map<string, number[]>();
  for (const p of points) { const m = p.date.slice(0, 7); map.set(m, [...(map.get(m) ?? []), p.weightKg]); }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([month, arr]) => ({ month, avg: round(arr.reduce((a, b) => a + b, 0) / arr.length, 1), n: arr.length }));
}
export function goalProgress(start: number, current: number, target: number): number | null {
  if (start === target) return current === target ? 100 : null;
  const pct = ((start - current) / (start - target)) * 100;
  return round(Math.max(0, Math.min(100, pct)));
}

// ---------- weekly report ----------
export interface DayRecord { date: string; kcal: number; protein: number; sugar: number; addedSugar: number; entries: number; }
export interface WeeklyReport {
  days: string[]; daysWithMeals: number;
  avgKcal: number | null; avgProtein: number | null; avgSugar: number | null; avgAddedSugar: number | null;
  totalWaterMl: number; avgWaterMl: number | null; daysWithWater: number;
  totalWalkMin: number; daysWithWalk: number;
  weightStart: number | null; weightEnd: number | null; weightChange: number | null;
  journalEntries: number;
}
export function weeklyReport(input: {
  days: string[]; diary: DayRecord[]; water: { date: string; ml: number }[]; walks: { date: string; minutes: number }[];
  weights: WeightPoint[]; journalDates: string[];
}): WeeklyReport {
  const inRange = (d: string) => input.days.includes(d);
  const logged = input.diary.filter(d => inRange(d.date) && d.entries > 0);
  const avg = (arr: number[]) => (arr.length ? round(arr.reduce((a, b) => a + b, 0) / arr.length, 1) : null);
  const waterByDay = new Map<string, number>();
  input.water.filter(w => inRange(w.date)).forEach(w => waterByDay.set(w.date, (waterByDay.get(w.date) ?? 0) + w.ml));
  const walkByDay = new Map<string, number>();
  input.walks.filter(w => inRange(w.date)).forEach(w => walkByDay.set(w.date, (walkByDay.get(w.date) ?? 0) + w.minutes));
  const ws = input.weights.filter(w => inRange(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  const totalWater = [...waterByDay.values()].reduce((a, b) => a + b, 0);
  const avgK = avg(logged.map(d => d.kcal));
  return {
    days: input.days, daysWithMeals: logged.length,
    avgKcal: avgK === null ? null : round(avgK), avgProtein: avg(logged.map(d => d.protein)),
    avgSugar: avg(logged.map(d => d.sugar)), avgAddedSugar: avg(logged.map(d => d.addedSugar)),
    totalWaterMl: totalWater, avgWaterMl: waterByDay.size ? round(totalWater / waterByDay.size) : null, daysWithWater: waterByDay.size,
    totalWalkMin: round([...walkByDay.values()].reduce((a, b) => a + b, 0)), daysWithWalk: walkByDay.size,
    weightStart: ws.length ? ws[0].weightKg : null, weightEnd: ws.length ? ws[ws.length - 1].weightKg : null,
    weightChange: ws.length >= 2 ? round(ws[ws.length - 1].weightKg - ws[0].weightKg, 1) : null,
    journalEntries: input.journalDates.filter(inRange).length,
  };
}

// ---------- shopping list aggregation ----------
export function aggregateIngredients(items: { foodId: string; grams: number }[]): { foodId: string; grams: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.foodId, (m.get(i.foodId) ?? 0) + i.grams);
  return [...m.entries()].map(([foodId, grams]) => ({ foodId, grams: round(grams) }));
}

/** Cost from user-entered price (MAD per kg). Returns null when no price is known — prices are never invented. */
export function costFor(grams: number, pricePerKg: number | null | undefined): number | null {
  if (pricePerKg === null || pricePerKg === undefined || isNaN(pricePerKg)) return null;
  return round((grams / 1000) * pricePerKg, 2);
}

// ---------- quiet hours ----------
export function inQuietHours(hhmm: string, start: string, end: string): boolean {
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const t = toMin(hhmm), s = toMin(start), e = toMin(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}
