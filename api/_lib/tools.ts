// THE SYSTEM's tools. Each one runs a real database operation through the shared engine (as the user, RLS applies)
// and returns what the database actually returned. Action cards shown in the chat are built ONLY from these results.
import type { SupabaseClient } from '@supabase/supabase-js';
import * as E from '../../src/core/engine.js';
import { mealIdeas, planDay, CUISINES } from '../../src/core/meals.js';
import { EXERCISES, getEx, exName, fmtDose } from '../../src/data/exercises.js';
import { RECIPES } from '../../src/data/recipes.js';
import { rankFromLevel } from '../../src/lib/rpg.js';
import { addDays } from '../../src/lib/nutrition.js';

export interface Ctx { sb: SupabaseClient; uid: string; date: string }
export interface Card { ok: boolean; title: string; lines: string[] }
export interface ToolOut { result: unknown; card?: Card; mutated?: boolean }

const EX_IDS = EXERCISES.map(e => e.id);
const MEAL = { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] };
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: 'function' as const, function: { name, description, parameters: { type: 'object', properties, required } } });

export const TOOLS = [
  fn('get_day_summary', 'Day totals, remaining kcal/protein, food entries (ids), water, quests, workout.', { date: { type: 'string' } }),
  fn('search_foods', 'Find food_id / recipe_id in the verified database before log_food.', { query: { type: 'string', description: 'English name, e.g. egg, sardine, bread' } }, ['query']),
  fn('log_food', 'Save what the user ATE (call it directly, no search needed). Item = lookup (generic English food name, e.g. "egg", "white bread", "sardines canned oil") + grams → exact values from the database; OR recipe_id+servings; OR name + estimated kcal/protein/carbs/fat (stored as estimate) for dishes not in the database. Always also give kcal estimates as a fallback. Split dishes into parts (bread, filling, oil). grams = TOTAL for all pieces (1 egg ≈ 50 g, so 2 eggs = 100 g; ½ baguette ≈ 125 g).', {
    meal: MEAL, date: { type: 'string' },
    items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, lookup: { type: 'string' }, food_id: { type: 'string' }, grams: { type: 'number' }, recipe_id: { type: 'string' }, servings: { type: 'number' },
      kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' } } } } }, ['meal', 'items']),
  fn('delete_food_log', 'Delete a diary entry by id.', { id: { type: 'string' } }, ['id']),
  fn('log_water', 'Record water drunk.', { ml: { type: 'number' } }, ['ml']),
  fn('suggest_meals', 'Recipe ideas from the library fitting remaining kcal, diet, allergies. mode=day plans the rest of today.', {
    mode: { type: 'string', enum: ['ideas', 'day'] }, meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'any'] }, count: { type: 'integer' },
    max_kcal: { type: 'number' }, high_protein: { type: 'boolean' }, quick: { type: 'boolean' }, cuisine: { type: 'string', enum: [...CUISINES] } }),
  fn('get_training_plan', 'Weekly plan + today’s exercises with current dose.', {}),
  fn('log_exercise', `Record sets the user DID, one item per set. Cardio: seconds (+distance_km). exercise_id one of: ${EX_IDS.join(',')}`, {
    sets: { type: 'array', items: { type: 'object', required: ['exercise_id'], properties: { exercise_id: { type: 'string' }, reps: { type: 'integer' }, seconds: { type: 'integer' }, load_kg: { type: 'number' }, distance_km: { type: 'number' } } } } }, ['sets']),
  fn('complete_workout', 'Finish today’s workout after its sets are logged (adaptive progression + XP). rpe 1-10.', { rpe: { type: 'integer' }, minutes: { type: 'integer' } }, ['rpe']),
  fn('adjust_difficulty', 'One step easier/harder for an exercise (too hard, pain, too easy).', { exercise_id: { type: 'string' }, direction: { type: 'string', enum: ['easier', 'harder'] } }, ['exercise_id', 'direction']),
  fn('update_training_preferences', 'Change days/week, minutes, place, equipment or level; rebuilds the plan.', {
    training_days: { type: 'integer' }, session_minutes: { type: 'integer' }, location: { type: 'string', enum: ['home', 'gym', 'outdoor'] },
    equipment: { type: 'array', items: { type: 'string', enum: ['dumbbells', 'bands', 'pullup_bar', 'kettlebell', 'bench', 'rope', 'barbell', 'machine'] } },
    experience: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] } }),
  fn('create_quest', 'Add a custom quest for today (max 3, 5-30 XP). Never about eating less or exhaustion.', { title: { type: 'string' }, xp: { type: 'integer' } }, ['title']),
  fn('complete_quest', 'Mark a CUSTOM quest done (others complete automatically from logs).', { quest_id: { type: 'string' } }, ['quest_id']),
  fn('log_weight', 'Record body weight (kg).', { kg: { type: 'number' }, date: { type: 'string' } }, ['kg']),
  fn('save_checkin', 'Evening evaluation, scales 1-5.', { energy: { type: 'integer' }, soreness: { type: 'integer' }, mood: { type: 'integer' }, sleep_hours: { type: 'number' }, note: { type: 'string' } }),
  fn('get_progress', 'Weight trend, average kcal/protein, workouts for last N days.', { days: { type: 'integer' } }),
  fn('remember', 'Save a lasting fact about the user (preference, injury, schedule).', { fact: { type: 'string' } }, ['fact']),
];

