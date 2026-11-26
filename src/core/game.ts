// RPG rules: daily quests, weekly challenges, achievements, attributes, streaks. Pure functions (game.test.ts).
// Healthy behaviour only: nothing rewards eating less than the target, skipping meals or training beyond the plan.
import { getEx, fmtDose, exName } from '../data/exercises.js';
import type { PlanDay, Prescription } from './training.js';

export interface DayData {
  foods: { meal: string; kcal: number; protein: number | null }[];
  waterMl: number;
  sets: { exercise_id: string; reps: number | null; seconds: number | null }[];
  sessionsCompleted: number;
  checkin: boolean;
}
export interface QuestDraft {
  key: string; kind: 'workout' | 'exercise' | 'walk' | 'meals' | 'protein' | 'water' | 'evaluation' | 'recovery' | 'custom';
  title: string; detail?: string; instructions?: string; target: number; unit?: string; xp: number;
  difficulty: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'; attribute: 'strength' | 'endurance' | 'discipline' | 'consistency' | 'fitness'; meta?: Record<string, unknown>;
}
export interface QuestRow extends QuestDraft { id: string; date: string; progress: number; status: 'active' | 'done' | 'skipped'; source: string; completed_at?: string | null }

const CARDIO = new Set(['brisk_walk', 'running', 'cycling', 'stairs']);
const MOBILITY = new Set(['stretching', 'hip_mobility']);

/** Daily quests from today's plan day (or a rest day) and the hunter's targets. */
export function buildDailyQuests(input: {
  planDay: PlanDay | null; prescriptions: Record<string, Prescription>; proteinTarget: number | null; waterTarget: number;
  experience: 'beginner' | 'intermediate' | 'advanced'; sessionMinutes: number; lang?: string;
}): QuestDraft[] {
  const q: QuestDraft[] = []; const lang = input.lang ?? 'en';
  const walkMin = input.experience === 'beginner' ? 20 : 30;
  if (input.planDay) {
    q.push({ key: 'workout', kind: 'workout', title: `Clear today’s dungeon: ${input.planDay.name}`, detail: `${input.planDay.exercises.length} exercises · ~${input.sessionMinutes} min`,
      instructions: 'Open WORKOUT, start the session and log every set. Finish with how hard it felt (RPE).', target: 1, xp: 40, difficulty: 'B', attribute: input.planDay.focus === 'cardio' ? 'endurance' : 'strength' });
    // two key exercises become their own missions (total volume of the day)
    for (const id of input.planDay.exercises.slice(0, 2)) {
      const p = input.prescriptions[id]; const e = getEx(id); if (!p || !e) continue;
      const total = (p.seconds ?? p.reps ?? 0) * p.sets;
      q.push({ key: `ex:${id}`, kind: 'exercise', title: exName(e, lang), detail: fmtDose(p.sets, p.reps, p.seconds, p.load_kg), instructions: e.how.en,
        target: total, unit: p.seconds ? 's' : 'reps', xp: 15, difficulty: e.level >= 3 ? 'B' : e.level === 2 ? 'C' : 'D',
        attribute: e.group === 'cardio' ? 'endurance' : 'strength', meta: { exercise_id: id } });
    }
    q.push({ key: 'walk', kind: 'walk', title: `Walk ${walkMin - 10} minutes`, detail: 'Brisk walk, any time of day', instructions: 'Log it in WORKOUT → Activity, or tell THE SYSTEM.',
      target: walkMin - 10, unit: 'min', xp: 10, difficulty: 'E', attribute: 'endurance' });
  } else {
    q.push({ key: 'walk', kind: 'walk', title: `Active recovery: walk ${walkMin} minutes`, detail: 'Rest day — light movement helps recovery', instructions: 'Easy pace. Log it in WORKOUT → Activity, or tell THE SYSTEM.',
      target: walkMin, unit: 'min', xp: 20, difficulty: 'D', attribute: 'endurance' });
    q.push({ key: 'mobility', kind: 'recovery', title: 'Mobility ritual · 5 minutes', detail: 'Stretching or hip mobility', instructions: 'Gentle, never painful.',
      target: 5, unit: 'min', xp: 10, difficulty: 'E', attribute: 'fitness' });
  }
  q.push({ key: 'meals', kind: 'meals', title: 'Record your meals', detail: 'Log at least 3 meals', instructions: 'Search, scan a recipe, or tell THE SYSTEM what you ate.', target: 3, unit: 'meals', xp: 15, difficulty: 'D', attribute: 'discipline' });
  if (input.proteinTarget) q.push({ key: 'protein', kind: 'protein', title: 'Reach your protein target', detail: `${input.proteinTarget} g`, instructions: 'Eggs, lentils, chicken, fish, yogurt, chickpeas…', target: input.proteinTarget, unit: 'g', xp: 20, difficulty: 'C', attribute: 'discipline' });
  q.push({ key: 'water', kind: 'water', title: 'Drink enough water', detail: `${(input.waterTarget / 1000).toFixed(1)} L`, instructions: 'Tap +250 ml in NUTRITION each glass.', target: input.waterTarget, unit: 'ml', xp: 10, difficulty: 'E', attribute: 'discipline' });
  q.push({ key: 'evaluation', kind: 'evaluation', title: 'Evening evaluation', detail: 'Energy, soreness, sleep', instructions: 'Tell THE SYSTEM how today went, or fill the check-in on HOME.', target: 1, xp: 10, difficulty: 'E', attribute: 'consistency' });
  return q;
}

