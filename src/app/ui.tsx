// Small shared UI pieces on top of the design system.
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, SystemWindow } from '../design';
import { useHunter } from './store';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; }; }, [onClose]);
  return <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <div className={`holo !rounded-b-none sm:!rounded-[18px] w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto animate-rise !bg-void-900/95`} onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
      <div className="corners"><i /><i /><i /><i /></div>
      <div className="relative flex items-center justify-between mb-3 sticky top-0"><span className="panel-title">{title}</span>
        <button className="ghost-btn !min-h-9 !px-2.5" onClick={onClose} aria-label="Close">✕</button></div>
      <div className="relative">{children}</div>
    </div>
  </div>;
}

export function Toasts() {
  const { toasts, dismiss } = useHunter();
  return <div className="fixed top-3 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
    {toasts.map(t => <div key={t.id} className="pointer-events-auto w-full max-w-md" onClick={() => dismiss(t.id)}>
      <SystemWindow title={t.title} violet={t.ok}>
        <div className={`${t.ok ? 'text-slate-100' : 'text-rose-200'} text-sm space-y-0.5`}>{t.lines.map((l, i) => <div key={i} className={/^\+\d+ XP$/.test(l) ? 'display text-violet-200 glow-violet text-base mt-1' : ''}>{l}</div>)}</div>
      </SystemWindow></div>)}
  </div>;
}

export function Seg<T extends string>({ value, options, onChange, wrap }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; wrap?: boolean }) {
  return <div className={`flex gap-2 ${wrap ? 'flex-wrap' : 'overflow-x-auto pb-1'}`}>{options.map(o => <button type="button" key={o.id} className={`chip shrink-0 ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>;
}
export function Multi<T extends string>({ value, options, onChange }: { value: T[]; options: { id: T; label: ReactNode }[]; onChange: (v: T[]) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map(o => { const on = value.includes(o.id);
    return <button type="button" key={o.id} className={`chip ${on ? 'on' : ''}`} onClick={() => onChange(on ? value.filter(x => x !== o.id) : [...value, o.id])}>{on && <Icon n="check" s={12} sw={3} />}{o.label}</button>; })}</div>;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="label block mb-1.5">{label}</span>{children}{hint && <span className="block mt-1 text-[11px] text-slate-500">{hint}</span>}</label>;
}
export function Num({ value, onChange, min, max, step = 1, placeholder, className = '' }: { value: number | '' | null | undefined; onChange: (v: number | '') => void; min?: number; max?: number; step?: number; placeholder?: string; className?: string }) {
  return <input className={`field ${className}`} type="number" inputMode="decimal" value={value ?? ''} min={min} max={max} step={step} placeholder={placeholder}
    onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
}
export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 py-10 text-sky-200"><span className="w-5 h-5 rounded-full border-2 border-sky-300 border-t-transparent animate-spin" /><span className="label text-sky-200">{label ?? 'Loading…'}</span></div>;
}
export function Busy({ busy, children, className = 'neon-btn', ...p }: { busy?: boolean; children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={className} disabled={busy || p.disabled} {...p}>{busy ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : null}{children}</button>;
}
/** Wraps an async click: shows a spinner and swallows the (already toasted) error. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await f(); } catch { /* toasted by act() */ } finally { setBusy(false); } };
  return [busy, run] as const;
}
export const fmt = (n: number | null | undefined, d = 0) => (n === null || n === undefined || isNaN(Number(n)) ? '–' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d }));
