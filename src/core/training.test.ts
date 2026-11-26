import { describe, it, expect } from 'vitest';
import { generatePlan, evaluate, initialPrescription, planWeek, isDeloadWeek, todaysDose } from './training';
import { getEx } from '../data/exercises';

const base = { experience: 'beginner' as const, location: 'home' as const, equipment: [] as string[], trainingDays: 3, sessionMinutes: 30, goal: 'lose' };
describe('plan generation', () => {
  it('home beginner with no equipment only gets bodyweight moves', () => {
    const p = generatePlan(base);
    expect(p.days.map(d => d.dow)).toEqual([1, 3, 5]);
    for (const d of p.days) { expect(d.exercises.length).toBeGreaterThanOrEqual(3); for (const id of d.exercises) expect(getEx(id)!.equip).toContain('none'); }
  });
  it('gym plans use equipment and respect days', () => {
    const p = generatePlan({ ...base, location: 'gym', experience: 'intermediate', trainingDays: 5, sessionMinutes: 45 });
    expect(p.days).toHaveLength(5);
    expect(p.days.flatMap(d => d.exercises).some(id => !getEx(id)!.equip.includes('none'))).toBe(true);
  });
  it('avoids jumping moves when knees are a limitation', () => {
    const p = generatePlan({ ...base, experience: 'advanced', trainingDays: 6, limitations: 'knee pain' });
    expect(p.days.flatMap(d => d.exercises)).not.toContain('jump_squat');
    expect(p.days.flatMap(d => d.exercises)).not.toContain('burpees');
  });
  it('never has duplicate exercises in one session', () => {
    for (const n of [2, 3, 4, 5, 6]) for (const d of generatePlan({ ...base, trainingDays: n, sessionMinutes: 60 }).days) expect(new Set(d.exercises).size).toBe(d.exercises.length);
  });
});

describe('adaptive progression', () => {
  const now = '2026-11-26T18:00:00Z';
  const st = () => ({ ...initialPrescription('pushup', 'intermediate'), good_streak: 0, bad_streak: 0 }); // 3 × 12
  const hit = [{ reps: 12 }, { reps: 12 }, { reps: 12 }];
  it('progresses only after 2 good sessions', () => {
    const a = evaluate(st(), hit, 7, { now });
    expect(a.change).toBe('hold'); expect(a.state.good_streak).toBe(1);
    const b = evaluate(a.state, hit, 7, { now });
    expect(b.change).toBe('progress'); expect(b.state.reps).toBe(14);
  });
  it('does not progress when RPE is 9+', () => {
    const a = evaluate({ ...st(), good_streak: 1 }, hit, 9, { now });
    expect(a.change).toBe('hold'); expect(a.state.good_streak).toBe(0); expect(a.state.bad_streak).toBe(1);
  });
  it('steps back after 2 bad sessions', () => {
    const miss = [{ reps: 8 }, { reps: 6 }];
    const a = evaluate(st(), miss, 8, { now }); const b = evaluate(a.state, miss, 8, { now });
    expect(b.change).toBe('regress'); expect(b.state.reps).toBe(10);
  });
  it('holds when recovery is poor or in a deload week', () => {
    expect(evaluate({ ...st(), good_streak: 1 }, hit, 6, { now, recoveryPoor: true }).change).toBe('hold');
    expect(evaluate({ ...st(), good_streak: 1 }, hit, 6, { now, deload: true }).change).toBe('hold');
  });
  it('waits 48 h after the last change', () => {
    const r = evaluate({ ...st(), good_streak: 1, last_change_at: '2026-11-26T08:00:00Z' }, hit, 7, { now });
    expect(r.change).toBe('hold');
  });
  it('adds load for weighted moves at the top of the range', () => {
    const s = { exercise_id: 'db_row', sets: 3, reps: 12, seconds: null, load_kg: 10, good_streak: 1, bad_streak: 0 };
    const r = evaluate(s, [{ reps: 12 }, { reps: 12 }, { reps: 12 }], 7, { now });
    expect(r.state.load_kg).toBe(12); expect(r.state.reps).toBe(8);
  });
  it('timed moves add seconds', () => {
    const s = { ...initialPrescription('plank', 'beginner'), good_streak: 1, bad_streak: 0 };
    expect(evaluate(s, [{ seconds: 20 }, { seconds: 20 }, { seconds: 25 }], 6, { now }).state.seconds).toBe(25);
  });
  it('deload every 5th week drops one set', () => {
    expect(planWeek('2026-11-01T10:00:00Z', '2026-11-29')).toBe(5); expect(isDeloadWeek(5)).toBe(true);
    expect(todaysDose({ exercise_id: 'pushup', sets: 3, reps: 12, seconds: null, load_kg: null }, true).sets).toBe(2);
  });
});
