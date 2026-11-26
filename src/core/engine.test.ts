import { describe, it, expect } from 'vitest';
import { fakeSupabase } from './test/fakeSupabase';
import * as E from './engine';

const uid = 'u1'; const date = '2026-11-25'; // a Wednesday
const profile = { name: 'Zak', age: 28, sex: 'male' as const, height_cm: 178, weight_kg: 84, target_weight_kg: 76, goal: 'lose' as const, activity: 'light' as const,
  experience: 'beginner' as const, location: 'home' as const, equipment: [], training_days: 3, session_minutes: 30, limitations: null, diet: 'none', allergies: [],
  budget: 'low', cuisines: ['moroccan'], language: 'dar', title: null };

describe('engine (in-memory database)', () => {
  it('awakening → quests → logging → XP, without double rewards', async () => {
    const { client: sb, db } = fakeSupabase();
    const r = await E.saveProfile(sb, uid, profile, date);
    expect(r.targets.kcal).toBeGreaterThanOrEqual(1500); // safe floor for men
    expect(r.plan!.days).toHaveLength(3);
    const s0 = await E.syncDay(sb, uid, date);
    expect(s0.quests.find(q => q.key === 'workout')).toBeTruthy(); // Wednesday is a training day
    expect(s0.awards).toHaveLength(0);

    await E.logFood(sb, uid, date, 'breakfast', [{ food_id: 'egg', grams: 100 }, { name: 'Sardine sandwich', kcal: 368, protein: 24 }]);
    const foods = db.sf_food_logs;
    expect(foods[0].source).toBe('database'); expect(foods[0].kcal).toBeGreaterThan(100); expect(foods[1].estimate).toBe(true);
    await E.logWater(sb, uid, date, 3000);
    const s1 = await E.syncDay(sb, uid, date);
    expect(s1.completed).toContain('Drink enough water');
    expect(s1.awards.map(a => a.kind).sort()).toEqual(['achievement', 'meal', 'quest']);
    const again = await E.syncDay(sb, uid, date);
    expect(again.awards).toHaveLength(0); // idempotent
    const st = await E.getStats(sb, uid); expect(st.xp).toBe(10 + 5 + 10);
  });

  it('workout session → progression state and XP; PRs after a baseline', async () => {
    const { client: sb, db } = fakeSupabase();
    await E.saveProfile(sb, uid, profile, date);
    const w = await E.todaysWorkout(sb, uid, date, (await E.getProfile(sb, uid))!);
    expect(w.items.length).toBeGreaterThanOrEqual(3);
    const ses = await E.startSession(sb, uid, date, w.day!.name, w.day!.dow);
    const first = w.items[0];
    const sets = Array.from({ length: first.sets }, () => ({ exercise_id: first.exercise_id, reps: first.reps, seconds: first.seconds }));
    const l = await E.logSets(sb, uid, date, sets, ses.id);
    expect(l.prs).toHaveLength(0); // first values are baselines
    const fin = await E.finishSession(sb, uid, ses.id, { rpe: 7 });
    expect(fin.xp).toBeGreaterThan(0); expect(fin.ratio).toBeLessThan(1);
    expect(db.sf_exercise_progress.find((p: any) => p.exercise_id === first.exercise_id).good_streak).toBe(1);
    await expect(E.finishSession(sb, uid, ses.id, { rpe: 7 })).rejects.toThrow(/already/);
    const s = await E.syncDay(sb, uid, date);
    expect(s.completed.some(t => t.startsWith('Clear today'))).toBe(true);
    expect(s.achievements).toContain('First Dungeon');
    const more = await E.logSets(sb, uid, date, [{ exercise_id: first.exercise_id, reps: (first.reps ?? 0) + 5, seconds: first.seconds ? first.seconds + 10 : null }]);
    expect(more.prs.length).toBe(1);
  });

  it('only custom quests can be ticked by hand, max 3 per day', async () => {
    const { client: sb } = fakeSupabase();
    await E.saveProfile(sb, uid, profile, date);
    const qs = await E.ensureQuests(sb, uid, date);
    await expect(E.completeCustomQuest(sb, uid, qs[0].id)).rejects.toThrow(/automatically/);
    const c = await E.createCustomQuest(sb, uid, date, { title: 'Cook at home', xp: 999 }, 'ai');
    expect(c.xp).toBe(30);
    expect((await E.completeCustomQuest(sb, uid, c.id))!.xp).toBe(30);
    await E.createCustomQuest(sb, uid, date, { title: 'b' }, 'ai'); await E.createCustomQuest(sb, uid, date, { title: 'c' }, 'ai');
    await expect(E.createCustomQuest(sb, uid, date, { title: 'd' }, 'ai')).rejects.toThrow(/Maximum/);
  });

  it('rejects unknown foods / exercises instead of pretending', async () => {
    const { client: sb } = fakeSupabase();
    await expect(E.logFood(sb, uid, date, 'lunch', [{ food_id: 'nope', grams: 100 }])).rejects.toThrow(/Unknown food/);
    await expect(E.logSets(sb, uid, date, [{ exercise_id: 'flying', reps: 3 }])).rejects.toThrow(/Unknown exercise/);
    await expect(E.logFood(sb, uid, date, 'brunch', [{ name: 'x', kcal: 1 }])).rejects.toThrow(/meal/);
  });
});
describe('food lookup', () => {
  it('matches generic names safely', () => {
    expect(E.lookupFood('egg')!.id).toBe('egg');
    expect(E.lookupFood('eggs')!.id).toBe('egg');
    expect(E.lookupFood('white bread')!.id).toBe('bread_white');
    expect(E.lookupFood('sardines canned oil')!.id).toBe('sardine_canned_oil');
    expect(E.lookupFood('chicken tagine with olives')).toBeNull();
  });
});
