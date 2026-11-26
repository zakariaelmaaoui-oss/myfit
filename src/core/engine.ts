// SHADOW FIT engine — every read/write of the hunter's data goes through here, from the UI AND from THE SYSTEM (AI tools).
// All calls run with the signed-in user's Supabase session, so Row Level Security applies. Functions throw on any DB error:
// nothing is reported as done unless the database confirmed it.
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeTargets, addDays, startOfWeek, round, scaleNutrients, type Activity, type Goal, type Sex } from '../lib/nutrition.js';
import { getFood, BASE_FOODS } from '../lib/foods.js';
import { recipeInfo } from '../lib/recipes.js';
import { getRecipe } from '../data/recipes.js';
import { getEx } from '../data/exercises.js';
import { levelFromXp, XP } from '../lib/rpg.js';
import { generatePlan, initialPrescription, evaluate, manualAdjust, planWeek, isDeloadWeek, todaysDose, sessionKcal, setSeconds,
  type PlanDay, type Prescription, type ProgressState, type Experience, type Location } from './training.js';
import { buildDailyQuests, questProgress, buildWeeklyChallenges, challengeProgress, ACHIEVEMENTS, dayCleared, streak as calcStreak,
  type DayData, type QuestRow } from './game.js';

export type SB = SupabaseClient;
export class DbError extends Error {}
function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new DbError(r.error.message);
  return r.data as T;
}

export interface Profile {
  id: string; name: string; age: number; sex: Sex; height_cm: number; weight_kg: number; start_weight_kg?: number | null; target_weight_kg?: number | null;
  goal: Goal; activity: Activity; experience: Experience; location: Location; equipment: string[]; training_days: number; session_minutes: number;
  limitations?: string | null; diet: string; allergies: string[]; budget: string; cuisines: string[]; language: string; title?: string | null; onboarded: boolean;
}
export interface Target { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; water_ml: number; bmr?: number | null; tdee?: number | null; effective_from: string; reason?: string | null }
export interface Plan { id: string; name: string; days: PlanDay[]; created_at: string }

// ---------------- profile, targets, plan ----------------
export async function getProfile(sb: SB, uid: string): Promise<Profile | null> {
  return must(await sb.from('sf_profiles').select('*').eq('id', uid).maybeSingle()) as Profile | null;
}
export async function getTarget(sb: SB, uid: string, date: string): Promise<Target | null> {
  const rows = must(await sb.from('sf_targets').select('*').eq('user_id', uid).lte('effective_from', date).order('effective_from', { ascending: false }).limit(1));
  return (rows as Target[])[0] ?? null;
}
export function targetsFor(p: Pick<Profile, 'age' | 'sex' | 'height_cm' | 'weight_kg' | 'activity' | 'goal'>) {
  const t = computeTargets({ age: p.age, sex: p.sex, heightCm: p.height_cm, weightKg: p.weight_kg, activity: p.activity, goal: p.goal });
  return { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, fiber: t.fiber, water_ml: t.waterMl, bmr: t.bmr, tdee: t.tdee, restrictions: t.restrictions, floorApplied: t.floorApplied, deficit: t.deficit };
}

export async function saveProfile(sb: SB, uid: string, p: Omit<Profile, 'id' | 'onboarded'>, date: string, opts: { regeneratePlan?: boolean; reason?: string } = {}) {
  const existing = await getProfile(sb, uid);
  const row = { ...p, id: uid, onboarded: true, start_weight_kg: existing?.start_weight_kg ?? p.weight_kg };
  const profile = must(await sb.from('sf_profiles').upsert(row).select().single()) as Profile;
  const t = targetsFor(profile);
  const { restrictions, floorApplied, deficit, ...trow } = t;
  must(await sb.from('sf_targets').upsert({ ...trow, user_id: uid, effective_from: date, reason: opts.reason ?? (existing ? 'Profile updated' : 'Awakening') }, { onConflict: 'user_id,effective_from' }));
  if (!existing) must(await sb.from('sf_weights').upsert({ user_id: uid, date, weight_kg: p.weight_kg }, { onConflict: 'user_id,date' }));
  let plan: Plan | null = null;
  if (!existing || opts.regeneratePlan) plan = await regeneratePlan(sb, uid, profile);
  // today's quests are rebuilt so they match the new plan/targets (progress is recomputed from real logs)
  if (!existing || opts.regeneratePlan) must(await sb.from('sf_quests').delete().eq('user_id', uid).eq('date', date).eq('source', 'system'));
  return { profile, targets: t, plan };
}

