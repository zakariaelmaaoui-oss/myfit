// Training engine: plan generation and adaptive progression. Pure functions (unit-tested in training.test.ts).
import { EXERCISES, getEx, available, type Exercise, type Group } from '../data/exercises.js';

export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Location = 'home' | 'gym' | 'outdoor';
export interface PlanInput { experience: Experience; location: Location; equipment: string[]; trainingDays: number; sessionMinutes: number; goal: string; limitations?: string | null }
export interface PlanDay { dow: number; focus: string; name: string; exercises: string[] }
export interface Prescription { exercise_id: string; sets: number; reps: number | null; seconds: number | null; load_kg: number | null }

const LV: Record<Experience, 0 | 1 | 2> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Days of week (0 = Sunday … 6 = Saturday) spread evenly, never more than 2 hard days in a row for beginners. */
export const TRAINING_DOWS: Record<number, number[]> = {
  2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
};
const SPLITS: Record<number, { focus: string; name: string; groups: Group[] }[]> = {
  2: [{ focus: 'full', name: 'FULL BODY · A', groups: ['legs', 'push', 'pull', 'core', 'legs', 'cardio'] },
      { focus: 'full', name: 'FULL BODY · B', groups: ['legs', 'pull', 'push', 'core', 'cardio', 'legs'] }],
  3: [{ focus: 'full', name: 'FULL BODY · A', groups: ['legs', 'push', 'pull', 'core', 'legs', 'cardio'] },
      { focus: 'cardio', name: 'ENDURANCE GATE', groups: ['cardio', 'core', 'cardio', 'legs', 'core', 'cardio'] },
      { focus: 'full', name: 'FULL BODY · B', groups: ['legs', 'pull', 'push', 'core', 'push', 'legs'] }],
  4: [{ focus: 'upper', name: 'UPPER PROTOCOL', groups: ['push', 'pull', 'push', 'pull', 'core', 'push'] },
      { focus: 'lower', name: 'LOWER PROTOCOL', groups: ['legs', 'legs', 'core', 'legs', 'cardio', 'core'] },
      { focus: 'upper', name: 'UPPER PROTOCOL · II', groups: ['pull', 'push', 'pull', 'push', 'core', 'pull'] },
      { focus: 'cardio', name: 'ENDURANCE GATE', groups: ['cardio', 'legs', 'core', 'cardio', 'core', 'cardio'] }],
  5: [{ focus: 'push', name: 'PUSH PROTOCOL', groups: ['push', 'push', 'legs', 'push', 'core', 'push'] },
      { focus: 'pull', name: 'PULL PROTOCOL', groups: ['pull', 'pull', 'core', 'pull', 'legs', 'pull'] },
      { focus: 'lower', name: 'LEG DUNGEON', groups: ['legs', 'legs', 'legs', 'core', 'legs', 'cardio'] },
      { focus: 'cardio', name: 'ENDURANCE GATE', groups: ['cardio', 'core', 'cardio', 'core', 'cardio', 'legs'] },
      { focus: 'full', name: 'FULL BODY RAID', groups: ['legs', 'push', 'pull', 'core', 'cardio', 'legs'] }],
};
SPLITS[6] = [...SPLITS[5], { focus: 'cardio', name: 'ENDURANCE GATE · II', groups: ['cardio', 'core', 'legs', 'cardio', 'core', 'cardio'] }];

const isGym = (p: PlanInput) => p.location === 'gym';
function pool(p: PlanInput): Exercise[] {
  const equip = isGym(p) ? ['dumbbells', 'barbell', 'machine', 'bench', 'pullup_bar', 'kettlebell', 'bands', 'rope', ...p.equipment] : p.equipment;
  const lvl = LV[p.experience] + 1;
  const knees = /knee|genou|ركب/i.test(p.limitations ?? '');
  return EXERCISES.filter(e => e.group !== 'mobility' && available(e, equip) && e.level <= lvl + (lvl === 1 ? 0 : 1)
    && !(knees && ['jump_squat', 'burpees', 'jumping_jacks', 'high_knees', 'split_squat', 'running', 'stairs'].includes(e.id)));
}
/** Score: prefer equipment-based moves at the gym / when owned, and the right difficulty for the experience. */
function score(e: Exercise, p: PlanInput): number {
  const lvl = LV[p.experience] + 1; let s = 10 - Math.abs(e.level - lvl) * 3;
  if (!e.equip.includes('none')) s += isGym(p) ? 4 : 2;
  if (isGym(p) && e.equip.includes('none') && e.group !== 'core' && e.group !== 'cardio') s -= 3;
  return s;
}

export function exercisesPerSession(minutes: number) { return Math.max(3, Math.min(6, Math.round(minutes / 7))); }

