import { describe, it, expect } from 'vitest';
import * as N from './nutrition';
import foods from '../data/foods.json';
import { RECIPES } from '../data/recipes';
import { getFood } from './foods';

describe('BMR / TDEE (Mifflin-St Jeor)', () => {
  it('female reference', () => {
    // 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161 = 1370.25
    expect(N.bmr(65, 165, 30, 'female')).toBe(1370);
  });
  it('male reference', () => {
    // 800 + 1125 - 175 + 5 = 1755
    expect(N.bmr(80, 180, 35, 'male')).toBe(1755);
  });
  it('tdee factor', () => { expect(N.tdee(1370, 'moderate')).toBe(Math.round(1370 * 1.55)); });
});

describe('targets', () => {
  const base: N.ProfileInput = { age: 30, sex: 'female', heightCm: 165, weightKg: 75, activity: 'light', goal: 'lose' };
  it('moderate deficit, never more than 500 kcal', () => {
    const t = N.computeTargets(base);
    expect(t.deficit).toBeLessThanOrEqual(500);
    expect(t.kcal).toBe(t.tdee! - t.deficit);
    expect(t.kcal!).toBeGreaterThanOrEqual(1200);
    expect(t.kcal!).toBeGreaterThanOrEqual(t.bmr!);
  });
  it('macros add up to calories (±10 kcal rounding)', () => {
    const t = N.computeTargets(base);
    expect(Math.abs(t.protein! * 4 + t.carbs! * 4 + t.fat! * 9 - t.kcal!)).toBeLessThanOrEqual(10);
  });
  it('floor applied for small sedentary person', () => {
    const t = N.computeTargets({ ...base, weightKg: 50, heightCm: 150, age: 60, activity: 'sedentary' });
    // TDEE (≈1172) is already below the 1200 floor → no deficit at all, target = maintenance.
    expect(t.kcal).toBe(t.tdee);
    expect(t.deficit).toBe(0);
    expect(t.floorApplied).toBe(true);
    const t2 = N.computeTargets({ ...base, weightKg: 58, heightCm: 158, age: 45, activity: 'sedentary' });
    expect(t2.kcal!).toBeGreaterThanOrEqual(1200);
  });
  it('no deficit when pregnant', () => {
    const t = N.computeTargets({ ...base, pregnant: true });
    expect(t.effectiveGoal).toBe('healthy');
    expect(t.deficit).toBe(0);
    expect(t.kcal).toBe(t.tdee);
  });
  it('no calorie target for minors', () => {
    const t = N.computeTargets({ ...base, age: 15 });
    expect(t.kcal).toBeNull();
    expect(t.restrictions).toContain('minor');
  });
  it('no deficit when underweight', () => {
    const t = N.computeTargets({ ...base, weightKg: 48, heightCm: 170 });
    expect(t.restrictions).toContain('underweight');
    expect(t.deficit).toBe(0);
  });
  it('muscle surplus capped at +300', () => {
    const t = N.computeTargets({ ...base, goal: 'muscle', sex: 'male', weightKg: 90, heightCm: 190, activity: 'very_active' });
    expect(t.kcal! - t.tdee!).toBeLessThanOrEqual(300);
  });
  it('fiber 14 g / 1000 kcal and WHO added sugar <10 %', () => {
    const t = N.computeTargets({ ...base, goal: 'maintain' });
    expect(t.fiber).toBe(Math.round(t.kcal! / 1000 * 14));
    expect(t.addedSugarMaxG).toBe(Math.round(t.kcal! * 0.1 / 4));
  });
  it('water clamp', () => {
    expect(N.waterTarget(40)).toBe(1500);
    expect(N.waterTarget(70)).toBe(2450);
    expect(N.waterTarget(150)).toBe(3500);
    expect(N.waterTarget(70, 2000)).toBe(2000);
  });
});

