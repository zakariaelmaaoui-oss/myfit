import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STRINGS } from './strings';
import { DIETS, ALLERGIES, COUNTRIES } from '../components/ProfileFields';
import { FOOD_CATEGORIES } from './foods';
import { MOODS } from '../pages/tracking';

function files(dir: string): string[] { return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : []; }); }

describe('translations', () => {
  const src = files(join(__dirname, '..')).map(f => readFileSync(f, 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'[,)]/g)].map(m => m[1]));
  const dynamic = [
    ...['home', 'food', 'wellness', 'progress', 'profile', 'database', 'diary', 'fridge', 'recipes', 'moroccan', 'planner', 'sugar', 'shopping', 'budget', 'checkin', 'journal', 'stress', 'breathing', 'habits', 'drinks', 'water', 'walk', 'sport', 'coach', 'weight', 'nutritionCharts', 'activity', 'report', 'personal', 'goals', 'language', 'notifications', 'privacy', 'settings'].map(k => 'nav.' + k),
    ...['database', 'diary', 'fridge', 'recipes', 'moroccan', 'planner', 'sugar', 'shopping', 'budget', 'checkin', 'journal', 'stress', 'breathing', 'habits', 'drinks', 'water', 'walk', 'sport', 'coach', 'weight', 'nutritionCharts', 'activity', 'report'].map(k => 'hub.' + k),
    ...['all', ...FOOD_CATEGORIES, 'custom'].map(k => 'cat.' + k), ...['breakfast', 'lunch', 'dinner', 'snack', 'drink'].map(k => 'meal.' + k),
    ...['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'addedSugar'].map(k => 'n.' + k), ...['g', 'kcal', 'ml', 'mg', 'min'].map(k => 'unit.' + k),
    ...['lose', 'maintain', 'healthy', 'muscle'].map(k => 'goal.' + k), ...['sedentary', 'light', 'moderate', 'active', 'very_active'].map(k => 'act.' + k),
    ...DIETS.map(k => 'diet.' + k), ...ALLERGIES.map(k => 'allergy.' + k), ...COUNTRIES.map(k => 'country.' + k), ...['personal', 'goals', 'food', 'health'].map(k => 'onb.' + k),
    ...['minor', 'pregnant', 'breastfeeding', 'medical', 'eating_disorder', 'underweight'].map(k => 'calc.restricted.' + k), ...[1, 2, 3, 4, 5, 6, 7].map(k => 'calc.f' + k),
    ...['cost', 'protein', 'lowsugar', 'vegetarian', 'moroccan', 'quick', 'available', 'favorites', 'budget'].map(k => 'rf.' + k), 
    ...MOODS.map(k => 'mood.' + k), ...['physical', 'emotional', 'craving'].map(k => 'cat3.' + k),
    ...['morning', 'afternoon', 'evening', 'night'].map(k => 'journal.' + k), ...['in', 'hold', 'out', 'hold2'].map(k => 'breath.' + k),
    ...['water', 'walk', 'meals', 'mealprep', 'habits', 'report'].map(k => 'notif.type.' + k), ...['hips_cm', 'chest_cm', 'arm_cm', 'thigh_cm'].map(k => 'weight.' + k),
    ...['all', 'cardio', 'strength', 'core', 'flex', 'daily'].map(k => 'sport.cat.' + k), ...[1, 2, 3].map(k => 'sport.level' + k), ...['all', 'fullbody', 'strength', 'core', 'cardio', 'flex'].map(k => 'sport.tag.' + k), ...['kcal', 'burned', 'minutes'].map(k => 'stats.metric.' + k),
    'home.morning', 'home.afternoon', 'home.evening', 'diary.updated',
  ];
  it('every key used exists in en, fr and ar', () => {
    const missing = [...used, ...dynamic].filter(k => !STRINGS[k] || !STRINGS[k].en || !STRINGS[k].fr || !STRINGS[k].ar);
    expect(missing).toEqual([]);
  });
  it('placeholders match across languages', () => {
    const bad = Object.entries(STRINGS).filter(([, v]) => { const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(); return ph(v.fr) !== ph(v.en) || ph(v.ar) !== ph(v.en) || (v.dar !== undefined && ph(v.dar) !== ph(v.en)); }).map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
