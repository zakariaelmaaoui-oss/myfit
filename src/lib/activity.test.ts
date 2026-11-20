import { describe, it, expect } from 'vitest';
import { StepDetector, estimateWalk, strideMeters, walkingMet } from './activity';

describe('step detector', () => {
  it('counts ~2 steps/s on a walking-like signal', () => {
    const d = new StepDetector();
    for (let t = 0; t <= 10000; t += 20) { const a = 9.81 + 3 * Math.sin(2 * Math.PI * 2 * (t / 1000)); d.feed(0, 0, a, t); }
    expect(d.steps).toBeGreaterThanOrEqual(18); expect(d.steps).toBeLessThanOrEqual(21);
  });
  it('ignores small hand jitter', () => {
    const d = new StepDetector();
    for (let t = 0; t <= 10000; t += 20) d.feed(0.1 * Math.sin(t), 0, 9.81 + 0.3 * Math.sin(2 * Math.PI * 5 * (t / 1000)), t);
    expect(d.steps).toBe(0);
  });
  it('never counts faster than the minimum gap', () => {
    const d = new StepDetector();
    for (let t = 0; t <= 5000; t += 10) d.feed(0, 0, 9.81 + 4 * Math.sin(2 * Math.PI * 8 * (t / 1000)), t);
    expect(d.steps).toBeLessThanOrEqual(5000 / 300 + 1);
  });
});

describe('walking energy', () => {
  it('stride', () => { expect(strideMeters(165, 'female')).toBeCloseTo(0.681, 3); });
  it('MET table (Compendium)', () => {
    expect(walkingMet(4.8)).toBe(3.5); expect(walkingMet(6.4)).toBe(5.0); expect(walkingMet(null)).toBe(3.5);
    expect(walkingMet(5.2)).toBeCloseTo(3.9, 1);
  });
  it('30 min, no steps, 70 kg → 3.5 × 70 × 0.5 = 123 kcal', () => {
    expect(estimateWalk({ minutes: 30, steps: null, weightKg: 70, heightCm: 165, sex: 'female' }).kcal).toBe(123);
  });
  it('steps give distance and speed', () => {
    const e = estimateWalk({ minutes: 30, steps: 3500, weightKg: 70, heightCm: 165, sex: 'female' });
    expect(e.distanceM).toBe(Math.round(3500 * 0.681));
    expect(e.speedKmh).toBeCloseTo(4.8, 1);
  });
});

import { activityKcal, workoutKcal } from './activity';
import { WORKOUTS, getExercise, REST_MET } from '../data/sport';
describe('exercise calories', () => {
  it('MET × kg × h', () => { expect(activityKcal(8, 70, 30)).toBe(280); expect(activityKcal(3.8, 60, 10)).toBe(38); });
  it('workout sums blocks', () => {
    expect(workoutKcal([{ met: 8, sec: 1800 }, { met: 1.5, sec: 600 }], 70)).toEqual({ kcal: 280 + 18, minutes: 40 });
  });
  it('every workout uses known exercises', () => {
    for (const w of WORKOUTS) for (const b of w.blocks) expect(b.ex === 'rest' || !!getExercise(b.ex), `${w.id}:${b.ex}`).toBe(true);
    expect(REST_MET).toBeLessThan(2);
  });
});