export function generatePlan(p: PlanInput): { name: string; days: PlanDay[] } {
  const n = Math.max(2, Math.min(6, Math.round(p.trainingDays)));
  const dows = TRAINING_DOWS[n]; const split = SPLITS[n]; const per = exercisesPerSession(p.sessionMinutes);
  const all = pool(p);
  const days = dows.map((dow, i) => {
    const s = split[i % split.length]; const chosen: string[] = []; const used = new Set<string>();
    for (const g of s.groups) {
      if (chosen.length >= per) break;
      const cands = all.filter(e => e.group === g && !used.has(e.id)).sort((a, b) => score(b, p) - score(a, p) || a.id.localeCompare(b.id));
      // rotate choices between days with the same focus so A/B days differ
      const pick = cands[(i >> 1) % Math.max(1, Math.min(2, cands.length))] ?? cands[0];
      if (pick) { chosen.push(pick.id); used.add(pick.id); }
    }
    return { dow, focus: s.focus, name: s.name, exercises: chosen };
  });
  const label = n <= 3 ? 'Full-body awakening' : n === 4 ? 'Upper / lower ascension' : 'Hunter split';
  return { name: `${label} · ${n} days`, days };
}

export function initialPrescription(id: string, experience: Experience): Prescription {
  const e = getEx(id); if (!e) return { exercise_id: id, sets: 3, reps: 10, seconds: null, load_kg: null };
  const [sets, dose] = e.rx[LV[experience]];
  return { exercise_id: id, sets, reps: e.measure === 'reps' ? dose : null, seconds: e.measure === 'time' ? dose : null, load_kg: e.loadStep ? 0 : null };
}

/** Week number since the plan started (1-based) — every 5th week is a deload week. */
export function planWeek(planCreatedAt: string, today: string): number {
  const ms = new Date(today + 'T12:00:00').getTime() - new Date(planCreatedAt.slice(0, 10) + 'T12:00:00').getTime();
  return Math.max(1, Math.floor(ms / (7 * 86400000)) + 1);
}
export const isDeloadWeek = (week: number) => week % 5 === 0;
/** What to actually do today: deload weeks drop one set (min 1) and 10 % load. */
export function todaysDose(p: Prescription, deload: boolean): Prescription {
  if (!deload) return p;
  return { ...p, sets: Math.max(1, p.sets - 1), load_kg: p.load_kg ? Math.round(p.load_kg * 0.9 * 2) / 2 : p.load_kg };
}

// ---------- adaptive progression ----------
export interface ProgressState extends Prescription { good_streak: number; bad_streak: number; last_change?: string | null; last_change_at?: string | null }
export interface SetDone { reps?: number | null; seconds?: number | null; load_kg?: number | null }
export interface Evaluation { state: ProgressState; change: 'progress' | 'regress' | 'hold' | 'swap'; message: string; swapTo?: string }

/**
 * Rules (per exercise, from real performance — never from XP):
 *  * "good" session = every prescribed set reached the target AND session RPE ≤ 8.
 *  * 2 good sessions in a row, ≥ 48 h after the last change → progress one small step.
 *  * "bad" session = under 80 % of prescribed volume OR RPE ≥ 9. 2 bad in a row → step back.
 *  * Poor recovery (soreness ≥ 4 or energy ≤ 2) → hold, never progress.
 *  * Deload weeks → hold.
 */
export function evaluate(prev: ProgressState, sets: SetDone[], rpe: number | null, opts: { now: string; recoveryPoor?: boolean; deload?: boolean }): Evaluation {
  const e = getEx(prev.exercise_id);
  const time = e?.measure === 'time' || (!!prev.seconds && !prev.reps);
  const target = (time ? prev.seconds : prev.reps) ?? 0;
  const done = sets.map(s => (time ? s.seconds : s.reps) ?? 0);
  const volume = done.reduce((a, b) => a + b, 0); const planned = target * prev.sets;
  const allHit = done.length >= prev.sets && done.slice(0, prev.sets).every(v => v >= target);
  const good = allHit && (rpe ?? 7) <= 8; const bad = planned > 0 && (volume < planned * 0.8 || (rpe ?? 0) >= 9);
  const s: ProgressState = { ...prev, good_streak: good ? prev.good_streak + 1 : 0, bad_streak: bad ? prev.bad_streak + 1 : 0 };
  const since = prev.last_change_at ? (new Date(opts.now).getTime() - new Date(prev.last_change_at).getTime()) / 3600000 : Infinity;
  if (opts.deload) return { state: s, change: 'hold', message: 'Deload week — same dose, let the body absorb the work.' };
  if (opts.recoveryPoor && !bad) return { state: { ...s, good_streak: 0 }, change: 'hold', message: 'Recovery is low — holding this dose.' };
  if (s.good_streak >= 2 && since >= 48) {
    const next = stepUp(s, e); const st = { ...next.state, good_streak: 0, last_change: next.message, last_change_at: opts.now };
    if (next.swapTo) return { state: st, change: 'swap', swapTo: next.swapTo, message: next.message };
    if (next.state === s) return { state: { ...s, good_streak: 0 }, change: 'hold', message: next.message };
    return { state: st, change: 'progress', message: next.message };
  }
  if (s.bad_streak >= 2) {
    const next = stepDown(s, e);
    return { state: { ...next.state, bad_streak: 0, good_streak: 0, last_change: next.message, last_change_at: opts.now }, change: 'regress', message: next.message };
  }
  return { state: s, change: 'hold', message: good ? 'Strong session — one more like this and the dose rises.' : bad ? 'Tough one — if it happens again the dose drops a little.' : 'Hold this dose.' };
}

