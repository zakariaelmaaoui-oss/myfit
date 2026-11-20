import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { backend, TABLES, type AuthUser, type Table, newId } from './store';
import { computeTargets, isoDate, sumNutrients, type Targets } from './nutrition';
import { setCustomFoods } from './foods';
import { setLang, type Lang } from './i18n';

export interface Profile {
  id: string; name: string; age: number; sex: 'female' | 'male' | 'other'; height_cm: number; weight_kg: number;
  start_weight_kg?: number | null; target_weight_kg?: number | null; activity: any; goal: any;
  diet_prefs?: string[]; allergies?: string[]; restrictions?: string; country?: string; language: Lang;
  budget_mad?: number | null; budget_period?: 'week' | 'month';
  pregnant?: boolean; breastfeeding?: boolean; medical_supervision?: boolean; eating_disorder_history?: boolean; health_notes?: string;
  sugar_guidance_pct?: 5 | 10; custom_added_sugar_g?: number | null; water_goal_ml?: number | null; walk_goal_min?: number;
  track_weight?: boolean; enable_sleep?: boolean; enable_period?: boolean; consent_sensitive?: boolean; consent_at?: string | null;
  onboarded?: boolean;
}
export interface Prefs {
  id: string; notifications_enabled: boolean; calorie_excess_alert: boolean; sugar_alert: boolean;
  quiet_start: string; quiet_end: string; reminders: { type: string; time: string; enabled: boolean }[];
  weekly_report_day: number; theme?: 'system' | 'light' | 'dark';
  coach_consent?: boolean; coach_consent_at?: string | null; coach_push_enabled?: boolean;
}
export const DEFAULT_PREFS = (id: string): Prefs => ({
  id, notifications_enabled: false, calorie_excess_alert: true, sugar_alert: true, quiet_start: '22:00', quiet_end: '07:00',
  weekly_report_day: 0, theme: 'system', coach_consent: false, coach_push_enabled: false,
  reminders: [
    { type: 'water', time: '10:00', enabled: true }, { type: 'water', time: '15:00', enabled: true },
    { type: 'walk', time: '18:00', enabled: true }, { type: 'meals', time: '21:00', enabled: true },
    { type: 'mealprep', time: '19:30', enabled: false }, { type: 'habits', time: '21:30', enabled: false },
    { type: 'report', time: '10:00', enabled: true },
  ],
});

type Data = Record<Table, any[]>;
const empty = (): Data => Object.fromEntries(TABLES.map(t => [t, []])) as unknown as Data;

interface Toast { id: string; text: string; kind?: 'info' | 'warn' | 'ok' }
interface Ctx {
  mode: 'supabase' | 'local'; user: AuthUser | null; ready: boolean; loading: boolean; error: string | null;
  profile: Profile | null; prefs: Prefs; targets: Targets | null; data: Data;
  insert(t: Table, row: any): Promise<any>; update(t: Table, id: string, patch: any): Promise<any>;
  upsert(t: Table, row: any): Promise<any>; remove(t: Table, id: string): Promise<void>; removeWhere(t: Table, f: string, v: any): Promise<void>;
  saveProfile(p: Partial<Profile>): Promise<void>; savePrefs(p: Partial<Prefs>): Promise<void>;
  reload(): Promise<void>; toast(text: string, kind?: Toast['kind']): void; toasts: Toast[]; dismiss(id: string): void;
  dayTotals(date?: string): ReturnType<typeof sumNutrients> & { entries: number };
}
const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Data>(empty);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const uidRef = useRef<string | null>(null);

  const load = useCallback(async (u: AuthUser | null) => {
    uidRef.current = u?.id ?? null;
    if (!u) { setData(empty()); return; }
    setLoading(true); setError(null);
    try {
      const results = await Promise.all(TABLES.map(t => backend.list(t, u.id).catch(e => { console.error(t, e); throw e; })));
      const d = Object.fromEntries(TABLES.map((t, i) => [t, results[i]])) as unknown as Data;
      setCustomFoods(d.custom_foods);
      setData(d);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let alive = true;
    backend.getUser().then(async u => { if (!alive) return; setUser(u); await load(u); setReady(true); });
    const off = backend.onAuthChange(u => {
      if (u?.id === uidRef.current) return;
      setUser(u); load(u);
    });
    return () => { alive = false; off(); };
  }, [load]);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = newId(); setToasts(ts => [...ts, { id, text, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 7000);
  }, []);
  const dismiss = (id: string) => setToasts(ts => ts.filter(t => t.id !== id));

  const withUid = (t: Table, row: any) => (t === 'profiles' || t === 'user_preferences') ? { ...row, id: user!.id } : { ...row, user_id: user!.id };
  const patchState = (t: Table, fn: (rows: any[]) => any[]) => setData(d => {
    const next = { ...d, [t]: fn(d[t]) };
    if (t === 'custom_foods') setCustomFoods(next.custom_foods);
    return next;
  });

  const insert = async (t: Table, row: any) => { const r = await backend.insert(t, withUid(t, row)); patchState(t, rows => [...rows, r]); return r; };
  const update = async (t: Table, id: string, patch: any) => { const r = await backend.update(t, id, patch); patchState(t, rows => rows.map(x => (x.id === id ? r : x))); return r; };
  const upsert = async (t: Table, row: any) => {
    const full = withUid(t, row); const r = await backend.upsert(t, full);
    patchState(t, rows => rows.some(x => x.id === r.id) ? rows.map(x => (x.id === r.id ? r : x)) : [...rows, r]); return r;
  };
  const remove = async (t: Table, id: string) => { await backend.remove(t, id); patchState(t, rows => rows.filter(x => x.id !== id)); };
  const removeWhere = async (t: Table, f: string, v: any) => { await backend.removeWhere(t, user!.id, f, v); patchState(t, rows => rows.filter(x => x[f] !== v)); };

  const profile: Profile | null = data.profiles[0] ?? null;
  const prefs: Prefs = { ...DEFAULT_PREFS(user?.id ?? ''), ...(data.user_preferences[0] ?? {}) };
  useEffect(() => { if (profile?.language) setLang(profile.language); }, [profile?.language]);

  const targets = useMemo(() => {
    if (!profile || !profile.age || !profile.weight_kg || !profile.height_cm) return null;
    return computeTargets({
      age: profile.age, sex: profile.sex, heightCm: profile.height_cm, weightKg: profile.weight_kg, activity: profile.activity, goal: profile.goal,
      pregnant: profile.pregnant, breastfeeding: profile.breastfeeding, medicalSupervision: profile.medical_supervision,
      eatingDisorderHistory: profile.eating_disorder_history, sugarGuidancePct: profile.sugar_guidance_pct,
      customAddedSugarG: profile.custom_added_sugar_g, waterGoalMl: profile.water_goal_ml,
    });
  }, [profile]);

  const saveProfile = async (p: Partial<Profile>) => { await upsert('profiles', { ...(profile ?? {}), ...p, updated_at: new Date().toISOString() }); };
  const savePrefs = async (p: Partial<Prefs>) => { await upsert('user_preferences', { ...prefs, ...p }); };

  const dayTotals = (date = isoDate()) => {
    const rows = data.diary_entries.filter(e => e.date === date);
    const s = sumNutrients(rows.map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar })));
    return { ...s, entries: rows.length };
  };

  const value: Ctx = { mode: backend.mode, user, ready, loading, error, profile, prefs, targets, data, insert, update, upsert, remove, removeWhere,
    saveProfile, savePrefs, reload: () => load(user), toast, toasts, dismiss, dayTotals };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