export async function regeneratePlan(sb: SB, uid: string, p: Profile): Promise<Plan> {
  const gen = generatePlan({ experience: p.experience, location: p.location, equipment: p.equipment, trainingDays: p.training_days, sessionMinutes: p.session_minutes, goal: p.goal, limitations: p.limitations });
  must(await sb.from('sf_training_plans').update({ active: false }).eq('user_id', uid).eq('active', true));
  const plan = must(await sb.from('sf_training_plans').insert({ user_id: uid, name: gen.name, days: gen.days, active: true }).select().single()) as Plan;
  const ids = [...new Set(gen.days.flatMap(d => d.exercises))];
  const rows = ids.map(id => ({ user_id: uid, ...initialPrescription(id, p.experience) }));
  if (rows.length) must(await sb.from('sf_exercise_progress').upsert(rows, { onConflict: 'user_id,exercise_id', ignoreDuplicates: true }));
  return plan;
}
export async function getPlan(sb: SB, uid: string): Promise<Plan | null> {
  return must(await sb.from('sf_training_plans').select('*').eq('user_id', uid).eq('active', true).maybeSingle()) as Plan | null;
}
export const dowOf = (date: string) => new Date(date + 'T12:00:00').getDay();
export const planDayFor = (plan: Plan | null, date: string) => plan?.days.find(d => d.dow === dowOf(date)) ?? null;

export async function getPrescriptions(sb: SB, uid: string, ids: string[], experience: Experience): Promise<Record<string, ProgressState>> {
  const out: Record<string, ProgressState> = {};
  if (!ids.length) return out;
  const rows = must(await sb.from('sf_exercise_progress').select('*').eq('user_id', uid).in('exercise_id', ids)) as ProgressState[];
  for (const r of rows) out[r.exercise_id] = { ...r, load_kg: r.load_kg === null ? null : Number(r.load_kg) };
  const missing = ids.filter(id => !out[id]);
  if (missing.length) {
    const add = missing.map(id => ({ user_id: uid, ...initialPrescription(id, experience) }));
    must(await sb.from('sf_exercise_progress').upsert(add, { onConflict: 'user_id,exercise_id', ignoreDuplicates: true }));
    for (const a of add) out[a.exercise_id] = { ...a, good_streak: 0, bad_streak: 0 };
  }
  return out;
}

/** Today's workout with the dose to do today (deload weeks are lighter). */
export async function todaysWorkout(sb: SB, uid: string, date: string, profile: Profile, plan?: Plan | null) {
  plan = plan === undefined ? await getPlan(sb, uid) : plan;
  const day = planDayFor(plan, date);
  if (!plan || !day) return { plan, day: null, week: plan ? planWeek(plan.created_at, date) : 1, deload: false, items: [] as (Prescription & { last_change?: string | null })[] };
  const week = planWeek(plan.created_at, date); const deload = isDeloadWeek(week);
  const pres = await getPrescriptions(sb, uid, day.exercises, profile.experience);
  return { plan, day, week, deload, items: day.exercises.map(id => ({ ...todaysDose(pres[id], deload), last_change: pres[id].last_change })) };
}