const n0 = (v: unknown) => Math.round(Number(v ?? 0));
/** Fresh totals after a change, so THE SYSTEM never quotes stale numbers. */
async function fresh(c: Ctx) {
  const [t, d] = await Promise.all([E.getTarget(c.sb, c.uid, c.date), E.loadDay(c.sb, c.uid, c.date)]);
  return { eaten_kcal: d.totals.kcal, eaten_protein: d.totals.protein, remaining_kcal: t?.kcal ? Math.round(t.kcal - d.totals.kcal) : null, remaining_protein: t?.protein ? Math.round(t.protein - d.totals.protein) : null, water_ml: d.waterMl };
}
const okCard = (title: string, lines: string[]): Card => ({ ok: true, title, lines });

export async function summary(c: Ctx, date = c.date) {
  const profile = await E.getProfile(c.sb, c.uid);
  const [target, day, quests, stats, w] = await Promise.all([E.getTarget(c.sb, c.uid, date), E.loadDay(c.sb, c.uid, date), E.ensureQuests(c.sb, c.uid, date), E.getStats(c.sb, c.uid),
    profile ? E.todaysWorkout(c.sb, c.uid, date, profile) : Promise.resolve(null)]);
  return {
    date, targets: target && { kcal: target.kcal, protein: target.protein, carbs: target.carbs, fat: target.fat, water_ml: target.water_ml },
    eaten: day.totals, remaining: target?.kcal ? { kcal: Math.round(target.kcal - day.totals.kcal), protein: Math.round((target.protein ?? 0) - day.totals.protein) } : null,
    foods: day.foods.map(f => ({ id: f.id, meal: f.meal, name: f.name, kcal: n0(f.kcal), protein: n0(f.protein), estimate: f.estimate })),
    water_ml: day.waterMl, checkin: day.checkin,
    quests: quests.map(q => ({ id: q.id, title: q.title, kind: q.kind, progress: Number(q.progress), target: Number(q.target), unit: q.unit, status: q.status, xp: q.xp })),
    workout: w?.day ? { name: w.day.name, deload_week: w.deload, done: day.sessions.some(s => s.status === 'completed'), exercises: w.items.map(i => ({ exercise_id: i.exercise_id, name: getEx(i.exercise_id)?.name.en, dose: fmtDose(i.sets, i.reps, i.seconds, i.load_kg) })) } : 'rest day',
    hunter: { level: stats.level, rank: rankFromLevel(stats.level), xp: stats.xp },
  };
}

