import { useSyncExternalStore } from 'react';
import { STRINGS } from './strings';

export type Lang = 'en' | 'fr' | 'ar' | 'dar';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' }, { id: 'fr', label: 'Français' }, { id: 'ar', label: 'العربية' }, { id: 'dar', label: 'الدارجة' },
];
export const isRtl = (l: Lang) => l === 'ar' || l === 'dar';

let current: Lang = (() => {
  try { const s = localStorage.getItem('myfit:lang') as Lang | null; if (s && LANGS.some(l => l.id === s)) return s; } catch { /* ignore */ }
  const n = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return n === 'fr' ? 'fr' : n === 'ar' ? 'ar' : 'en';
})();
const listeners = new Set<() => void>();
function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current === 'dar' ? 'ar-MA' : current;
  document.documentElement.dir = isRtl(current) ? 'rtl' : 'ltr';
}
apply();
export function setLang(l: Lang) {
  if (l === current) return;
  current = l; try { localStorage.setItem('myfit:lang', l); } catch { /* ignore */ }
  apply(); listeners.forEach(f => f());
}
export function getLang() { return current; }

/** Darija uses its own strings where provided, otherwise Arabic UI strings. */
export function translate(key: string, lang: Lang = current, vars?: Record<string, string | number>): string {
  const e = STRINGS[key];
  let s = e ? ((e as any)[lang] ?? (lang === 'dar' ? e.ar : undefined) ?? e.en) : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useI18n() {
  const lang = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => current, () => current);
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars);
  const nf = (n: number | null | undefined, d = 0) => n === null || n === undefined || isNaN(n) ? '—'
    : new Intl.NumberFormat(lang === 'dar' ? 'ar-MA' : lang === 'ar' ? 'ar-MA' : lang, { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);
  const df = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(lang === 'dar' || lang === 'ar' ? 'ar-MA' : lang, opts).format(new Date(y, m - 1, d || 1));
  };
  return { lang, t, nf, df, rtl: isRtl(lang) };
}