// ---------------- day data & quests ----------------
export async function loadDay(sb: SB, uid: string, date: string) {
  const [foods, water, sets, sessions, checkin] = await Promise.all([
    sb.from('sf_food_logs').select('*').eq('user_id', uid).eq('date', date).order('created_at'),
    sb.from('sf_water_logs').select('ml').eq('user_id', uid).eq('date', date),
    sb.from('sf_exercise_sets').select('*').eq('user_id', uid).eq('date', date).order('created_at'),
    sb.from('sf_workout_sessions').select('*').eq('user_id', uid).eq('date', date).order('started_at'),
    sb.from('sf_checkins').select('*').eq('user_id', uid).eq('date', date).maybeSingle(),
  ]);
  const f = must(foods) as any[]; const s = must(sets) as any[]; const ss = must(sessions) as any[];
  const waterMl = (must(water) as { ml: number }[]).reduce((a, r) => a + r.ml, 0);
  const sum = (k: string) => round(f.reduce((a, r) => a + Number(r[k] ?? 0), 0));
  return {
    foods: f, sets: s, sessions: ss, checkin: must(checkin) as any, waterMl,
    totals: { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber') },
    data: { foods: f.map(r => ({ meal: r.meal, kcal: Number(r.kcal), protein: r.protein === null ? null : Number(r.protein) })), waterMl,
      sets: s.map(r => ({ exercise_id: r.exercise_id, reps: r.reps, seconds: r.seconds })), sessionsCompleted: ss.filter(x => x.status === 'completed').length, checkin: !!must(checkin) } as DayData,
  };
}

export async function ensureQuests(sb: SB, uid: string, date: string, ctx?: { profile?: Profile | null; target?: Target | null; plan?: Plan | null }): Promise<QuestRow[]> {
  const existing = must(await sb.from('sf_quests').select('*').eq('user_id', uid).eq('date', date).order('created_at')) as QuestRow[];
  if (existing.some(q => q.source === 'system')) return existing;
  const profile = ctx?.profile ?? await getProfile(sb, uid); if (!profile) return existing;
  const target = ctx?.target ?? await getTarget(sb, uid, date);
  const w = await todaysWorkout(sb, uid, date, profile, ctx?.plan);
  const pres: Record<string, Prescription> = Object.fromEntries(w.items.map(i => [i.exercise_id, i]));
  const drafts = buildDailyQuests({ planDay: w.day, prescriptions: pres, proteinTarget: target?.protein ?? null, waterTarget: target?.water_ml ?? 2000,
    experience: profile.experience, sessionMinutes: profile.session_minutes, lang: profile.language });
  const rows = drafts.map(d => ({ ...d, meta: d.meta ?? {}, user_id: uid, date, source: 'system' }));
  must(await sb.from('sf_quests').upsert(rows, { onConflict: 'user_id,date,key', ignoreDuplicates: true }));
  return must(await sb.from('sf_quests').select('*').eq('user_id', uid).eq('date', date).order('created_at')) as QuestRow[];
}

// ---------------- XP ----------------
export interface Award { kind: string; label: string; xp: number }
/** Grants XP once per (kind, ref) — the database unique key makes double rewards impossible. Returns the award only if it is new. */
export async function award(sb: SB, uid: string, kind: string, ref: string, xp: number, attribute: string | null, label: string): Promise<Award | null> {
  const rows = must(await sb.from('sf_xp_events').upsert({ user_id: uid, kind, ref, xp, attribute, label }, { onConflict: 'user_id,kind,ref', ignoreDuplicates: true }).select()) as any[];
  return rows.length ? { kind, label, xp } : null;
}
export async function getStats(sb: SB, uid: string) {
  const r = must(await sb.from('sf_hunter_stats').select('*').eq('user_id', uid).maybeSingle()) as any;
  const xp = r?.xp ?? 0;
  return { xp, ...levelFromXp(xp), attrs: { strength: r?.strength_xp ?? 0, endurance: r?.endurance_xp ?? 0, discipline: r?.discipline_xp ?? 0, consistency: r?.consistency_xp ?? 0, fitness: r?.fitness_xp ?? 0 } };
}

export interface SyncResult { awards: Award[]; completed: string[]; achievements: string[]; streak: number; quests: QuestRow[] }
/** Recomputes every quest/challenge/achievement of the day from the real logs and pays the XP that became due. Idempotent. */
export async function syncDay(sb: SB, uid: string, date: string): Promise<SyncResult> {
  const profile = await getProfile(sb, uid);
  if (!profile) return { awards: [], completed: [], achievements: [], streak: 0, quests: [] };
  const target = await getTarget(sb, uid, date);
  const quests = await ensureQuests(sb, uid, date, { profile, target });
  const day = await loadDay(sb, uid, date);
  const awards: Award[] = []; const completed: string[] = [];
  const push = (a: Award | null) => { if (a) awards.push(a); };

  for (const q of quests) {
    if (q.status === 'skipped' || q.kind === 'custom') { if (q.status === 'done') push(await award(sb, uid, 'quest', q.id, q.xp, q.attribute, q.title)); continue; }
    const p = questProgress(q, day.data); if (p === null) continue;
    const done = p >= Number(q.target);
    if (p !== Number(q.progress) || (done && q.status !== 'done') || (!done && q.status === 'done')) {
      const patch = { progress: p, status: done ? 'done' : 'active', completed_at: done ? (q.completed_at ?? new Date().toISOString()) : null };
      must(await sb.from('sf_quests').update(patch).eq('id', q.id));
      if (done && q.status !== 'done') completed.push(q.title);
      Object.assign(q, patch);
    }
    if (done) push(await award(sb, uid, 'quest', q.id, q.xp, q.attribute, q.title));
  }
  for (const meal of new Set(day.data.foods.map(f => f.meal))) push(await award(sb, uid, 'meal', `${date}:${meal}`, XP.mealLogged, 'discipline', `Logged ${meal}`));

  // weekly challenges
  const ws = startOfWeek(date); const we = addDays(ws, 6);
  must(await sb.from('sf_challenges').upsert(buildWeeklyChallenges(profile.training_days, target?.protein ?? null).map(c => ({ ...c, user_id: uid, week_start: ws })), { onConflict: 'user_id,week_start,key', ignoreDuplicates: true }));
  const [chs, wf, wsets, wsess] = await Promise.all([
    sb.from('sf_challenges').select('*').eq('user_id', uid).eq('week_start', ws),
    sb.from('sf_food_logs').select('date,meal,protein').eq('user_id', uid).gte('date', ws).lte('date', we),
    sb.from('sf_exercise_sets').select('date,exercise_id,seconds').eq('user_id', uid).gte('date', ws).lte('date', we),
    sb.from('sf_workout_sessions').select('date,status').eq('user_id', uid).gte('date', ws).lte('date', we),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map(d => {
    const f = (must(wf) as any[]).filter(r => r.date === d);
    return { date: d, protein: f.reduce((a, r) => a + Number(r.protein ?? 0), 0), meals: new Set(f.map(r => r.meal)).size,
      sessions: (must(wsess) as any[]).filter(r => r.date === d && r.status === 'completed').length,
      cardioMin: (must(wsets) as any[]).filter(r => r.date === d && ['brisk_walk', 'running', 'cycling', 'stairs', 'jump_rope', 'shadow_boxing'].includes(r.exercise_id)).reduce((a, r) => a + (r.seconds ?? 0), 0) / 60 };
  });
  for (const c of must(chs) as any[]) {
    const p = challengeProgress(c.key, { days }, target?.protein ?? null);
    const done = p >= Number(c.target);
    if (p !== Number(c.progress) || (done && c.status !== 'done')) must(await sb.from('sf_challenges').update({ progress: p, status: done ? 'done' : 'active' }).eq('id', c.id));
    if (done) push(await award(sb, uid, 'challenge', c.id, c.xp, 'consistency', c.title));
  }

  // streak (last 60 days)
  const qs = must(await sb.from('sf_quests').select('date,status').eq('user_id', uid).gte('date', addDays(date, -60)).lte('date', date)) as { date: string; status: string }[];
  const byDate = new Map<string, { status: string }[]>(); for (const q of qs) byDate.set(q.date, [...(byDate.get(q.date) ?? []), q]);
  const cleared = new Map([...byDate.entries()].map(([d, v]) => [d, dayCleared(v)]));
  const streak = calcStreak(cleared, date, addDays);
  if (cleared.get(date) && streak > 0 && streak % 7 === 0) push(await award(sb, uid, 'streak', date, 50, 'consistency', `${streak}-day streak`));
  if (cleared.get(date)) push(await award(sb, uid, 'day', date, 10, 'consistency', 'Day cleared'));

  // achievements
  const achievements = await checkAchievements(sb, uid, streak);
  for (const a of achievements) push(a.award);
  return { awards, completed, achievements: achievements.map(a => a.name), streak, quests };
}

async function checkAchievements(sb: SB, uid: string, streak: number) {
  const have = new Set((must(await sb.from('sf_achievements').select('key').eq('user_id', uid)) as { key: string }[]).map(r => r.key));
  if (have.size === ACHIEVEMENTS.length) return [];
  const count = async (table: string, f?: (q: any) => any) => { let q = sb.from(table).select('*', { count: 'exact', head: true }).eq('user_id', uid); if (f) q = f(q); const r = await q; if (r.error) throw new DbError(r.error.message); return r.count ?? 0; };
  const [workouts, mealsLogged, weighIns, prs, push, stats, prot] = await Promise.all([
    count('sf_workout_sessions', q => q.eq('status', 'completed')), count('sf_food_logs'), count('sf_weights'), count('sf_personal_records', q => q.gte('times_beaten', 1)),
    sb.from('sf_exercise_sets').select('reps').eq('user_id', uid).in('exercise_id', ['pushup', 'knee_pushup', 'incline_pushup', 'diamond_pushup', 'pike_pushup']),
    getStats(sb, uid),
    sb.from('sf_quests').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('key', 'protein').eq('status', 'done'),
  ]);
  const totals = { workouts, mealsLogged, weighIns, prs, streak, level: stats.level, proteinDays: prot.count ?? 0,
    pushups: (must(push) as { reps: number | null }[]).reduce((a, r) => a + (r.reps ?? 0), 0) };
  const out: { name: string; award: Award | null }[] = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.key) || !a.test(totals)) continue;
    const ins = must(await sb.from('sf_achievements').upsert({ user_id: uid, key: a.key }, { onConflict: 'user_id,key', ignoreDuplicates: true }).select()) as any[];
    if (ins.length) out.push({ name: a.name, award: a.xp ? await award(sb, uid, 'achievement', a.key, a.xp, 'fitness', `Achievement: ${a.name}`) : null });
  }
  return out;
}

