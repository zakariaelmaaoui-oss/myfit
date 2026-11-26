import { useEffect, useId, useRef, useState } from 'react';

// Original animated neon "shadow figure" demonstrations. Each exercise = 2 key poses; the figure eases between them.
// Joint order: head, shoulder, elbowA, handA, elbowB, handB, hip, kneeA, footA, kneeB, footB  (viewBox 0..100)
type J = [number, number][];
const POSES: Record<string, { a: J; b: J; period?: number; ground?: number }> = {
  pushup: { ground: 86,
    a: [[22, 56], [28, 62], [30, 72], [30, 84], [31, 72], [31, 84], [58, 66], [72, 72], [86, 80], [72, 72], [86, 80]],
    b: [[22, 70], [28, 75], [37, 80], [30, 84], [37, 80], [31, 84], [58, 76], [72, 79], [86, 82], [72, 79], [86, 82]] },
  squat: { ground: 92,
    a: [[50, 14], [50, 24], [46, 36], [52, 46], [54, 36], [60, 44], [50, 52], [50, 70], [50, 90], [52, 70], [52, 90]],
    b: [[44, 30], [46, 40], [58, 44], [72, 42], [60, 45], [74, 44], [36, 64], [56, 70], [50, 90], [58, 70], [52, 90]] },
  lunge: { ground: 92,
    a: [[50, 14], [50, 24], [48, 36], [48, 48], [52, 36], [52, 48], [50, 52], [52, 70], [52, 90], [50, 70], [48, 90]],
    b: [[50, 24], [50, 34], [48, 46], [48, 58], [52, 46], [52, 58], [50, 62], [66, 70], [68, 90], [40, 82], [26, 90]] },
  plank: { ground: 86, period: 2600,
    a: [[20, 60], [26, 64], [28, 74], [36, 84], [29, 74], [37, 84], [56, 66], [72, 72], [88, 80], [72, 72], [88, 80]],
    b: [[20, 61], [26, 65], [28, 74], [36, 84], [29, 74], [37, 84], [56, 66.5], [72, 72.5], [88, 80], [72, 72.5], [88, 80]] },
  jumping_jacks: { ground: 94, period: 900,
    a: [[50, 14], [50, 24], [44, 36], [42, 48], [56, 36], [58, 48], [50, 54], [47, 72], [46, 90], [53, 72], [54, 90]],
    b: [[50, 12], [50, 22], [38, 14], [32, 4], [62, 14], [68, 4], [50, 52], [40, 70], [32, 88], [60, 70], [68, 88]] },
  high_knees: { ground: 94, period: 700,
    a: [[50, 14], [50, 24], [44, 34], [48, 42], [56, 36], [52, 46], [50, 54], [44, 54], [44, 70], [53, 72], [54, 90]],
    b: [[50, 14], [50, 24], [44, 36], [48, 46], [56, 34], [52, 42], [50, 54], [47, 72], [46, 90], [56, 54], [56, 70]] },
  mountain_climbers: { ground: 86, period: 700,
    a: [[20, 52], [26, 58], [27, 70], [28, 84], [28, 70], [29, 84], [52, 64], [40, 72], [44, 82], [70, 72], [86, 80]],
    b: [[20, 52], [26, 58], [27, 70], [28, 84], [28, 70], [29, 84], [52, 64], [70, 72], [86, 80], [40, 72], [44, 82]] },
  glute_bridge: { ground: 88,
    a: [[16, 80], [24, 82], [32, 84], [40, 86], [32, 84], [40, 86], [50, 82], [64, 66], [72, 86], [64, 66], [72, 86]],
    b: [[16, 80], [24, 81], [32, 84], [40, 86], [32, 84], [40, 86], [48, 66], [64, 62], [72, 86], [64, 62], [72, 86]] },
  crunches: { ground: 88,
    a: [[18, 80], [26, 81], [32, 74], [28, 68], [32, 74], [28, 68], [48, 82], [62, 66], [72, 86], [62, 66], [72, 86]],
    b: [[26, 66], [32, 70], [36, 62], [30, 58], [36, 62], [30, 58], [48, 82], [62, 66], [72, 86], [62, 66], [72, 86]] },
  burpees: { ground: 90, period: 1600,
    a: [[50, 14], [50, 24], [44, 14], [40, 4], [56, 14], [60, 4], [50, 52], [48, 70], [48, 88], [52, 70], [52, 88]],
    b: [[22, 62], [28, 66], [30, 76], [30, 88], [31, 76], [31, 88], [56, 70], [70, 76], [86, 84], [70, 76], [86, 84]] },
  jump_rope: { ground: 94, period: 600,
    a: [[50, 16], [50, 26], [42, 38], [36, 46], [58, 38], [64, 46], [50, 56], [48, 74], [48, 92], [52, 74], [52, 92]],
    b: [[50, 12], [50, 22], [42, 34], [36, 42], [58, 34], [64, 42], [50, 52], [47, 70], [47, 86], [53, 70], [53, 86]] },
  pullup: { ground: 97,
    a: [[50, 30], [50, 40], [40, 24], [38, 8], [60, 24], [62, 8], [50, 66], [48, 82], [48, 96], [52, 82], [52, 96]],
    b: [[50, 12], [50, 22], [38, 22], [38, 8], [62, 22], [62, 8], [50, 48], [48, 64], [46, 78], [52, 64], [54, 78]] },
  running: { ground: 94, period: 700,
    a: [[54, 14], [52, 24], [44, 32], [46, 42], [60, 30], [64, 22], [50, 52], [60, 64], [54, 80], [42, 70], [34, 84]],
    b: [[54, 14], [52, 24], [60, 30], [64, 22], [44, 32], [46, 42], [50, 52], [42, 70], [34, 84], [60, 64], [54, 80]] },
};
const ALIAS: Record<string, string> = { wall_pushups: 'pushup', pushups: 'pushup', sumo_squats: 'squat', squats: 'squat', jump_squats: 'squat', wall_sit: 'squat',
  lunges: 'lunge', side_plank: 'plank', star_jumps: 'jumping_jacks', skater_jumps: 'jumping_jacks', jog_in_place: 'high_knees', butt_kicks: 'high_knees',
  march: 'high_knees', bicycle_crunches: 'crunches', leg_raises: 'crunches', russian_twists: 'crunches', dead_bug: 'crunches', donkey_kicks: 'glute_bridge',
  fire_hydrants: 'glute_bridge', running_fast: 'running', brisk_walk: 'running', walk_uphill: 'running', stairs: 'running', hiking: 'running' };
