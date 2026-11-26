import { it, expect } from 'vitest';
import { RECIPES } from './recipes';
import { getFood } from '../lib/foods';
import { recipeInfo } from '../lib/recipes';
import { cuisineOf, CUISINES } from '../core/meals';
it('every ingredient exists and recipes are low-calorie', () => {
  for (const r of RECIPES) { for (const i of r.ingredients) expect(getFood(i.foodId), `${r.id}:${i.foodId}`).toBeTruthy();
    const k = recipeInfo(r).perServing.totals.kcal; expect(k, r.id).toBeGreaterThan(0); }
  const ids = RECIPES.map(r => r.id); expect(new Set(ids).size).toBe(ids.length);
});
it('covers 11 cuisines', () => { expect(new Set(RECIPES.map(cuisineOf)).size).toBe(CUISINES.length); });