// ---------------- nutrition actions ----------------
export interface FoodItemInput {
  name?: string; lookup?: string | null; food_id?: string | null; recipe_id?: string | null; grams?: number | null; servings?: number | null;
  kcal?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; fiber?: number | null; estimate?: boolean; source?: string;
}
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
/** Nutrition is CALCULATED from the reference database whenever a food_id/recipe_id is known; otherwise it is stored as an estimate. */
export async function resolveFood(sb: SB, uid: string, it: FoodItemInput) {
  if (it.recipe_id) {
    const r = getRecipe(it.recipe_id); if (!r) throw new DbError(`Unknown recipe ${it.recipe_id}`);
    const s = Math.max(0.25, Math.min(10, Number(it.servings ?? 1))); const t = recipeInfo(r).perServing.totals;
    return { name: r.name.en, recipe_id: r.id, servings: s, kcal: round(t.kcal * s), protein: round(t.protein * s, 1), carbs: round(t.carbs * s, 1), fat: round(t.fat * s, 1), fiber: round(t.fiber * s, 1), source: 'recipe', estimate: false };
  }
  if (!it.food_id && it.lookup && it.grams) { // generic English name → best database match (exact/starts-with only, to avoid wrong matches)
    const hit = lookupFood(it.lookup);
    if (hit) it = { ...it, food_id: hit.id, name: it.name || hit.name.en };
    else if (it.kcal === null || it.kcal === undefined) throw new DbError(`"${it.lookup}" is not in the food database — send it again with estimated kcal/protein/carbs/fat`);
  }
  if (it.food_id && it.grams) {
    const g = Number(it.grams);
    if (it.food_id.startsWith('custom:')) {
      const c = must(await sb.from('sf_custom_foods').select('*').eq('id', it.food_id.slice(7)).eq('user_id', uid).single()) as any;
      const f = g / 100; return { name: it.name || c.name, food_id: it.food_id, grams: g, kcal: round(c.kcal * f), protein: round((c.protein ?? 0) * f, 1), carbs: round((c.carbs ?? 0) * f, 1), fat: round((c.fat ?? 0) * f, 1), fiber: round((c.fiber ?? 0) * f, 1), source: 'custom', estimate: false };
    }
    const food = getFood(it.food_id); if (!food) throw new DbError(`Unknown food ${it.food_id}`);
    const n = scaleNutrients(food.per100g, g);
    return { name: it.name || food.name.en, food_id: food.id, grams: g, kcal: n.kcal ?? 0, protein: n.protein, carbs: n.carbs, fat: n.fat, fiber: n.fiber, source: 'database', estimate: false };
  }
  if (it.kcal === null || it.kcal === undefined || !it.name) throw new DbError('A food needs either a database id with grams, or a name with estimated kcal');
  return { name: it.name, grams: it.grams ?? null, kcal: Math.round(Number(it.kcal)), protein: it.protein ?? null, carbs: it.carbs ?? null, fat: it.fat ?? null, fiber: it.fiber ?? null,
    source: it.source && ['manual', 'ai_estimate', 'photo_estimate'].includes(it.source) ? it.source : 'ai_estimate', estimate: it.estimate ?? true };
}
export async function logFood(sb: SB, uid: string, date: string, meal: string, items: FoodItemInput[]) {
  if (!MEALS.includes(meal)) throw new DbError(`meal must be one of ${MEALS.join(', ')}`);
  const rows = [] as any[];
  for (const it of items.slice(0, 12)) rows.push({ ...(await resolveFood(sb, uid, it)), user_id: uid, date, meal });
  return must(await sb.from('sf_food_logs').insert(rows).select()) as any[];
}
export async function deleteFood(sb: SB, uid: string, id: string) {
  const r = must(await sb.from('sf_food_logs').delete().eq('id', id).eq('user_id', uid).select()) as any[];
  if (!r.length) throw new DbError('Food entry not found');
  return r[0];
}
export async function logWater(sb: SB, uid: string, date: string, ml: number) {
  return must(await sb.from('sf_water_logs').insert({ user_id: uid, date, ml: Math.round(ml) }).select().single());
}
const norm = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const sing = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
export function lookupFood(q: string) {
  const n = norm(q); if (!n) return null; const words = n.split(' ').map(sing);
  let best: { f: (typeof BASE_FOODS)[number]; s: number } | null = null;
  for (const f of BASE_FOODS) {
    const name = norm(f.name.en); const nw = name.split(' ').map(sing);
    let s = 0;
    if (name === n || nw.join(' ') === words.join(' ')) s = 100;
    else if (f.id === words.join('_') || f.id === [...words].reverse().join('_')) s = 90;
    else if (words.every(w => nw.includes(w))) s = 60 - nw.length; // all query words present, shorter names first
    else continue;
    if (/\braw\b/.test(name) && !/raw/.test(n) && f.category !== 'eggs' && f.category !== 'vegetables' && f.category !== 'fruits') s -= 5; // cooked foods are eaten more often
    if (!best || s > best.s) best = { f, s };
  }
  return best?.f ?? null;
}
export function searchFoodDb(q: string, limit = 8) {
  const n = q.toLowerCase().trim(); if (!n) return [];
  const terms = n.split(/\s+/);
  return BASE_FOODS.filter(f => { const hay = [f.name.en, f.name.fr, f.name.ar, f.usdaDescription ?? ''].join(' ').toLowerCase(); return terms.every(t => hay.includes(t)); })
    .slice(0, limit).map(f => ({ food_id: f.id, name: f.name.en, per100g: { kcal: f.per100g.kcal, protein: f.per100g.protein, carbs: f.per100g.carbs, fat: f.per100g.fat }, portions: f.portions.slice(0, 3) }));
}