export const hasFigure = (id: string) => !!POSES[ALIAS[id] ?? id];

const BONES: [number, number][] = [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [1, 6], [6, 7], [7, 8], [6, 9], [9, 10]];
export function ExerciseFigure({ id, size = 160 }: { id: string; size?: number }) {
  const pose = POSES[ALIAS[id] ?? id] ?? POSES.squat; const period = pose.period ?? 1800;
  const [t, setT] = useState(0); const raf = useRef(0); const u = useId().replace(/:/g, '');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now(); const loop = (now: number) => { setT(((now - start) % period) / period); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf.current);
  }, [period]);
  const k = (1 - Math.cos(t * 2 * Math.PI)) / 2; // 0→1→0, eased
  const J = pose.a.map(([x, y], i) => [x + (pose.b[i][0] - x) * k, y + (pose.b[i][1] - y) * k]);
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id={`fig-g${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#c084fc" /></linearGradient>
      <filter id={`fig-glow${u}`}><feGaussianBlur stdDeviation="1.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
    <ellipse cx="50" cy={(pose.ground ?? 92) + 2} rx="36" ry="3" fill="rgba(139,92,246,.25)" />
    <line x1="8" x2="92" y1={(pose.ground ?? 92) + 1} y2={(pose.ground ?? 92) + 1} stroke="rgba(56,189,248,.3)" strokeDasharray="2 3" />
    {id === 'pullup' && <line x1="20" x2="80" y1="7" y2="7" stroke="#64748b" strokeWidth="2" />}
    <g filter={`url(#fig-glow${u})`} stroke={`url(#fig-g${u})`} strokeWidth="4.2" strokeLinecap="round" fill="none">
      {BONES.map(([a, b], i) => <line key={i} x1={J[a][0]} y1={J[a][1]} x2={J[b][0]} y2={J[b][1]} />)}
      <circle cx={J[0][0]} cy={J[0][1]} r="5.5" fill="rgba(8,12,26,.9)" />
    </g>
  </svg>;
}
