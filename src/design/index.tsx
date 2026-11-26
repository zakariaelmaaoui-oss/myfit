import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

// ---------------- Icons (original line icons) ----------------
const P: Record<string, ReactNode> = {
  home: <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  system: <><path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="M12 22V12M3 7l9 5 9-5" /></>,
  food: <><path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18" /><path d="M18 3c-2 0-3 2.5-3 6s1 5 3 5v7" /></>,
  book: <><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h5z" /></>,
  sword: <><path d="M14.5 3H21v6.5L10 20.5 3.5 14z" /><path d="m6 17-3 3M8 15l1 1" /></>,
  quest: <><path d="M6 3h12v18l-6-4-6 4z" /><path d="m9 9 2 2 4-4" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />, flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />, check: <path d="m5 12 5 5 9-10" />, plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M4 12 20 4l-6 16-3-7z" />, mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>, star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  next: <path d="m9 18 6-6-6-6" />, back: <path d="m15 18-6-6 6-6" />, play: <path d="M7 4v16l13-8z" />, pause: <path d="M8 4v16M16 4v16" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  scale: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a5 5 0 0 1 8 0l-3 3" /></>, gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  heart: <path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" />, trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H4a4 4 0 0 0 4 4M16 6h4a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6" /></>,
};
export function Icon({ n, s = 20, className = '', sw = 1.8 }: { n: string; s?: number; className?: string; sw?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{P[n]}</svg>;
}

// ---------------- Original emblem: a shadow blade inside a hex sigil ----------------
export function ShadowEmblem({ s = 40, className = '' }: { s?: number; className?: string }) {
  const u = useId().replace(/:/g, '');
  return <svg width={s} height={s} viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <linearGradient id={`emb-g${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#a855f7" /></linearGradient>
      <filter id={`emb-glow${u}`}><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <g filter={`url(#emb-glow${u})`} fill="none" stroke={`url(#emb-g${u})`} strokeWidth="2.2" strokeLinejoin="round">
      <path d="M32 4 56 18v28L32 60 8 46V18z" opacity=".9" />
      <path d="M32 12 49 22v20L32 52 15 42V22z" opacity=".35" />
      <path d="M38 14 24 36h8l-6 16 16-24h-8z" fill={`url(#emb-g${u})`} fillOpacity=".25" />
    </g>
  </svg>;
}

// ---------------- Holographic panel ----------------
export function Holo({ title, right, violet, className = '', children, scan }: { title?: ReactNode; right?: ReactNode; violet?: boolean; className?: string; children: ReactNode; scan?: boolean }) {
  return <section className={`holo ${violet ? 'violet' : ''} ${className}`}>
    <div className="corners"><i /><i /><i /><i /></div>
    {scan && <div className="scanline" />}
    {(title || right) && <div className="relative flex items-center justify-between gap-3 mb-3"><span className="panel-title">{title}</span>{right}</div>}
    <div className="relative">{children}</div>
  </section>;
}

// ---------------- Rank badge (hexagon) ----------------
export const RANK_COLORS: Record<string, string> = { E: '#94a3b8', D: '#34d399', C: '#38bdf8', B: '#8b5cf6', A: '#f59e0b', S: '#f43f5e' };
export function RankBadge({ rank, s = 64 }: { rank: string; s?: number }) {
  const c = RANK_COLORS[rank] ?? '#38bdf8';
  return <div className="relative grid place-items-center animate-floaty" style={{ width: s, height: s }}>
    <svg width={s} height={s} viewBox="0 0 64 64" className="absolute inset-0" style={{ filter: `drop-shadow(0 0 10px ${c})` }}>
      <path d="M32 3 57 17.5v29L32 61 7 46.5v-29z" fill={`${c}22`} stroke={c} strokeWidth="2.5" />
      <path d="M32 10 51 21v22L32 54 13 43V21z" fill="none" stroke={c} strokeOpacity=".4" strokeWidth="1" />
    </svg>
    <span className="relative display font-black" style={{ color: c, fontSize: s * 0.42, textShadow: `0 0 14px ${c}` }}>{rank}</span>
  </div>;
}

// ---------------- Bars, rings, radar ----------------
export function XPBar({ value, max, label, sub }: { value: number; max: number; label?: string; sub?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(max > 0 ? Math.min(100, (value / max) * 100) : 0)); return () => cancelAnimationFrame(id); }, [value, max]);
  return <div>
    {(label || sub) && <div className="flex justify-between mb-1.5"><span className="label text-neon-cyan">{label}</span><span className="label">{sub}</span></div>}
    <div className="bar h-3"><i style={{ width: `${w}%` }} /></div>
  </div>;
}

export function StatBar({ label, value, color = '#38bdf8', icon }: { label: string; value: number; color?: string; icon?: string }) {
  return <div className="flex items-center gap-3">
    {icon && <span className="grid place-items-center w-8 h-8 rounded-lg" style={{ background: `${color}1f`, color, boxShadow: `0 0 12px ${color}44` }}><Icon n={icon} s={16} /></span>}
    <div className="flex-1 min-w-0"><div className="flex justify-between"><span className="label">{label}</span><span className="display text-sm" style={{ color }}>{value}</span></div>
      <div className="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${value}%`, background: color, boxShadow: `0 0 10px ${color}` }} /></div></div>
  </div>;
}

export function NeonRing({ value, max, size = 140, stroke = 10, children, color }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const u = useId().replace(/:/g, ''); const strokeC = color ?? `url(#ring-g${u})`;
  const r = (size - stroke) / 2 - 4; const c = 2 * Math.PI * r; const pct = max > 0 ? Math.min(1, value / max) : 0;
  return <div className="relative grid place-items-center" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90">
      <defs><linearGradient id={`ring-g${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(30,41,59,.9)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 3} stroke="rgba(56,189,248,.15)" strokeWidth="1" fill="none" strokeDasharray="2 6" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={strokeC} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 6px rgba(56,189,248,.8))' }} />
    </svg>
    <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
  </div>;
}

/** Pentagon radar for the 5 hunter attributes (0–100). */
export function Radar({ stats, size = 220 }: { stats: { label: string; value: number }[]; size?: number }) {
  const u = useId().replace(/:/g, ''); const cx = size / 2 + 20, cy = size / 2 + 6, R = size * 0.34; const n = stats.length;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const poly = (v: (i: number) => number) => stats.map((_, i) => pt(i, v(i)).join(',')).join(' ');
  return <svg width="100%" viewBox={`0 0 ${size + 40} ${size + 12}`} style={{ maxWidth: size + 40 }} aria-label="Hunter attributes">
    <defs><linearGradient id={`rad-g${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" stopOpacity=".55" /><stop offset="1" stopColor="#a855f7" stopOpacity=".55" /></linearGradient></defs>
    {[0.25, 0.5, 0.75, 1].map(k => <polygon key={k} points={poly(() => k)} fill="none" stroke="rgba(56,189,248,.18)" />)}
    {stats.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(56,189,248,.15)" />; })}
    <polygon points={poly(i => stats[i].value / 100)} fill={`url(#rad-g${u})`} stroke="#7dd3fc" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,.7))' }} />
    {stats.map((s, i) => { const [x, y] = pt(i, 1.2); return <g key={s.label}><text x={x} y={y} textAnchor="middle" fill="#93c5fd" fontSize="9" fontFamily="Rajdhani" fontWeight="700" letterSpacing="1.5">{s.label.toUpperCase()}</text>
      <text x={x} y={y + 11} textAnchor="middle" fill="#e0f2fe" fontSize="10" fontFamily="Orbitron">{s.value}</text></g>; })}
  </svg>;
}

/** Neon area line for weight / calories trends. */
export function NeonLine({ values, labels, height = 150, unit = '' }: { values: number[]; labels: string[]; height?: number; unit?: string }) {
  const u = useId().replace(/:/g, ''); const W = 320, H = height, P = 16; const min = Math.min(...values), max = Math.max(...values); const span = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, values.length - 1); const y = (v: number) => H - 22 - ((v - min) / span) * (H - 52);
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
    <defs><linearGradient id={`nl-f${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".45" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></linearGradient>
      <linearGradient id={`nl-s${u}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#e879f9" /></linearGradient></defs>
    <path d={`${d} L ${x(values.length - 1)} ${H - 22} L ${x(0)} ${H - 22} Z`} fill={`url(#nl-f${u})`} />
    <path d={d} fill="none" stroke={`url(#nl-s${u})`} strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,.9))' }} />
    {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 2.5} fill={i === values.length - 1 ? '#e0f2fe' : '#38bdf8'} />)}
    <text x={x(values.length - 1)} y={y(values[values.length - 1]) - 10} textAnchor="end" fill="#e0f2fe" fontSize="11" fontFamily="Orbitron">{values[values.length - 1]}{unit}</text>
    {labels.map((l, i) => <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Rajdhani" fontWeight="700">{l}</text>)}
  </svg>;
}

// ---------------- Particle field (floating "mana" sparks) ----------------
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!; let raf = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fit = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
    fit(); addEventListener('resize', fit);
    const ps = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, v: Math.random() * .0006 + .0002, h: Math.random() < .5 ? 199 : 265, a: Math.random() }));
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of ps) {
        p.y -= p.v; p.a += .01; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const X = p.x * cv.width + Math.sin(p.a) * 8, Y = p.y * cv.height, R = p.r * devicePixelRatio;
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, R * 6); g.addColorStop(0, `hsla(${p.h},95%,70%,.9)`); g.addColorStop(1, `hsla(${p.h},95%,60%,0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, R * 6, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-70" aria-hidden="true" />;
}

// ---------------- SYSTEM notification window ----------------
export function SystemWindow({ title, children, onClose, violet }: { title: string; children: ReactNode; onClose?: () => void; violet?: boolean }) {
  return <div className={`holo ${violet ? 'violet' : ''} animate-pop max-w-md w-full`} role="status">
    <div className="corners"><i /><i /><i /><i /></div><div className="scanline" />
    <div className="relative flex items-center gap-2 justify-center mb-2"><Icon n="system" s={16} className="text-neon-cyan" /><span className="panel-title">{title}</span></div>
    <div className="relative text-center text-slate-200">{children}</div>
    {onClose && <div className="relative mt-4 flex justify-center"><button className="ghost-btn" onClick={onClose}>OK</button></div>}
  </div>;
}

// ---------------- Level-up overlay ----------------
export function LevelUpOverlay({ level, rank, onClose }: { level: number; rank: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-6" onClick={onClose}>
    <div className="absolute w-[520px] h-[520px] rounded-full border border-neon-violet/30 animate-spinslow" style={{ boxShadow: '0 0 120px rgba(139,92,246,.35), inset 0 0 80px rgba(56,189,248,.2)' }} />
    <div className="absolute w-[380px] h-[380px] rounded-full border-2 border-dashed border-neon-blue/30 animate-spinslow" style={{ animationDirection: 'reverse' }} />
    <div className="relative text-center animate-pop" onClick={e => e.stopPropagation()}>
      <div className="label text-neon-cyan animate-flicker">[ SYSTEM ]</div>
      <div className="display font-black text-5xl sm:text-6xl mt-2 glow-violet text-violet-200">LEVEL UP</div>
      <div className="flex items-center justify-center gap-4 mt-6"><RankBadge rank={rank} s={84} /><div className="text-left"><div className="label">New level</div><div className="display text-4xl glow-text text-sky-100">{level}</div></div></div>
      <p className="mt-5 text-slate-300 max-w-xs mx-auto">Your discipline is becoming power. All attributes have been recalculated.</p>
      <button className="neon-btn mt-6" onClick={onClose}>Continue</button>
    </div>
  </div>;
}