// ---------------- training actions ----------------
export async function startSession(sb: SB, uid: string, date: string, name: string, dow: number | null) {
  const open = must(await sb.from('sf_workout_sessions').select('*').eq('user_id', uid).eq('date', date).eq('status', 'in_progress').limit(1)) as any[];
  if (open[0]) return open[0];
  return must(await sb.from('sf_workout_sessions').insert({ user_id: uid, date, name, plan_dow: dow }).select().single()) as any;
}
export interface SetInput { exercise_id: string; reps?: number | null; seconds?: number | null; load_kg?: number | null; distance_km?: number | null; rpe?: number | null; set_no?: number }
export async function logSets(sb: SB, uid: string, date: string, sets: SetInput[], sessionId: string | null = null) {
  for (const s of sets) if (!getEx(s.exercise_id)) throw new DbError(`Unknown exercise ${s.exercise_id}`);
  const rows = sets.slice(0, 30).map((s, i) => ({ user_id: uid, date, session_id: sessionId, exercise_id: s.exercise_id, set_no: s.set_no ?? i + 1,
    reps: s.reps ?? null, seconds: s.seconds ?? null, load_kg: s.load_kg ?? null, distance_km: s.distance_km ?? null, rpe: s.rpe ?? null }));
  const saved = must(await sb.from('sf_exercise_sets').insert(rows).select()) as any[];
  const prs = await updatePRs(sb, uid, date, saved);
  return { saved, prs };
}
export async function deleteSet(sb: SB, uid: string, id: string) { must(await sb.from('sf_exercise_sets').delete().eq('id', id).eq('user_id', uid)); }