function stepUp(s: ProgressState, e?: Exercise): { state: ProgressState; message: string; swapTo?: string } {
  const [lo, hi] = e?.range ?? [8, 15];
  if (s.seconds && !s.reps) {
    const inc = s.seconds >= 600 ? Math.round(s.seconds * 0.1 / 60) * 60 || 60 : 5;
    if (s.seconds + inc <= hi) return { state: { ...s, seconds: s.seconds + inc }, message: `+${inc >= 60 ? inc / 60 + ' min' : inc + ' s'} per set` };
    if (s.sets < 5 && hi < 600) return { state: { ...s, sets: s.sets + 1, seconds: lo }, message: `+1 set (${s.sets + 1} sets)` };
    return { state: s, message: 'At the top of the range — holding' };
  }
  const reps = s.reps ?? lo;
  if (reps + 1 <= hi) { const inc = reps >= 12 ? 2 : 1; const r = Math.min(hi, reps + inc); return { state: { ...s, reps: r }, message: `+${r - reps} rep${r - reps > 1 ? 's' : ''} per set` }; }
  if (e?.loadStep && s.load_kg !== null && s.load_kg !== undefined && s.load_kg > 0) return { state: { ...s, load_kg: s.load_kg + e.loadStep, reps: lo }, message: `+${e.loadStep} kg, back to ${lo} reps` };
  if (s.sets < 4) return { state: { ...s, sets: s.sets + 1, reps: lo }, message: `+1 set, back to ${lo} reps` };
  if (e?.harder) return { state: s, message: `Evolved: ${e.harder.replace(/_/g, ' ')} unlocked`, swapTo: e.harder };
  return { state: s, message: 'At the top of the range — holding' };
}
function stepDown(s: ProgressState, e?: Exercise): { state: ProgressState; message: string } {
  const [lo] = e?.range ?? [8, 15];
  if (s.seconds && !s.reps) { const sec = Math.max(lo, s.seconds - (s.seconds >= 600 ? 120 : 10)); return { state: { ...s, seconds: sec }, message: `Eased to ${sec >= 120 ? Math.round(sec / 60) + ' min' : sec + ' s'}` }; }
  if (s.load_kg && e?.loadStep) { const l = Math.max(0, Math.round(s.load_kg * 0.9 * 2) / 2); return { state: { ...s, load_kg: l }, message: `Load eased to ${l} kg` }; }
  if ((s.reps ?? lo) - 2 >= Math.max(3, lo - 3)) return { state: { ...s, reps: (s.reps ?? lo) - 2 }, message: '−2 reps per set' };
  if (s.sets > 2) return { state: { ...s, sets: s.sets - 1 }, message: '−1 set' };
  return { state: s, message: 'Holding — try the easier variation' };
}

/** Estimated kcal of a session from MET × body weight × time. */
export function sessionKcal(items: { exercise_id: string; seconds: number }[], weightKg: number): number {
  return Math.round(items.reduce((a, i) => a + (getEx(i.exercise_id)?.met ?? 4) * weightKg * (i.seconds / 3600), 0));
}
/** Rough active time of a set: timed sets = their time, rep sets ≈ 3 s per rep. */
export const setSeconds = (s: SetDone) => s.seconds ?? (s.reps ?? 0) * 3;

/** One manual step easier/harder (asked by the hunter or THE SYSTEM, e.g. "push-ups are too hard"). */
export function manualAdjust(s: ProgressState, direction: 'easier' | 'harder', now: string): { state: ProgressState; message: string; swapTo?: string } {
  const e = getEx(s.exercise_id);
  const r: { state: ProgressState; message: string; swapTo?: string } = direction === 'harder' ? stepUp(s, e) : stepDown(s, e);
  const swapTo = direction === 'easier' && r.state === s && e?.easier ? e.easier : r.swapTo;
  return { state: { ...r.state, good_streak: 0, bad_streak: 0, last_change: r.message, last_change_at: now }, message: swapTo && !r.swapTo ? `Switched to an easier variation` : r.message, swapTo };
}
