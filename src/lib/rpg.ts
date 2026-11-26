// Hunter progression engine — deterministic and unit-tested.
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const RANKS: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const RANK_FLOOR: [number, Rank][] = [[70, 'S'], [50, 'A'], [35, 'B'], [20, 'C'], [10, 'D'], [1, 'E']];

/** XP needed to go from level n to n+1. */
export const xpForLevel = (n: number) => Math.round(100 * Math.pow(n, 1.5));
/** Total XP needed to reach level n (level 1 = 0). */
export function totalXpForLevel(n: number) { let s = 0; for (let i = 1; i < n; i++) s += xpForLevel(i); return s; }
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1, rest = Math.max(0, Math.floor(xp));
  while (rest >= xpForLevel(level)) { rest -= xpForLevel(level); level++; }
  return { level, into: rest, need: xpForLevel(level) };
}
export const rankFromLevel = (level: number): Rank => RANK_FLOOR.find(([l]) => level >= l)![1];
export const nextRank = (r: Rank): Rank | null => RANKS[RANKS.indexOf(r) + 1] ?? null;
export function levelsToNextRank(level: number): number | null {
  const r = rankFromLevel(level); const nr = nextRank(r); if (!nr) return null;
  const floor = RANK_FLOOR.find(([, x]) => x === nr)![0]; return floor - level;
}

/** XP rules. Healthy behaviour only: nothing for deficits, skipped meals or training beyond the plan. */
export const XP = {
  mealLogged: 5, mealLoggedDailyCap: 4, proteinTarget: 20, waterTarget: 10, questEasy: 10, questMedium: 25, questHard: 40,
  workout: (minutes: number, completedRatio: number) => Math.round(Math.min(120, 40 + minutes * 1.5) * Math.max(0, Math.min(1, completedRatio))),
  weeklyChallenge: 150, streakMilestone: (days: number) => (days % 7 === 0 ? 50 : 0),
};