async function updatePRs(sb: SB, uid: string, date: string, sets: any[]) {
  const best = new Map<string, number>();
  for (const s of sets) for (const m of ['reps', 'load_kg', 'seconds', 'distance_km'] as const) {
    const v = Number(s[m] ?? 0); if (v > 0) { const k = `${s.exercise_id}|${m}`; best.set(k, Math.max(best.get(k) ?? 0, v)); }
  }
  if (!best.size) return [];
  const ids = [...new Set(sets.map(s => s.exercise_id))];
  const cur = must(await sb.from('sf_personal_records').select('*').eq('user_id', uid).in('exercise_id', ids)) as any[];
  const curMap = new Map(cur.map(r => [`${r.exercise_id}|${r.metric}`, Number(r.value)])); const beaten = new Map(cur.map(r => [`${r.exercise_id}|${r.metric}`, Number(r.times_beaten ?? 0)]));
  const out: { exercise_id: string; metric: string; value: number; previous: number | null }[] = [];
  for (const [k, v] of best) {
    const prev = curMap.get(k);
    if (prev === undefined || v > prev) {
      const [exercise_id, metric] = k.split('|');
      must(await sb.from('sf_personal_records').upsert({ user_id: uid, exercise_id, metric, value: v, achieved_on: date, times_beaten: prev === undefined ? 0 : (beaten.get(k) ?? 0) + 1 }, { onConflict: 'user_id,exercise_id,metric' }));
      if (prev !== undefined) out.push({ exercise_id, metric, value: v, previous: prev }); // the very first value is a baseline, not a "record"
    }
  }
  return out;
}

/** Finish a workout: score completion, run the adaptive progression per exercise, pay XP. */
export async function finishSession(sb: SB, uid: string, sessionId: string, opts: { rpe: number | null; minutes?: number | null; notes?: string | null }) {
  const s = must(await sb.from('sf_workout_sessions').select('*').eq('id', sessionId).eq('user_id', uid).single()) as any;
  if (s.status === 'completed') throw new DbError('This session is already completed');
  const profile = await getProfile(sb, uid); if (!profile) throw new DbError('Profile missing');
  const sets = must(await sb.from('sf_exercise_sets').select('*').eq('session_id', sessionId)) as any[];
  if (!sets.length) throw new DbError('Log at least one set before finishing the workout');
  const w = await todaysWorkout(sb, uid, s.date, profile);
  const ids = [...new Set([...(w.day?.exercises ?? []), ...sets.map(x => x.exercise_id)])];
  const pres = await getPrescriptions(sb, uid, ids, profile.experience);
  const checkin = must(await sb.from('sf_checkins').select('energy,soreness').eq('user_id', uid).eq('date', s.date).maybeSingle()) as any;
  const prevCheck = checkin ?? must(await sb.from('sf_checkins').select('energy,soreness').eq('user_id', uid).eq('date', addDays(s.date, -1)).maybeSingle()) as any;
  const recoveryPoor = !!prevCheck && ((prevCheck.soreness ?? 0) >= 4 || (prevCheck.energy ?? 5) <= 2);
  const planned = w.day?.exercises ?? [];
  let plannedVol = 0, doneVol = 0; const changes: { exercise_id: string; change: string; message: string }[] = [];
  const now = new Date().toISOString();
  for (const id of ids) {
    const p = pres[id]; const mine = sets.filter(x => x.exercise_id === id); const dose = todaysDose(p, w.deload);
    const unit = (x: any) => (dose.seconds && !dose.reps ? x.seconds : x.reps) ?? 0;
    if (planned.includes(id)) { plannedVol += ((dose.seconds && !dose.reps ? dose.seconds : dose.reps) ?? 0) * dose.sets; doneVol += Math.min(mine.reduce((a, x) => a + unit(x), 0), ((dose.seconds && !dose.reps ? dose.seconds : dose.reps) ?? 0) * dose.sets); }
    if (!mine.length) continue;
    const ev = evaluate({ ...p, sets: dose.sets }, mine, opts.rpe, { now, recoveryPoor, deload: w.deload });
    const usedLoad = Math.max(0, ...mine.map(x => Number(x.load_kg ?? 0)));
    const next = w.deload ? { ...ev.state, sets: p.sets, load_kg: p.load_kg } : { ...ev.state }; // deload never rewrites the real prescription
    if (p.load_kg === 0 && usedLoad > 0) next.load_kg = usedLoad; // first time: remember the weight the hunter chose
    const { exercise_id, sets: ns, reps, seconds, load_kg, good_streak, bad_streak, last_change, last_change_at } = next;
    must(await sb.from('sf_exercise_progress').upsert({ user_id: uid, exercise_id, sets: ns, reps, seconds, load_kg, good_streak, bad_streak, last_change, last_change_at }, { onConflict: 'user_id,exercise_id' }));
    if (ev.change === 'swap' && ev.swapTo && w.plan) {
      const days = w.plan.days.map(d => ({ ...d, exercises: d.exercises.map(x => (x === id ? ev.swapTo! : x)) }));
      must(await sb.from('sf_training_plans').update({ days }).eq('id', w.plan.id));
      await getPrescriptions(sb, uid, [ev.swapTo], profile.experience);
    }
    changes.push({ exercise_id: id, change: ev.change, message: ev.message });
  }
  const ratio = plannedVol > 0 ? Math.min(1, doneVol / plannedVol) : 1;
  const minutes = opts.minutes ?? Math.max(1, Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000));
  const kcal = sessionKcal(sets.map(x => ({ exercise_id: x.exercise_id, seconds: setSeconds(x) + 30 })), profile.weight_kg);
  must(await sb.from('sf_workout_sessions').update({ status: 'completed', finished_at: now, rpe: opts.rpe, minutes: Math.min(600, minutes), completed_ratio: round(ratio, 2), kcal, notes: opts.notes ?? null }).eq('id', sessionId));
  const doneToday = must(await sb.from('sf_workout_sessions').select('id').eq('user_id', uid).eq('date', s.date).eq('status', 'completed')) as any[];
  const xp = doneToday.length <= 2 ? XP.workout(Math.min(minutes, 90), ratio) : 0; // no extra reward for over-training
  const focus = w.day?.focus ?? 'full';
  const a = xp > 0 ? await award(sb, uid, 'workout', sessionId, xp, focus === 'cardio' ? 'endurance' : 'strength', `Dungeon cleared: ${s.name}`) : null;
  return { session: { ...s, status: 'completed', minutes, completed_ratio: ratio, kcal }, xp: a?.xp ?? 0, changes, ratio };
}

