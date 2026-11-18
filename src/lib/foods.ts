import raw from '../data/foods.json';
import type { Nutrients } from './nutrition';

export type FoodCategory = 'vegetables' | 'fruits' | 'meat' | 'chicken' | 'fish' | 'eggs' | 'dairy' | 'cereals' | 'bread'
  | 'legumes' | 'nuts' | 'oils' | 'packaged' | 'drinks' | 'spices' | 'custom';
export const FOOD_CATEGORIES: FoodCategory[] = ['vegetables', 'fruits', 'meat', 'chicken', 'fish', 'eggs', 'dairy', 'cereals',
  'bread', 'legumes', 'nuts', 'oils', 'packaged', 'drinks', 'spices'];

export interface Food {
  id: string;
  fdcId?: number | null;
  category: FoodCategory;
  name: { en: string; fr: string; ar: string };
  usdaDescription?: string;
  per100g: Nutrients;
  addedSugarBasis: 'single_ingredient' | 'sweetener' | 'unknown' | 'label' | 'user';
  portions: { label: string; grams: number }[];
  source: string;
  verified: boolean; // true only for the USDA reference data shipped with the app
  barcode?: string | null;
  brand?: string | null;
}

export const BASE_FOODS: Food[] = (raw as any[]).map(f => ({ ...f, verified: true }));
const byId = new Map<string, Food>(BASE_FOODS.map(f => [f.id, f]));

let customFoods: Food[] = [];
/** Custom (user-entered / barcode) foods are merged in at runtime from the user's database. */
export function setCustomFoods(rows: any[]) {
  customFoods = rows.map(customRowToFood);
  for (const f of customFoods) byId.set(f.id, f);
}
export function allFoods(): Food[] { return [...BASE_FOODS, ...customFoods]; }
export function getFood(id: string): Food | undefined { return byId.get(id); }

export function customRowToFood(r: any): Food {
  return {
    id: `custom:${r.id}`, fdcId: null, category: (r.category || 'custom') as FoodCategory,
    name: { en: r.name, fr: r.name, ar: r.name },
    per100g: { kcal: num(r.kcal), protein: num(r.protein), carbs: num(r.carbs), fat: num(r.fat), fiber: num(r.fiber),
      sugar: num(r.sugar), addedSugar: num(r.added_sugar), sodium: num(r.sodium) },
    addedSugarBasis: r.added_sugar === null || r.added_sugar === undefined ? 'unknown' : (r.source === 'openfoodfacts' ? 'label' : 'user'),
    portions: r.serving_g ? [{ label: r.serving_label || 'serving', grams: Number(r.serving_g) }] : [],
    source: r.source === 'openfoodfacts' ? 'Open Food Facts (community database, not verified)' : 'Entered by you (not verified)',
    verified: false, barcode: r.barcode ?? null, brand: r.brand ?? null,
  };
}
function num(v: any): number | null { return v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v); }

export function foodName(f: Food | undefined, lang: string): string {
  if (!f) return '?';
  const l = lang === 'dar' ? 'ar' : lang;
  return (f.name as any)[l] || f.name.en;
}

/** Accent / Arabic-diacritic insensitive normalisation for search. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟ]/g, '') // Arabic harakat
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
}

export function searchFoods(q: string, category?: string): Food[] {
  const n = normalize(q);
  const terms = n.split(/\s+/).filter(Boolean);
  return allFoods().filter(f => {
    if (category && category !== 'all' && f.category !== category) return false;
    if (!terms.length) return true;
    const hay = normalize([f.name.en, f.name.fr, f.name.ar, f.usdaDescription ?? '', f.brand ?? '', f.barcode ?? ''].join(' '));
    return terms.every(t => hay.includes(t));
  });
}

export const HIGH_ADDED_SUGAR_G = 10; // per 100 g — used to flag products in the sugar tracker
export function isHighAddedSugar(f: Food): boolean {
  const a = f.per100g.addedSugar;
  return a !== null && a >= HIGH_ADDED_SUGAR_G;
}