describe('portions', () => {
  it('boiled potato 200 g = 2 × per-100 g value from USDA', () => {
    const potato = (foods as any[]).find(f => f.id === 'potato_boiled');
    expect(potato.fdcId).toBe(170440);
    const s = N.scaleNutrients(potato.per100g, 200);
    expect(s.kcal).toBe(Math.round(potato.per100g.kcal * 2));
    expect(s.kcal).toBe(172);
  });
  it('unknown stays unknown', () => {
    const s = N.scaleNutrients({ kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: null, sugar: null, addedSugar: null }, 50);
    expect(s.fiber).toBeNull();
    const sum = N.sumNutrients([s, { kcal: 10, protein: 0, carbs: 0, fat: 0, fiber: 1, sugar: 1, addedSugar: 0 }]);
    expect(sum.incomplete.fiber).toBe(true);
    expect(sum.totals.kcal).toBe(60);
  });
  it('natural sugar', () => {
    expect(N.naturalSugar(10, 4)).toBe(6);
    expect(N.naturalSugar(10, null)).toBeNull();
  });
});

describe('food database integrity', () => {
  it('every food has USDA id and core values', () => {
    for (const f of foods as any[]) {
      expect(f.fdcId).toBeGreaterThan(0);
      expect(typeof f.per100g.kcal).toBe('number');
      expect(f.name.en && f.name.fr && f.name.ar).toBeTruthy();
    }
  });
  it('every recipe ingredient exists in the database', () => {
    for (const r of RECIPES) for (const i of r.ingredients) expect(getFood(i.foodId), `${r.id}:${i.foodId}`).toBeTruthy();
  });
  it('recipe nutrition is computed from ingredients', () => {
    const r = RECIPES.find(r => r.id === 'harira')!;
    const n = N.recipeNutrition(r.ingredients, r.servings, id => getFood(id)?.per100g);
    expect(n.totals.kcal).toBeGreaterThan(100);
    const half = N.recipeNutrition(r.ingredients, r.servings, id => getFood(id)?.per100g, 0.5);
    expect(Math.abs(half.totals.kcal * 2 - n.totals.kcal)).toBeLessThanOrEqual(2);
  });
});

describe('stats', () => {
  it('weekly + monthly averages', () => {
    const pts = [{ date: '2026-11-02', weightKg: 70 }, { date: '2026-11-03', weightKg: 71 }, { date: '2026-11-10', weightKg: 69 }];
    expect(N.weeklyAverages(pts)).toEqual([{ week: '2026-11-02', avg: 70.5, n: 2 }, { week: '2026-11-09', avg: 69, n: 1 }]);
    expect(N.monthlyAverages(pts)[0].avg).toBe(70);
  });
  it('goal progress', () => {
    expect(N.goalProgress(80, 75, 70)).toBe(50);
    expect(N.goalProgress(80, 82, 70)).toBe(0);
  });
  it('weekly report never invents data', () => {
    const days = N.lastNDays(7, '2026-11-18');
    const r = N.weeklyReport({ days, diary: [], water: [], walks: [], weights: [], journalDates: [] });
    expect(r.avgKcal).toBeNull(); expect(r.weightChange).toBeNull(); expect(r.daysWithMeals).toBe(0);
    const r2 = N.weeklyReport({ days, diary: [{ date: '2026-11-18', kcal: 1800, protein: 80, sugar: 40, addedSugar: 20, entries: 3 },
      { date: '2026-11-17', kcal: 2000, protein: 70, sugar: 50, addedSugar: 10, entries: 2 }],
      water: [{ date: '2026-11-18', ml: 250 }, { date: '2026-11-18', ml: 500 }], walks: [{ date: '2026-11-18', minutes: 30 }],
      weights: [{ date: '2026-11-12', weightKg: 70 }, { date: '2026-11-18', weightKg: 69.4 }], journalDates: ['2026-11-15', '2026-10-01'] });
    expect(r2.avgKcal).toBe(1900); expect(r2.avgWaterMl).toBe(750); expect(r2.weightChange).toBe(-0.6); expect(r2.journalEntries).toBe(1);
  });
  it('quiet hours across midnight', () => {
    expect(N.inQuietHours('23:00', '22:00', '07:00')).toBe(true);
    expect(N.inQuietHours('06:59', '22:00', '07:00')).toBe(true);
    expect(N.inQuietHours('12:00', '22:00', '07:00')).toBe(false);
  });
  it('cost requires user price', () => {
    expect(N.costFor(500, null)).toBeNull();
    expect(N.costFor(500, 20)).toBe(10);
  });
  it('dates', () => {
    expect(N.addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(N.startOfWeek('2026-11-18')).toBe('2026-11-16');
  });
});
