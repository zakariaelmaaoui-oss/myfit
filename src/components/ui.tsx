import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useApp } from '../lib/app';
import type { Nutrients, NutrientKey } from '../lib/nutrition';

const P: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  food: <><path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18" /><path d="M17 3c-2 0-3 2.5-3 6s1 5 3 5v7" /></>,
  heart: <path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" />,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
  back: <path d="M15 18l-6-6 6-6" />, next: <path d="M9 18l6-6-6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  walk: <><circle cx="13" cy="4" r="2" /><path d="m9 21 2-6 3 3v3M7 12l3-4 4 1 3 4M10 8l-1 5" /></>,
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  check: <path d="m5 12 5 5 9-10" />, x: <path d="M6 6l12 12M18 6 6 18" />,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  leaf: <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7" />,
  fridge: <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M6 10h12M9 6v2M9 13v3" /></>,
  book: <><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h5z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  cart: <><path d="M3 4h2l2.5 11h11L21 8H6.5" /><circle cx="9" cy="19.5" r="1.5" /><circle cx="17" cy="19.5" r="1.5" /></>,
  candy: <><circle cx="12" cy="12" r="4" /><path d="M8.5 9.5 4 5l-1 4 2 1M15.5 14.5 20 19l1-4-2-1" /></>,
  moon: <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />,
  scale: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a5 5 0 0 1 8 0l-3 3" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  download: <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M16 13h2M3 10h18" /></>,
  barcode: <path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14" />,
  play: <path d="M7 4v16l13-8z" />, pause: <path d="M8 4v16M16 4v16" />, stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></>,
  cup: <><path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M9 2v3M13 2v3" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />,
  pot: <><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" /></>,
  bed: <path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3M7 11.5h.01" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
};
export function Icon({ n, s = 20, className, sw = 1.8 }: { n: string; s?: number; className?: string; sw?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{P[n]}</svg>;
}
export function Logo({ s = 30 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#2f5d46" /><path d="M14 31c0-10 7-16 20-16 0 11-7 18-18 18" fill="#a8bfa3" /><path d="M16 33l9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

export function Page({ title, back, actions, children }: { title?: ReactNode; back?: boolean | string; actions?: ReactNode; children: ReactNode }) {
  const nav = useNavigate(); const { t } = useI18n();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if (typeof title === 'string') document.title = `${title} · MyFit`; }, [title]);
  return <main className="page">
    {(title || back) && <div className="topbar">
      {back && <button className="iconbtn" aria-label={t('common.back')} onClick={() => typeof back === 'string' ? nav(back) : nav(-1)}><Icon n="back" className="flip" /></button>}
      <h1>{title}</h1>{actions}
    </div>}
    {children}
  </main>;
}

export function Ring({ value, max, size = 150, stroke = 14, color = 'var(--green-dark)', children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const pct = max > 0 ? Math.min(1, value / max) : 0;
  return <div className="ring" style={{ width: size, height: size }}>
    <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .5s' }} /></svg>
    <div className="rl">{children}</div>
  </div>;
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%`, background: color }} /></div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="overlay" onClick={onClose}><div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
    <div className="row between"><h2>{title}</h2><button className="iconbtn" aria-label={t('common.close')} onClick={onClose}><Icon n="x" /></button></div>
    {children}
  </div></div>;
}

export function Toasts() {
  const { toasts, dismiss } = useApp(); const { t } = useI18n();
  return <div className="toasts" aria-live="polite">{toasts.map(x => <div key={x.id} className={`toast ${x.kind ?? ''}`} role="status">
    <span className="grow">{x.text}</span><button className="btn ghost sm" onClick={() => dismiss(x.id)} aria-label={t('common.close')}><Icon n="x" s={16} /></button>
  </div>)}</div>;
}

export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return <div className="seg" role="tablist">{options.map(o => <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>;
}

export const NUTR_COLORS: Record<string, string> = { protein: 'var(--c-protein)', carbs: 'var(--c-carbs)', fat: 'var(--c-fat)', fiber: 'var(--c-fiber)', sugar: 'var(--c-sugar)', addedSugar: 'var(--warn)' };

/** Value with unit, "unknown" for null, "≥" prefix when a total is missing some data. */
export function useFmt() {
  const { t, nf } = useI18n();
  return (v: number | null | undefined, unit: 'g' | 'kcal' | 'ml' | 'mg' = 'g', incomplete = false, d = 1) =>
    v === null || v === undefined ? t('common.unknown') : `${incomplete ? '≥ ' : ''}${nf(v, unit === 'kcal' ? 0 : d)} ${t('unit.' + unit)}`;
}

export function NutrientTable({ n, incomplete, showNatural = true }: { n: Nutrients; incomplete?: Partial<Record<NutrientKey, boolean>>; showNatural?: boolean }) {
  const { t } = useI18n(); const f = useFmt();
  const natural = n.sugar !== null && n.addedSugar !== null && !incomplete?.sugar && !incomplete?.addedSugar ? Math.max(0, (n.sugar ?? 0) - (n.addedSugar ?? 0)) : null;
  return <table className="nt"><tbody>
    <tr><td>{t('n.kcal')}</td><td>{f(n.kcal, 'kcal', incomplete?.kcal)}</td></tr>
    <tr><td>{t('n.protein')}</td><td>{f(n.protein, 'g', incomplete?.protein)}</td></tr>
    <tr><td>{t('n.carbs')}</td><td>{f(n.carbs, 'g', incomplete?.carbs)}</td></tr>
    <tr><td>{t('n.fat')}</td><td>{f(n.fat, 'g', incomplete?.fat)}</td></tr>
    <tr><td>{t('n.fiber')}</td><td>{f(n.fiber, 'g', incomplete?.fiber)}</td></tr>
    <tr><td>{t('n.sugar')}</td><td>{f(n.sugar, 'g', incomplete?.sugar)}</td></tr>
    <tr><td>{t('n.addedSugar')}</td><td>{f(n.addedSugar, 'g', incomplete?.addedSugar)}</td></tr>
    {showNatural && <tr><td>{t('n.naturalSugar')}</td><td>{f(natural, 'g')}</td></tr>}
  </tbody></table>;
}

export function MacroBars({ totals, targets }: { totals: Record<string, number>; targets: { protein: number | null; carbs: number | null; fat: number | null; fiber: number | null } }) {
  const { t, nf } = useI18n();
  return <div className="stack tight">{(['protein', 'carbs', 'fat', 'fiber'] as const).map(k => <div key={k}>
    <div className="row between small"><span>{t('n.' + k)}</span><span className="num muted">{nf(totals[k])} / {targets[k] ? nf(targets[k]) : '—'} {t('unit.g')}</span></div>
    <Bar value={totals[k]} max={targets[k] ?? 0} color={NUTR_COLORS[k]} />
  </div>)}</div>;
}

export function Confirm({ open, text, onYes, onNo }: { open: boolean; text: string; onYes: () => void; onNo: () => void }) {
  const { t } = useI18n();
  return <Modal open={open} onClose={onNo} title={t('common.confirm')}><p>{text}</p>
    <div className="row"><button className="btn grow" onClick={onNo}>{t('common.cancel')}</button><button className="btn primary grow" onClick={onYes}>{t('common.yes')}</button></div>
  </Modal>;
}

export function errMsg(e: any): string { return e?.message || String(e); }
