import { describe, it, expect } from 'vitest';
import { buildDailyQuests, questProgress, dayCleared, streak, attributeScore, challengeProgress } from './game';
import { addDays } from '../lib/nutrition';

const empty = { foods: [], waterMl: 0, sets: [], sessionsCompleted: 0, checkin: false };
describe('quests', () => {
  it('training day has a workout quest, rest day has recovery', () => {
    const train = buildDailyQuests({ planDay: { dow: 1, focus: 'full', name: 'X', exercises: ['squat', 'pushup', 'plank'] }, prescriptions: { squat: { exercise_id: 'squat', sets: 3, reps: 12, seconds: null, load_kg: null }, pushup: { exercise_id: 'pushup', sets: 3, reps: 6, seconds: null, load_kg: null } }, proteinTarget: 120, waterTarget: 2500, experience: 'beginner', sessionMinutes: 30 });
    expect(train.map(q => q.key)).toEqual(['workout', 'ex:squat', 'ex:pushup', 'walk', 'meals', 'protein', 'water', 'evaluation']);
    expect(train.find(q => q.key === 'ex:squat')!.target).toBe(36);
    const rest = buildDailyQuests({ planDay: null, prescriptions: {}, proteinTarget: null, waterTarget: 2000, experience: 'beginner', sessionMinutes: 30 });
    expect(rest.map(q => q.key)).toEqual(['walk', 'mobility', 'meals', 'water', 'evaluation']);
  });
  it('no quest ever rewards eating less', () => {
    const qs = buildDailyQuests({ planDay: null, prescriptions: {}, proteinTarget: 100, waterTarget: 2000, experience: 'advanced', sessionMinutes: 60 });
    expect(qs.some(q => /under|below|skip|fast/i.test(q.title))).toBe(false);
  });
  it('progress comes from real logs', () => {
    const d = { ...empty, foods: [{ meal: 'breakfast', kcal: 300, protein: 20 }, { meal: 'lunch', kcal: 600, protein: 40 }, { meal: 'lunch', kcal: 100, protein: 5 }],
      waterMl: 1500, sets: [{ exercise_id: 'squat', reps: 12, seconds: null }, { exercise_id: 'squat', reps: 10, seconds: null }, { exercise_id: 'brisk_walk', reps: null, seconds: 1260 }] };
    expect(questProgress({ kind: 'meals' }, d)).toBe(2);
    expect(questProgress({ kind: 'protein' }, d)).toBe(65);
    expect(questProgress({ kind: 'exercise', meta: { exercise_id: 'squat' } }, d)).toBe(22);
    expect(questProgress({ kind: 'walk' }, d)).toBe(21);
    expect(questProgress({ kind: 'custom' }, d)).toBeNull();
  });
});
describe('streak & attributes', () => {
  it('counts consecutive cleared days', () => {
    const m = new Map([['2026-11-26', false], ['2026-11-25', true], ['2026-11-24', true], ['2026-11-22', true]]);
    expect(streak(m, '2026-11-26', addDays)).toBe(2);
    expect(dayCleared([{ status: 'done' }, { status: 'done' }, { status: 'active' }])).toBe(true);
    expect(dayCleared([])).toBe(false);
  });
  it('attribute score grows and caps', () => {
    expect(attributeScore(0)).toBe(10); expect(attributeScore(400)).toBeGreaterThan(attributeScore(100)); expect(attributeScore(1e9)).toBe(99);
  });
  it('weekly challenge progress', () => {
    const w = { days: [{ date: 'a', protein: 130, meals: 3, sessions: 1, cardioMin: 30 }, { date: 'b', protein: 90, meals: 1, sessions: 2, cardioMin: 45 }] };
    expect(challengeProgress('train', w, 120)).toBe(2); expect(challengeProgress('protein', w, 120)).toBe(1); expect(challengeProgress('log', w, 120)).toBe(1); expect(challengeProgress('cardio', w, 120)).toBe(75);
  });
});