export async function runTool(name: string, a: any, c: Ctx): Promise<ToolOut> {
  const date = E.isIsoDate(a?.date) ? a.date : c.date;
  switch (name) {
    case 'get_day_summary': return { result: await summary(c, date) };
    case 'search_foods': {
      const q = String(a.query ?? '').toLowerCase();
      const custom = (await c.sb.from('sf_custom_foods').select('id,name,kcal,protein,carbs,fat,serving_g').eq('user_id', c.uid).ilike('name', `%${q}%`).limit(5)).data ?? [];
      const recipes = RECIPES.filter(r => [r.name.en, r.name.fr, r.name.ar].join(' ').toLowerCase().includes(q)).slice(0, 5).map(r => ({ recipe_id: r.id, name: r.name.en, serving: r.serving.en }));
      return { result: { foods: E.searchFoodDb(q), custom: custom.map(f => ({ food_id: `custom:${f.id}`, name: f.name, per100g: { kcal: f.kcal, protein: f.protein } })), recipes } };
    }
    case 'log_food': {
      const rows = await E.logFood(c.sb, c.uid, date, a.meal, a.items ?? []);
      return { mutated: true, result: { saved: rows.map(r => ({ id: r.id, name: r.name, kcal: n0(r.kcal), protein: n0(r.protein), estimate: r.estimate })), today_now: await fresh(c) },
        card: okCard(`FOOD LOGGED · ${String(a.meal).toUpperCase()}`, rows.map(r => `${r.name}${r.grams ? ` (${n0(r.grams)} g)` : r.servings ? ` (×${r.servings})` : ''} — ${n0(r.kcal)} kcal · ${n0(r.protein)} g protein${r.estimate ? ' (estimate)' : ''}`)) };
    }
    case 'delete_food_log': {
      const r = await E.deleteFood(c.sb, c.uid, String(a.id));
      return { mutated: true, result: { deleted: r.name, today_now: await fresh(c) }, card: okCard('FOOD ENTRY DELETED', [`${r.name} — ${n0(r.kcal)} kcal`]) };
    }
    case 'log_water': {
      await E.logWater(c.sb, c.uid, c.date, Number(a.ml));
      return { mutated: true, result: { saved_ml: n0(a.ml), today_now: await fresh(c) }, card: okCard('WATER RECORDED', [`+${n0(a.ml)} ml`]) };
    }
    case 'suggest_meals': {
      const p = await E.getProfile(c.sb, c.uid); const s = await summary(c);
      const prefs = { diet: p?.diet, allergies: p?.allergies, cuisines: p?.cuisines, budget: p?.budget };
      const rem = Math.max(150, s.remaining?.kcal ?? 600);
      if (a.mode === 'day') {
        const logged = new Set(s.foods.map(f => f.meal)); const left = (['breakfast', 'lunch', 'snack', 'dinner'] as const).filter(m => !logged.has(m));
        return { result: { remaining_kcal: rem, plan: planDay(rem, s.remaining?.protein ?? 0, left.length ? [...left] : ['snack'], prefs) } };
      }
      return { result: { remaining_kcal: s.remaining?.kcal ?? null, ideas: mealIdeas(a.meal ?? 'any', Math.min(Number(a.max_kcal ?? rem), rem + 100), prefs, { count: a.count ?? 10, highProtein: a.high_protein, quick: a.quick, cuisine: a.cuisine }) } };
    }
    case 'get_training_plan': {
      const p = await E.getProfile(c.sb, c.uid); if (!p) return { result: { error: 'no profile' } };
      const w = await E.todaysWorkout(c.sb, c.uid, c.date, p);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return { result: { plan: w.plan?.name, week: w.week, deload_week: w.deload, schedule: w.plan?.days.map(d => ({ day: days[d.dow], name: d.name, exercises: d.exercises })),
        today: w.day ? w.items.map(i => ({ exercise_id: i.exercise_id, name: getEx(i.exercise_id)?.name.en, sets: i.sets, reps: i.reps, seconds: i.seconds, load_kg: i.load_kg, last_change: i.last_change })) : 'rest day' } };
    }
    case 'log_exercise': {
      const open = (await c.sb.from('sf_workout_sessions').select('id').eq('user_id', c.uid).eq('date', c.date).eq('status', 'in_progress').limit(1)).data?.[0];
      const r = await E.logSets(c.sb, c.uid, c.date, a.sets ?? [], open?.id ?? null);
      const lines = r.saved.map(s => `${exName(getEx(s.exercise_id), 'en')} — ${s.reps ? `${s.reps} reps` : ''}${s.seconds ? `${s.seconds >= 120 ? Math.round(s.seconds / 60) + ' min' : s.seconds + ' s'}` : ''}${s.load_kg ? ` · ${s.load_kg} kg` : ''}`);
      for (const pr of r.prs) lines.push(`★ NEW RECORD: ${exName(getEx(pr.exercise_id), 'en')} ${pr.value} ${pr.metric.replace('_kg', ' kg')} (was ${pr.previous})`);
      return { mutated: true, result: { saved_sets: r.saved.length, records: r.prs }, card: okCard('EXERCISE RECORDED', lines) };
    }
    case 'complete_workout': {
      const p = await E.getProfile(c.sb, c.uid); if (!p) throw new E.DbError('Profile missing');
      let s = (await c.sb.from('sf_workout_sessions').select('*').eq('user_id', c.uid).eq('date', c.date).eq('status', 'in_progress').limit(1)).data?.[0];
      if (!s) {
        const loose = (await c.sb.from('sf_exercise_sets').select('id').eq('user_id', c.uid).eq('date', c.date).is('session_id', null)).data ?? [];
        if (!loose.length) throw new E.DbError('No sets logged today — log the exercises first');
        const w = await E.todaysWorkout(c.sb, c.uid, c.date, p);
        s = await E.startSession(c.sb, c.uid, c.date, w.day?.name ?? 'Free training', w.day?.dow ?? null);
        const up = await c.sb.from('sf_exercise_sets').update({ session_id: s.id }).in('id', loose.map(x => x.id)); if (up.error) throw new E.DbError(up.error.message);
      }
      const r = await E.finishSession(c.sb, c.uid, s.id, { rpe: a.rpe, minutes: a.minutes ?? null });
      return { mutated: true, result: { xp: r.xp, completion: Math.round(r.ratio * 100) + '%', adaptations: r.changes }, card: okCard(`DUNGEON CLEARED · ${s.name}`,
        [`Completion ${Math.round(r.ratio * 100)}% · RPE ${a.rpe} · ~${r.session.kcal} kcal`, `+${r.xp} XP`, ...r.changes.filter(x => x.change !== 'hold').map(x => `${exName(getEx(x.exercise_id), 'en')}: ${x.message}`)]) };
    }
    case 'adjust_difficulty': {
      const r = await E.adjustExercise(c.sb, c.uid, a.exercise_id, a.direction);
      const name = exName(getEx(a.exercise_id), 'en');
      return { mutated: true, result: r, card: okCard('DIFFICULTY ADJUSTED', [`${name}: ${r.message}`, `Now ${fmtDose(r.after.sets, r.after.reps, r.after.seconds, r.after.load_kg)}${r.swapTo ? ` → ${exName(getEx(r.swapTo), 'en')}` : ''}`]) };
    }
    case 'update_training_preferences': {
      const p = await E.getProfile(c.sb, c.uid); if (!p) throw new E.DbError('Profile missing');
      const { id, onboarded, ...rest } = p as any;
      const next = { ...rest, ...Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null)) };
      const r = await E.saveProfile(c.sb, c.uid, next, c.date, { regeneratePlan: true, reason: 'Training preferences changed' });
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return { mutated: true, result: { plan: r.plan?.name }, card: okCard('TRAINING PLAN REBUILT', [r.plan?.name ?? '', ...(r.plan?.days ?? []).map(d => `${days[d.dow]} · ${d.name} · ${d.exercises.length} exercises`)]) };
    }
    case 'create_quest': {
      const q = await E.createCustomQuest(c.sb, c.uid, c.date, { title: String(a.title), detail: a.detail, xp: a.xp, difficulty: a.difficulty }, 'ai');
      return { mutated: true, result: { id: q.id, xp: q.xp }, card: okCard('NEW QUEST ISSUED', [`${q.title} · +${q.xp} XP`]) };
    }
    case 'complete_quest': {
      const aw = await E.completeCustomQuest(c.sb, c.uid, String(a.quest_id));
      return { mutated: true, result: { xp: aw?.xp ?? 0 }, card: okCard('QUEST COMPLETE', [aw ? `+${aw.xp} XP` : 'Already rewarded']) };
    }
    case 'log_weight': {
      await E.logWeight(c.sb, c.uid, date, Number(a.kg));
      return { mutated: true, result: { saved: Number(a.kg) }, card: okCard('WEIGHT RECORDED', [`${Number(a.kg)} kg · ${date}`, 'Targets only change from the weekly trend, never from one weigh-in.']) };
    }
    case 'save_checkin': {
      await E.saveCheckin(c.sb, c.uid, c.date, { energy: a.energy ?? null, soreness: a.soreness ?? null, mood: a.mood ?? null, sleep_hours: a.sleep_hours ?? null, note: a.note ?? null });
      return { mutated: true, result: { saved: true }, card: okCard('EVALUATION SAVED', [[a.energy && `Energy ${a.energy}/5`, a.soreness && `Soreness ${a.soreness}/5`, a.mood && `Mood ${a.mood}/5`, a.sleep_hours && `Sleep ${a.sleep_hours} h`].filter(Boolean).join(' · ') || 'Check-in recorded']) };
    }
    case 'get_progress': {
      const days = Math.max(7, Math.min(90, Number(a.days ?? 30)));
      const h = await E.history(c.sb, c.uid, addDays(c.date, -days + 1), c.date);
      const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((x, y) => x + y, 0) / xs.length) : null);
      return { result: { weights: h.weights, avg_kcal: avg(h.nutrition.map(d => d.kcal)), avg_protein: avg(h.nutrition.map(d => d.protein)), days_logged: h.nutrition.length,
        workouts: h.sessions.filter(s => s.status === 'completed').length, sessions: h.sessions.slice(-10) } };
    }
    case 'remember': {
      const fact = String(a.fact ?? '').slice(0, 300);
      const r = await c.sb.from('sf_ai_memory').insert({ user_id: c.uid, fact }); if (r.error) throw new E.DbError(r.error.message);
      return { result: { saved: true } };
    }
    default: return { result: { error: `unknown tool ${name}` } };
  }
}
