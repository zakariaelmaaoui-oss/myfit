// Live step counting during a walk, using the phone's motion sensor (DeviceMotion).
// Runs while MyFit is open; the count is kept in localStorage so it survives page changes.
import { StepDetector } from './activity';

const K_START = 'myfit:walk-start', K_STEPS = 'myfit:walk-steps', K_SENSOR = 'myfit:walk-sensor';
type Listener = () => void;
const listeners = new Set<Listener>();
let detector: StepDetector | null = null;
let attached = false;

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
const notify = () => listeners.forEach(l => l());

function onMotion(e: DeviceMotionEvent) {
  const a = e.accelerationIncludingGravity; if (!a || a.x === null || a.y === null || a.z === null) return;
  if (!detector) { detector = new StepDetector(); detector.steps = Number(ls.get(K_STEPS) || 0); }
  if (ls.get(K_SENSOR) !== 'on') { ls.set(K_SENSOR, 'on'); notify(); }
  if (detector.feed(a.x, a.y, a.z, performance.now())) { ls.set(K_STEPS, String(detector.steps)); notify(); }
}
function attach() { if (attached || typeof window === 'undefined') return; window.addEventListener('devicemotion', onMotion); attached = true; }
function detach() { if (!attached) return; window.removeEventListener('devicemotion', onMotion); attached = false; detector = null; }

export type SensorState = 'on' | 'waiting' | 'denied' | 'unsupported';
export const walkSession = {
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  startedAt(): number | null { const v = ls.get(K_START); return v ? Number(v) : null; },
  steps(): number { return Number(ls.get(K_STEPS) || 0); },
  sensor(): SensorState { const v = ls.get(K_SENSOR); return (v as SensorState) || 'waiting'; },
  /** Must be called from a tap (iOS asks for motion permission). */
  async start() {
    const now = Date.now(); ls.set(K_START, String(now)); ls.set(K_STEPS, '0'); ls.set(K_SENSOR, 'waiting'); detector = null;
    if (typeof DeviceMotionEvent === 'undefined') { ls.set(K_SENSOR, 'unsupported'); notify(); return; }
    const req = (DeviceMotionEvent as any).requestPermission;
    if (typeof req === 'function') {
      try { if ((await req.call(DeviceMotionEvent)) !== 'granted') { ls.set(K_SENSOR, 'denied'); notify(); return; } }
      catch { ls.set(K_SENSOR, 'denied'); notify(); return; }
    }
    attach(); notify();
    // Desktop browsers expose DeviceMotionEvent but never fire it.
    setTimeout(() => { if (ls.get(K_SENSOR) === 'waiting' && walkSession.startedAt() === now) { ls.set(K_SENSOR, 'unsupported'); notify(); } }, 4000);
  },
  stop(): { startedAt: number | null; steps: number; sensorWorked: boolean } {
    const r = { startedAt: walkSession.startedAt(), steps: walkSession.steps(), sensorWorked: ls.get(K_SENSOR) === 'on' };
    detach(); ls.del(K_START); ls.del(K_STEPS); ls.del(K_SENSOR); notify(); return r;
  },
  /** After a reload during a walk, resume listening (works without a new permission prompt on Android). */
  resume() { if (walkSession.startedAt() && walkSession.sensor() === 'on') attach(); },
};
