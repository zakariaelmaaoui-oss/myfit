import { describe, it, expect } from 'vitest';
import { levelFromXp, rankFromLevel, totalXpForLevel, xpForLevel, XP, levelsToNextRank } from './rpg';
describe('rpg', () => {
  it('level curve', () => { expect(xpForLevel(1)).toBe(100); expect(xpForLevel(4)).toBe(800); expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 100 }); });
  it('xp → level round trip', () => { for (const l of [2, 5, 12, 40]) expect(levelFromXp(totalXpForLevel(l)).level).toBe(l); });
  it('ranks', () => { expect(rankFromLevel(1)).toBe('E'); expect(rankFromLevel(10)).toBe('D'); expect(rankFromLevel(34)).toBe('C'); expect(rankFromLevel(70)).toBe('S'); expect(levelsToNextRank(8)).toBe(2); });
  it('workout xp capped and scaled', () => { expect(XP.workout(30, 1)).toBe(85); expect(XP.workout(300, 1)).toBe(120); expect(XP.workout(30, .5)).toBe(43); });
});
