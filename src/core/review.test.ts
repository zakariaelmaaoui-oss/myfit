import { it, expect } from 'vitest';
import { reviewTargets } from './review';
const w = (kgs: number[][]) => kgs.flatMap((week, i) => week.map((kg, j) => ({ date: `2026-11-${String(2 + i * 7 + j).padStart(2, '0')}`, kg })));
const base = { goal: 'lose', kcal: 2000, bmr: 1750, sex: 'male' as const, weightKg: 84, avgIntake: 2000, daysLogged: 18 };
it('needs 3 weeks of data', () => expect(reviewTargets({ ...base, weights: w([[84, 84], [83.8, 83.6]]) }).suggestion).toBe('keep'));
it('slows down too-fast loss', () => expect(reviewTargets({ ...base, weights: w([[86, 86], [84.6, 84.4], [83, 82.8]]) }).suggestion).toBe('increase'));
it('small step when stalled and adherent', () => expect(reviewTargets({ ...base, weights: w([[84, 84.1], [84, 83.9], [84.1, 84]]) }).deltaKcal).toBe(-100));
it('never below the floor', () => expect(reviewTargets({ ...base, kcal: 1800, weights: w([[84, 84.1], [84, 83.9], [84.1, 84]]) }).suggestion).toBe('keep'));
it('not when logging is inconsistent', () => expect(reviewTargets({ ...base, daysLogged: 4, weights: w([[84, 84.1], [84, 83.9], [84.1, 84]]) }).suggestion).toBe('keep'));
