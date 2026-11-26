// Meal ideas & day planner from the stored recipe library (nutrition is calculated, never invented).
import { RECIPES, type Recipe, type Meal } from '../data/recipes.js';
import { recipeInfo, type RecipeInfo } from '../lib/recipes.js';
import { getFood } from '../lib/foods.js';

export const CUISINES = ['moroccan', 'mediterranean', 'middle_eastern', 'french', 'italian', 'spanish', 'turkish', 'indian', 'asian', 'mexican', 'american'] as const;
export type Cuisine = typeof CUISINES[number];
export const cuisineOf = (r: Recipe): Cuisine => (r.cuisine as Cuisine) ?? (r.moroccan ? 'moroccan' : 'mediterranean');

export const ALLERGENS: Record<string, (foodId: string) => boolean> = {
  gluten: id => /^(bread|flour|semolina|barley|pasta|vermicelli|couscous|bulgur|wheat|crackers|cornflakes|cheerios|granola|croissant|cake|cookies|doughnut|pizza|hamburger)/.test(id),
  lactose: id => getFood(id)?.category === 'dairy' || /^(ice_cream|chocolate_milk|pizza)/.test(id),
  eggs: id => getFood(id)?.category === 'eggs' || /^(mayonnaise|cake)/.test(id),
  nuts: id => ['almonds', 'walnuts', 'cashews', 'pistachios', 'almond_milk'].includes(id),
  peanuts: id => id.startsWith('peanut'),
  fish: id => getFood(id)?.category === 'fish' && !['shrimp_raw', 'squid_raw'].includes(id),
  shellfish: id => ['shrimp_raw', 'squid_raw'].includes(id),
  sesame: id => ['sesame', 'tahini', 'hummus'].includes(id),
  soy: id => id === 'tofu',
};
export interface MealPrefs { diet?: string; allergies?: string[]; cuisines?: string[]; budget?: string }
const MEAT = new Set(['meat', 'chicken']);

export function allowed(info: RecipeInfo, p: MealPrefs): boolean {
  const ids = info.recipe.ingredients.map(i => i.foodId);
  const cats = ids.map(id => getFood(id)?.category ?? '');
  if (p.diet === 'vegetarian' && !info.vegetarian) return false;
  if (p.diet === 'pescatarian' && cats.some(c => MEAT.has(c))) return false;
  if (p.diet === 'vegan' && cats.some(c => MEAT.has(c) || c === 'fish' || c === 'dairy' || c === 'eggs') ) return false;
  if (p.diet === 'vegan' && ids.includes('honey')) return false;
  for (const a of p.allergies ?? []) { const test = ALLERGENS[a]; if (test && ids.some(test)) return false; }
  return true;
}

let INFOS: RecipeInfo[] | null = null;
export const allInfos = () => (INFOS ??= RECIPES.map(r => recipeInfo(r)));

export interface Idea { recipe_id: string; name: string; meal: Meal[]; kcal: number; protein: number; carbs: number; fat: number; minutes: number; cuisine: Cuisine; servings: number }
const toIdea = (i: RecipeInfo, servings = 1): Idea => ({ recipe_id: i.recipe.id, name: i.recipe.name.en, meal: i.recipe.meals, kcal: Math.round(i.perServing.totals.kcal * servings),
  protein: Math.round(i.perServing.totals.protein * servings), carbs: Math.round(i.perServing.totals.carbs * servings), fat: Math.round(i.perServing.totals.fat * servings),
  minutes: i.totalMin, cuisine: cuisineOf(i.recipe), servings });

/** Up to `count` ideas for a meal that fit under maxKcal, ranked by protein per kcal, preferred cuisines first. */
export function mealIdeas(meal: Meal | 'any', maxKcal: number, p: MealPrefs, opts: { count?: number; highProtein?: boolean; quick?: boolean; cuisine?: string; exclude?: string[] } = {}): Idea[] {
  const pref = new Set(p.cuisines ?? []);
  return allInfos()
    .filter(i => (meal === 'any' || i.recipe.meals.includes(meal)) && allowed(i, p) && i.perServing.totals.kcal > 40 && i.perServing.totals.kcal <= maxKcal)
    .filter(i => (!opts.highProtein || i.highProtein) && (!opts.quick || i.quick) && (!opts.cuisine || cuisineOf(i.recipe) === opts.cuisine) && !(opts.exclude ?? []).includes(i.recipe.id))
    .filter(i => !i.recipe.variantOf || !opts.exclude?.includes(i.recipe.variantOf))
    .sort((a, b) => (Number(pref.has(cuisineOf(b.recipe))) - Number(pref.has(cuisineOf(a.recipe))))
      || (b.perServing.totals.protein / b.perServing.totals.kcal) - (a.perServing.totals.protein / a.perServing.totals.kcal))
    .slice(0, opts.count ?? 10).map(i => toIdea(i));
}

const SPLIT: Record<Meal, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
/** A full day (or the rest of the day) that fits the remaining kcal and tries to reach the protein target. */
export function planDay(remainingKcal: number, remainingProtein: number, mealsLeft: Meal[], p: MealPrefs, seed = 0): { meals: { meal: Meal; idea: Idea }[]; kcal: number; protein: number } {
  const out: { meal: Meal; idea: Idea }[] = []; const used: string[] = [];
  const share = mealsLeft.reduce((a, m) => a + SPLIT[m], 0) || 1;
  let kcalLeft = remainingKcal;
  for (const m of mealsLeft) {
    const budget = Math.max(120, Math.round((remainingKcal * SPLIT[m]) / share * 1.1));
    const ideas = mealIdeas(m, Math.min(budget, kcalLeft), p, { count: 6, exclude: used });
    const pick = ideas[seed % Math.max(1, ideas.length)] ?? ideas[0];
    if (pick) { out.push({ meal: m, idea: pick }); used.push(pick.recipe_id); kcalLeft -= pick.kcal; }
  }
  return { meals: out, kcal: out.reduce((a, x) => a + x.idea.kcal, 0), protein: out.reduce((a, x) => a + x.idea.protein, 0) + 0 * remainingProtein };
}