// ---------------- body & check-ins ----------------
export async function logWeight(sb: SB, uid: string, date: string, kg: number) {
  const row = must(await sb.from('sf_weights').upsert({ user_id: uid, date, weight_kg: kg }, { onConflict: 'user_id,date' }).select().single());
  const latest = must(await sb.from('sf_weights').select('date').eq('user_id', uid).order('date', { ascending: false }).limit(1)) as any[];
  if (latest[0]?.date === date) must(await sb.from('sf_profiles').update({ weight_kg: kg }).eq('id', uid)); // targets are NOT changed here — only by the weekly review
  return row;
}
export async function saveCheckin(sb: SB, uid: string, date: string, c: { energy?: number | null; soreness?: number | null; mood?: number | null; sleep_hours?: number | null; note?: string | null }) {
  return must(await sb.from('sf_checkins').upsert({ user_id: uid, date, ...c }, { onConflict: 'user_id,date' }).select().single());
}

// ---------------- quests ----------------
export async function createCustomQuest(sb: SB, uid: string, date: string, q: { title: string; detail?: string; xp?: number; difficulty?: string }, source: 'ai' | 'user') {
  const mine = must(await sb.from('sf_quests').select('id').eq('user_id', uid).eq('date', date).eq('kind', 'custom')) as any[];
  if (mine.length >= 3) throw new DbError('Maximum 3 custom quests per day');
  const xp = Math.max(5, Math.min(30, Math.round(q.xp ?? 15)));
  return must(await sb.from('sf_quests').insert({ user_id: uid, date, key: `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, kind: 'custom', title: q.title.slice(0, 80), detail: q.detail?.slice(0, 120) ?? null,
    target: 1, xp, difficulty: ['E', 'D', 'C', 'B'].includes(q.difficulty ?? '') ? q.difficulty : 'D', attribute: 'discipline', source }).select().single()) as any;
}
/** Only custom quests can be ticked by hand; the others complete themselves from real logged data. */
export async function completeCustomQuest(sb: SB, uid: string, id: string) {
  const q = must(await sb.from('sf_quests').select('*').eq('id', id).eq('user_id', uid).single()) as any;
  if (q.kind !== 'custom') throw new DbError('This quest completes automatically from your logs');
  must(await sb.from('sf_quests').update({ status: 'done', progress: 1, completed_at: new Date().toISOString() }).eq('id', id));
  return await award(sb, uid, 'quest', id, q.xp, q.attribute, q.title);
}

// ---------------- history ----------------
export async function history(sb: SB, uid: string, from: string, to: string) {
  const [w, f, s, ss] = await Promise.all([
    sb.from('sf_weights').select('date,weight_kg').eq('user_id', uid).gte('date', from).lte('date', to).order('date'),
    sb.from('sf_food_logs').select('date,kcal,protein').eq('user_id', uid).gte('date', from).lte('date', to),
    sb.from('sf_exercise_sets').select('date,exercise_id,reps,seconds,load_kg').eq('user_id', uid).gte('date', from).lte('date', to),
    sb.from('sf_workout_sessions').select('date,name,status,minutes,rpe,completed_ratio,kcal').eq('user_id', uid).gte('date', from).lte('date', to),
  ]);
  const foods = must(f) as any[]; const byDay = new Map<string, { kcal: number; protein: number }>();
  for (const r of foods) { const d = byDay.get(r.date) ?? { kcal: 0, protein: 0 }; d.kcal += Number(r.kcal); d.protein += Number(r.protein ?? 0); byDay.set(r.date, d); }
  return { weights: (must(w) as any[]).map(r => ({ date: r.date, kg: Number(r.weight_kg) })), nutrition: [...byDay.entries()].sort().map(([date, v]) => ({ date, kcal: Math.round(v.kcal), protein: Math.round(v.protein) })),
    sets: must(s) as any[], sessions: must(ss) as any[] };
}

export async function adjustExercise(sb: SB, uid: string, exerciseId: string, direction: 'easier' | 'harder') {
  const profile = await getProfile(sb, uid); if (!profile) throw new DbError('Profile missing');
  const cur = (await getPrescriptions(sb, uid, [exerciseId], profile.experience))[exerciseId];
  const r = manualAdjust(cur, direction, new Date().toISOString());
  const { exercise_id, sets, reps, seconds, load_kg, good_streak, bad_streak, last_change, last_change_at } = r.state;
  must(await sb.from('sf_exercise_progress').upsert({ user_id: uid, exercise_id, sets, reps, seconds, load_kg, good_streak, bad_streak, last_change, last_change_at }, { onConflict: 'user_id,exercise_id' }));
  if (r.swapTo) {
    const plan = await getPlan(sb, uid);
    if (plan) must(await sb.from('sf_training_plans').update({ days: plan.days.map(d => ({ ...d, exercises: d.exercises.map(x => (x === exerciseId ? r.swapTo! : x)) })) }).eq('id', plan.id));
    await getPrescriptions(sb, uid, [r.swapTo], profile.experience);
  }
  return { before: cur, after: r.state, message: r.message, swapTo: r.swapTo ?? null };
}
export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// ---------------- weekly evaluation ----------------
export async function weeklyStats(sb: SB, uid: string, weekStart: string) {
  const we = addDays(weekStart, 6);
  const profile = await getProfile(sb, uid); const target = await getTarget(sb, uid, we);
  const [h, quests, xp, wAll] = await Promise.all([
    history(sb, uid, weekStart, we),
    sb.from('sf_quests').select('status').eq('user_id', uid).gte('date', weekStart).lte('date', we),
    sb.from('sf_xp_events').select('xp').eq('user_id', uid).gte('created_at', weekStart + 'T00:00:00').lte('created_at', we + 'T23:59:59'),
    sb.from('sf_weights').select('date,weight_kg').eq('user_id', uid).gte('date', addDays(weekStart, -28)).lte('date', we).order('date'),
  ]);
  const q = must(quests) as { status: string }[];
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const wk = h.weights.map(w => w.kg);
  return {
    week_start: weekStart, days_logged: h.nutrition.length, avg_kcal: avg(h.nutrition.map(d => d.kcal)), avg_protein: avg(h.nutrition.map(d => d.protein)),
    target_kcal: target?.kcal ?? null, target_protein: target?.protein ?? null,
    protein_days: target?.protein ? h.nutrition.filter(d => d.protein >= target.protein!).length : 0,
    workouts_done: h.sessions.filter(s => s.status === 'completed').length, workouts_planned: profile?.training_days ?? 0,
    avg_rpe: avg(h.sessions.filter(s => s.rpe).map(s => s.rpe)),
    quests_done: q.filter(x => x.status === 'done').length, quests_total: q.length,
    xp: (must(xp) as { xp: number }[]).reduce((a, r) => a + r.xp, 0),
    weight_start: wk[0] ?? null, weight_end: wk.length ? wk[wk.length - 1] : null,
    weights_28d: (must(wAll) as any[]).map(r => ({ date: r.date, kg: Number(r.weight_kg) })),
  };
}
/** Applies a reviewed change (from the weekly evaluation, accepted by the hunter). */
export async function applyTargetChange(sb: SB, uid: string, date: string, deltaKcal: number, reason: string) {
  const cur = await getTarget(sb, uid, date); const profile = await getProfile(sb, uid);
  if (!cur?.kcal || !profile) throw new DbError('No current target');
  const floor = Math.max(cur.bmr ?? 0, profile.sex === 'male' ? 1500 : profile.sex === 'female' ? 1200 : 1350);
  const kcal = Math.max(floor, Math.round(cur.kcal + Math.max(-150, Math.min(150, deltaKcal))));
  const fat = Math.round((kcal * 0.3) / 9); const protein = cur.protein ?? Math.round(profile.weight_kg * 1.2);
  const row = { user_id: uid, effective_from: date, kcal, protein, fat, carbs: Math.round((kcal - protein * 4 - fat * 9) / 4), fiber: Math.round(kcal / 1000 * 14), water_ml: cur.water_ml, bmr: cur.bmr, tdee: cur.tdee, reason };
  return must(await sb.from('sf_targets').upsert(row, { onConflict: 'user_id,effective_from' }).select().single());
}
