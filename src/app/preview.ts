// DESIGN PREVIEW DATA — shown only in the design preview (banner on screen). Replaced by real user data in the next phase.
import { levelFromXp, rankFromLevel, totalXpForLevel } from '../lib/rpg';

const xp = totalXpForLevel(9) + 1940;
const lv = levelFromXp(xp);
export const PREVIEW = {
  hunter: { name: 'Zakaria', title: 'Shadow Initiate', xp, level: lv.level, into: lv.into, need: lv.need, rank: rankFromLevel(lv.level), streak: 12, bestStreak: 19 },
  attributes: [{ label: 'Strength', value: 46 }, { label: 'Endurance', value: 58 }, { label: 'Discipline', value: 72 }, { label: 'Consistency', value: 64 }, { label: 'Fitness', value: 55 }],
  today: { kcal: 1240, target: 1950, protein: 96, proteinTarget: 140, carbs: 128, carbsTarget: 210, fat: 41, fatTarget: 65, waterMl: 1500, waterTarget: 2600, steps: 6420 },
  quests: [
    { id: 'q1', title: 'Complete today’s workout', detail: 'Push day · 35 min', xp: 80, done: false, progress: 0, target: 1, diff: 'B' },
    { id: 'q2', title: 'Push-ups', detail: '3 × 12 reps', xp: 25, done: true, progress: 36, target: 36, diff: 'C' },
    { id: 'q3', title: 'Squats', detail: '3 × 15 reps', xp: 25, done: false, progress: 30, target: 45, diff: 'C' },
    { id: 'q4', title: 'Walk 30 minutes', detail: '≈ 4,000 steps', xp: 20, done: false, progress: 18, target: 30, diff: 'D' },
    { id: 'q5', title: 'Record all meals', detail: '3 of 4 logged', xp: 20, done: false, progress: 3, target: 4, diff: 'D' },
    { id: 'q6', title: 'Reach protein target', detail: '96 / 140 g', xp: 20, done: false, progress: 96, target: 140, diff: 'C' },
    { id: 'q7', title: 'Drink enough water', detail: '1.5 / 2.6 L', xp: 10, done: false, progress: 1500, target: 2600, diff: 'E' },
    { id: 'q8', title: 'Evening evaluation', detail: 'Tell THE SYSTEM how today went', xp: 15, done: false, progress: 0, target: 1, diff: 'E' },
  ],
  weekly: [
    { title: 'Train 4 times this week', progress: 3, target: 4, xp: 150 },
    { title: 'Hit protein 5 days', progress: 3, target: 5, xp: 120 },
    { title: '50,000 steps', progress: 38200, target: 50000, xp: 100 },
  ],
  meals: [
    { meal: 'Breakfast', items: [{ name: '2 eggs', kcal: 156, p: 12 }, { name: 'Sardine sandwich (half baguette)', kcal: 368, p: 24, estimate: true }] },
    { meal: 'Lunch', items: [{ name: 'Chicken tagine with vegetables', kcal: 520, p: 46 }, { name: 'Moroccan salad', kcal: 96, p: 2 }] },
    { meal: 'Snack', items: [{ name: 'Greek yogurt + walnuts', kcal: 100, p: 12 }] },
    { meal: 'Dinner', items: [] as { name: string; kcal: number; p: number; estimate?: boolean }[] },
  ],
  workout: {
    name: 'PUSH PROTOCOL', day: 'Day 3 · Week 2', minutes: 35, xp: 80,
    exercises: [
      { id: 'pushup', name: 'Push-ups', sets: 3, reps: '12', rest: 60, muscles: 'Chest · Triceps · Shoulders', diff: 2, trend: '+2 reps since last week' },
      { id: 'squat', name: 'Bodyweight squats', sets: 3, reps: '15', rest: 60, muscles: 'Quads · Glutes', diff: 1, trend: 'Hold — great form, recover first' },
      { id: 'plank', name: 'Plank', sets: 3, reps: '40 s', rest: 45, muscles: 'Core', diff: 2, trend: '+5 s since last week' },
      { id: 'mountain_climbers', name: 'Mountain climbers', sets: 3, reps: '30 s', rest: 45, muscles: 'Core · Cardio', diff: 2, trend: 'New this week' },
      { id: 'glute_bridge', name: 'Glute bridge', sets: 3, reps: '15', rest: 45, muscles: 'Glutes · Hamstrings', diff: 1, trend: 'Hold' },
    ],
    week: [{ d: 'MON', t: 'Push', done: true }, { d: 'TUE', t: 'Cardio', done: true }, { d: 'WED', t: 'Push', today: true }, { d: 'THU', t: 'Rest' }, { d: 'FRI', t: 'Legs' }, { d: 'SAT', t: 'Walk' }, { d: 'SUN', t: 'Rest' }],
  },
  chat: [
    { role: 'system', text: 'Good morning, Hunter. 8 quests are waiting. Your old self is waiting for you to quit — don’t give him that satisfaction.' },
    { role: 'user', text: 'klit jouj bidat w sandwich dyal sardine f lftour' },
    { role: 'action', title: 'FOOD LOGGED · BREAKFAST', lines: ['2 eggs — 156 kcal · 12 g protein', 'Sardine sandwich, ½ baguette — 368 kcal · 24 g protein (estimate)'], ok: true },
    { role: 'system', text: 'Tsjjel. Rak f 1,240 / 1,950 kcal. B9at lik 710 kcal w 44 g dyal protein. F l3cha: tajine djaj b khodra wla omelette b 3 bidat w salade.' },
    { role: 'user', text: 'Add 20 push-ups' },
    { role: 'action', title: 'EXERCISE RECORDED', lines: ['Push-ups — 1 set × 20 reps', 'Quest “Push-ups” 36 / 36 ✔  +25 XP'], ok: true },
  ],
  weights: [84.2, 83.9, 83.6, 83.8, 83.1, 82.7, 82.4, 82.2],
  weightLabels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
  kcalWeek: [1820, 1950, 1700, 2100, 1880, 1760, 1240],
  achievements: [
    { icon: 'flame', name: '7-Day Flame', got: true }, { icon: 'sword', name: 'First Dungeon', got: true }, { icon: 'trophy', name: 'Protein Hunter', got: true },
    { icon: 'bolt', name: '100 Push-ups', got: false }, { icon: 'shield', name: 'Iron Discipline', got: false }, { icon: 'star', name: 'Rank C', got: false },
  ],
};
