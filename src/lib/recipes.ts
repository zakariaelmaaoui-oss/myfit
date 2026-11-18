import { RECIPES, type Recipe } from '../data/recipes';
import { getFood } from './foods';
import { costFor, recipeNutrition, round, type SumResult } from './nutrition';

const OVERRIDE: Record<string, string> = {
  tomato_paste: 'tomato_paste', orange_juice: 'orange_juice', apple_juice: 'apple_juice', green_beans: 'green_beans', sweet_potato: 'sweet_potato',
  greek_yogurt_nonfat: 'yogurt', yogurt_plain_whole: 'yogurt', yogurt_plain_low: 'yogurt', sea_bass_raw: 'sea_bass', white_beans_raw: 'white_beans',
  white_beans_cooked: 'white_beans', split_peas_cooked: 'split_peas', kidney_beans_raw: 'kidney_beans', peanut_butter: 'peanut_butter', black_pepper: 'black_pepper',
  ice_cream: 'ice_cream', lemon_juice: 'lemon', chili_green: 'chili', sugar_powdered: 'sugar', sugar_brown: 'sugar', ginger_ground: 'ginger', coriander_seed: 'coriander_seed',
  bread_white: 'bread', bread_whole: 'bread', bread_pita: 'bread', dates_medjool: 'dates', dates_deglet: 'dates', fig_dried: 'fig_dried', apricot_dried: 'apricot_dried',
  chocolate_milk: 'chocolate_milk', milk_whole: 'milk', milk_semi: 'milk', milk_low: 'milk',
};
/** Ingredient "family" so that e.g. raw egg in the fridge matches a recipe using boiled egg. */
export function family(foodId: string): string { return OVERRIDE[foodId] ?? foodId.split('_')[0]; }

const STAPLE_IDS = new Set(['water', 'salt', 'parsley', 'coriander', 'mint', 'lemon_juice', 'garlic', 'vinegar', 'tea_green', 'tea_herbal']);
export function isStaple(foodId: string): boolean {
  const f = getFood(foodId); return STAPLE_IDS.has(foodId) || f?.category === 'spices' || f?.category === 'oils';
}

export interface RecipeInfo {
  recipe: Recipe; perServing: SumResult; vegetarian: boolean; highProtein: boolean; lowAddedSugar: boolean; quick: boolean; totalMin: number;
  cost: number | null; costPerServing: number | null;
}
const meatCats = new Set(['meat', 'chicken', 'fish']);
export function recipeInfo(r: Recipe, prices?: Map<string, number>): RecipeInfo {
  const perServing = recipeNutrition(r.ingredients, r.servings, id => getFood(id)?.per100g);
  const vegetarian = r.ingredients.every(i => !meatCats.has(getFood(i.foodId)?.category ?? ''));
  const protein = perServing.totals.protein; const kcal = perServing.totals.kcal;
  const highProtein = protein >= 20 || (kcal > 0 && (protein * 4) / kcal >= 0.25 && protein >= 12);
  const lowAddedSugar = !perServing.incomplete.addedSugar && perServing.totals.addedSugar <= 2.5;
  const totalMin = r.prepMin + r.cookMin;
  let cost: number | null = null;
  if (prices) {
    let sum = 0; let ok = true;
    for (const i of r.ingredients) {
      if (i.foodId === 'water' || i.foodId === 'salt' || getFood(i.foodId)?.category === 'spices') continue;
      const p = prices.get(i.foodId) ?? prices.get('family:' + family(i.foodId));
      const c = costFor(i.grams, p); if (c === null) { ok = false; break; } sum += c;
    }
    cost = ok ? round(sum, 2) : null;
  }
  return { recipe: r, perServing, vegetarian, highProtein, lowAddedSugar, quick: totalMin <= 20, totalMin, cost, costPerServing: cost === null ? null : round(cost / r.servings, 2) };
}

/** Latest user-entered price per food (and per family as fallback). */
export function priceMap(rows: { food_id: string; price_mad_per_kg: number; observed_on?: string; created_at?: string }[]): Map<string, number> {
  const m = new Map<string, number>(); const when = new Map<string, string>();
  for (const r of rows) {
    const d = r.observed_on || r.created_at || '';
    for (const k of [r.food_id, 'family:' + family(r.food_id)]) {
      if (!when.has(k) || d >= when.get(k)!) { m.set(k, Number(r.price_mad_per_kg)); when.set(k, d); }
    }
  }
  return m;
}

export interface FridgeMatch { info: RecipeInfo; have: string[]; missing: string[]; pct: number }
export function matchFridge(fridgeFoodIds: string[], prices?: Map<string, number>): FridgeMatch[] {
  const fams = new Set(fridgeFoodIds.map(family));
  return RECIPES.map(r => {
    const key = [...new Set(r.ingredients.filter(i => !isStaple(i.foodId)).map(i => i.foodId))];
    const have = key.filter(id => fams.has(family(id))); const missing = key.filter(id => !fams.has(family(id)));
    return { info: recipeInfo(r, prices), have, missing, pct: key.length ? Math.round((have.length / key.length) * 100) : 0 };
  }).filter(m => m.have.length > 0).sort((a, b) => b.pct - a.pct || a.missing.length - b.missing.length);
}

export function scaledIngredients(r: Recipe, portions: number) {
  return r.ingredients.map(i => ({ ...i, grams: round((i.grams / r.servings) * portions, 1) }));
}
export { RECIPES };
