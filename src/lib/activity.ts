// Steps, distance and calories burned — deterministic, testable estimates.
//  * Step detection: peaks in the phone's acceleration magnitude (DeviceMotion), smoothed,
//    compared with a slow baseline (gravity), with a minimum 0.3 s between steps.
//  * Stride length: height × 0.413 (women) / 0.415 (men) — common pedometer approximation.
//  * Energy: kcal = MET × weight (kg) × hours, MET from walking speed
//    (Compendium of Physical Activities 2011, walking codes 17150–17231), linear in between.
import { round, type Sex } from './nutrition';

export class StepDetector {
  private fast = 9.81; private slow = 9.81; private above = false; private lastStep = -Infinity; private started = false;
  steps = 0;
  constructor(private threshold = 1.1, private minGapMs = 300) {}
  /** Feed one accelerometer sample (m/s², including gravity). Returns true when a step is counted. */
  feed(x: number, y: number, z: number, tMs: number): boolean {
    const m = Math.sqrt(x * x + y * y + z * z);
    if (!this.started) { this.fast = this.slow = m; this.started = true; return false; }
    this.fast += 0.25 * (m - this.fast);   // smooths out jitter
    this.slow += 0.02 * (m - this.slow);   // follows gravity / phone orientation
    const d = this.fast - this.slow;
    if (!this.above && d > this.threshold) {
      this.above = true;
      if (tMs - this.lastStep >= this.minGapMs) { this.lastStep = tMs; this.steps++; return true; }
    } else if (this.above && d < this.threshold * 0.4) this.above = false;
    return false;
  }
}

export function strideMeters(heightCm: number, sex: Sex): number {
  const f = sex === 'male' ? 0.415 : sex === 'female' ? 0.413 : 0.414;
  return round((heightCm * f) / 100, 3);
}

const MET_TABLE: [number, number][] = [[3.2, 2.8], [4.0, 3.0], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 7.0]];
export const DEFAULT_WALK_MET = 3.5; // walking ~4.8 km/h when speed is unknown
export function walkingMet(speedKmh: number | null): number {
  if (speedKmh === null || !isFinite(speedKmh) || speedKmh <= 0) return DEFAULT_WALK_MET;
  if (speedKmh < 3.2) return 2.0 + (speedKmh / 3.2) * 0.8;
  if (speedKmh >= 7.2) return 7.0;
  for (let i = 0; i < MET_TABLE.length - 1; i++) {
    const [s0, m0] = MET_TABLE[i], [s1, m1] = MET_TABLE[i + 1];
    if (speedKmh >= s0 && speedKmh < s1) return round(m0 + ((speedKmh - s0) / (s1 - s0)) * (m1 - m0), 2);
  }
  return DEFAULT_WALK_MET;
}

export interface WalkEstimate { distanceM: number | null; speedKmh: number | null; met: number; kcal: number }
/** Estimate distance and calories for a walk. Steps are optional (null → MET 3.5 is assumed). */
export function estimateWalk(p: { minutes: number; steps: number | null; weightKg: number; heightCm: number; sex: Sex }): WalkEstimate {
  const hours = Math.max(0, p.minutes) / 60;
  const distanceM = p.steps && p.steps > 0 ? round(p.steps * strideMeters(p.heightCm, p.sex)) : null;
  const speedKmh = distanceM !== null && hours > 0 ? round(distanceM / 1000 / hours, 1) : null;
  const met = walkingMet(speedKmh);
  return { distanceM, speedKmh, met, kcal: round(met * p.weightKg * hours) };
}