/** Progress of a quest from real logged data only. Custom quests are completed by hand. */
export function questProgress(q: { kind: string; meta?: any }, d: DayData): number | null {
  switch (q.kind) {
    case 'workout': return d.sessionsCompleted > 0 ? 1 : 0;
    case 'exercise': return d.sets.filter(s => s.exercise_id === q.meta?.exercise_id).reduce((a, s) => a + ((getEx(s.exercise_id)?.measure === 'time' ? s.seconds : s.reps) ?? 0), 0);
    case 'walk': return Math.floor(d.sets.filter(s => CARDIO.has(s.exercise_id)).reduce((a, s) => a + (s.seconds ?? 0), 0) / 60);
    case 'recovery': return Math.floor(d.sets.filter(s => MOBILITY.has(s.exercise_id)).reduce((a, s) => a + (s.seconds ?? 0), 0) / 60);
    case 'meals': return new Set(d.foods.map(f => f.meal)).size;
    case 'protein': return Math.round(d.foods.reduce((a, f) => a + (f.protein ?? 0), 0));
    case 'water': return d.waterMl;
    case 'evaluation': return d.checkin ? 1 : 0;
    default: return null;
  }
}

// ---------- weekly challenges ----------
export interface WeekData { days: { date: string; protein: number; meals: number; sessions: number; cardioMin: number }[] }
export function buildWeeklyChallenges(trainingDays: number, proteinTarget: number | null) {
  return [
    { key: 'train', title: `Clear ${trainingDays} dungeons this week`, target: trainingDays, xp: 150 },
    ...(proteinTarget ? [{ key: 'protein', title: 'Hit protein 5 days', target: 5, xp: 120 }] : []),
    { key: 'log', title: 'Log meals on 6 days', target: 6, xp: 100 },
    { key: 'cardio', title: '120 minutes of walking or cardio', target: 120, xp: 100 },
  ];
}
export function challengeProgress(key: string, w: WeekData, proteinTarget: number | null): number {
  switch (key) {
    case 'train': return w.days.reduce((a, d) => a + Math.min(1, d.sessions), 0);
    case 'protein': return proteinTarget ? w.days.filter(d => d.protein >= proteinTarget).length : 0;
    case 'log': return w.days.filter(d => d.meals >= 2).length;
    case 'cardio': return Math.round(w.days.reduce((a, d) => a + d.cardioMin, 0));
    default: return 0;
  }
}

// ---------- achievements ----------
export interface Totals { workouts: number; pushups: number; mealsLogged: number; streak: number; level: number; proteinDays: number; weighIns: number; prs: number }
export const ACHIEVEMENTS: { key: string; name: string; desc: string; icon: string; xp: number; test: (t: Totals) => boolean }[] = [
  { key: 'first_dungeon', name: 'First Dungeon', desc: 'Complete your first workout', icon: 'sword', xp: 30, test: t => t.workouts >= 1 },
  { key: 'first_meal', name: 'Fuel Recorded', desc: 'Log your first meal', icon: 'food', xp: 10, test: t => t.mealsLogged >= 1 },
  { key: 'dungeons_10', name: 'Dungeon Regular', desc: '10 workouts completed', icon: 'shield', xp: 80, test: t => t.workouts >= 10 },
  { key: 'dungeons_50', name: 'Gate Breaker', desc: '50 workouts completed', icon: 'trophy', xp: 200, test: t => t.workouts >= 50 },
  { key: 'pushups_100', name: '100 Push-ups', desc: '100 push-ups in total', icon: 'bolt', xp: 40, test: t => t.pushups >= 100 },
  { key: 'pushups_1000', name: 'Thousand Fists', desc: '1,000 push-ups in total', icon: 'bolt', xp: 150, test: t => t.pushups >= 1000 },
  { key: 'streak_7', name: '7-Day Flame', desc: '7-day streak', icon: 'flame', xp: 50, test: t => t.streak >= 7 },
  { key: 'streak_30', name: 'Iron Discipline', desc: '30-day streak', icon: 'flame', xp: 200, test: t => t.streak >= 30 },
  { key: 'protein_7', name: 'Protein Hunter', desc: 'Protein target on 7 days', icon: 'trophy', xp: 60, test: t => t.proteinDays >= 7 },
  { key: 'weigh_4', name: 'Watcher', desc: '4 weigh-ins recorded', icon: 'scale', xp: 30, test: t => t.weighIns >= 4 },
  { key: 'first_pr', name: 'Limit Broken', desc: 'Set a personal record', icon: 'star', xp: 30, test: t => t.prs >= 1 },
  { key: 'rank_d', name: 'Rank D', desc: 'Reach level 10', icon: 'star', xp: 0, test: t => t.level >= 10 },
  { key: 'rank_c', name: 'Rank C', desc: 'Reach level 20', icon: 'star', xp: 0, test: t => t.level >= 20 },
  { key: 'rank_b', name: 'Rank B', desc: 'Reach level 35', icon: 'star', xp: 0, test: t => t.level >= 35 },
];

/** A day counts for the streak when at least 60 % of its quests are done (rest days count the same way). */
export function dayCleared(quests: { status: string }[]) { return quests.length > 0 && quests.filter(q => q.status === 'done').length / quests.length >= 0.6; }
/** Consecutive cleared days ending today (or yesterday, if today isn't cleared yet). */
export function streak(clearedByDate: Map<string, boolean>, today: string, addDays: (d: string, n: number) => string): number {
  let d = clearedByDate.get(today) ? today : addDays(today, -1); let n = 0;
  while (clearedByDate.get(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** 0–99 attribute score from the XP earned in that attribute (log curve: early gains are fast, later ones slower). */
export const attributeScore = (xp: number) => Math.min(99, Math.round(10 + 14 * Math.log2(1 + xp / 40)));
export const TITLES: Record<string, string> = { E: 'Shadow Initiate', D: 'Awakened Hunter', C: 'Gate Raider', B: 'Elite Hunter', A: 'Shadow Knight', S: 'Monarch of Discipline' };
