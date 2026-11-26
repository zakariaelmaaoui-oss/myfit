// Weekly target review. Targets NEVER change from one unusual day: only from weekly weight averages over ≥ 3 weeks,
// in small steps, never below the safe floor, and only after the hunter accepts the suggestion.
import { weeklyAverages, calorieFloor, type Sex } from '../lib/nutrition.js';

export interface Review { suggestion: 'keep' | 'increase' | 'decrease'; deltaKcal: number; reason: string; weeklyChangeKg: number | null }
export function reviewTargets(input: { weights: { date: string; kg: number }[]; goal: string; kcal: number; bmr: number | null; sex: Sex; weightKg: number; avgIntake: number | null; daysLogged: number }): Review {
  const weeks = weeklyAverages(input.weights.map(w => ({ date: w.date, weightKg: w.kg }))).filter(w => w.n >= 2);
  if (weeks.length < 3) return { suggestion: 'keep', deltaKcal: 0, weeklyChangeKg: null, reason: 'Need at least 3 weeks with 2+ weigh-ins each before adjusting targets.' };
  const last = weeks.slice(-3); const change = (last[2].avg - last[0].avg) / 2; // kg per week
  const pct = (change / input.weightKg) * 100;
  const floor = Math.max(input.bmr ?? 0, calorieFloor(input.sex));
  const adherent = input.daysLogged >= 10 && input.avgIntake !== null && Math.abs(input.avgIntake - input.kcal) <= input.kcal * 0.1;
  if (input.goal === 'lose') {
    if (pct < -1) return { suggestion: 'increase', deltaKcal: 150, weeklyChangeKg: change, reason: 'Losing more than 1% of body weight per week — too fast. Eat a little more to protect muscle and energy.' };
    if (change > -0.1 && adherent && input.kcal - 100 >= floor) return { suggestion: 'decrease', deltaKcal: -100, weeklyChangeKg: change, reason: 'Weight stable for 3 weeks while following the target — a small 100 kcal step.' };
    if (change > -0.1 && !adherent) return { suggestion: 'keep', deltaKcal: 0, weeklyChangeKg: change, reason: 'Weight stable, but intake was not logged consistently — keep the target and log more days first.' };
  }
  if (input.goal === 'muscle') {
    if (change < 0.05 && adherent) return { suggestion: 'increase', deltaKcal: 100, weeklyChangeKg: change, reason: 'No weight gain for 3 weeks while on target — a small surplus step.' };
    if (pct > 0.5) return { suggestion: 'decrease', deltaKcal: -100, weeklyChangeKg: change, reason: 'Gaining faster than 0.5% per week — slow down to limit fat gain.' };
  }
  if ((input.goal === 'maintain' || input.goal === 'healthy') && Math.abs(pct) > 0.5 && adherent) return { suggestion: change > 0 ? 'decrease' : 'increase', deltaKcal: change > 0 ? -100 : 100, weeklyChangeKg: change, reason: 'Weight drifting more than 0.5% per week.' };
  return { suggestion: 'keep', deltaKcal: 0, weeklyChangeKg: change, reason: 'Progress is on track — keep the current targets.' };
}
