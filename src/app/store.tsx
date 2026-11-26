// App state: session + the hunter's real data for today, loaded from Supabase through the shared engine.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, configured } from '../lib/supabase';
import * as E from '../core/engine';
import { rankFromLevel, type Rank } from '../lib/rpg';
import { isoDate, startOfWeek } from '../lib/nutrition';
import { setLang, type Lang } from './i18n';
import type { QuestRow } from '../core/game';

export interface Toast { id: number; title: string; lines: string[]; ok: boolean }
export interface HunterState {
  date: string; profile: E.Profile; target: E.Target | null; stats: Awaited<ReturnType<typeof E.getStats>> & { rank: Rank };
  streak: number; quests: QuestRow[]; day: Awaited<ReturnType<typeof E.loadDay>>; workout: Awaited<ReturnType<typeof E.todaysWorkout>>;
  challenges: any[]; achievements: string[];
}
interface Ctx {
  session: Session | null; ready: boolean; loading: boolean; error: string | null; h: HunterState | null; uid: string | null;
  refresh: () => Promise<void>;
  /** Run a real DB action, then recompute quests/XP and reload. Shows rewards; throws (and toasts) on failure. */
  act: <T>(fn: (sb: E.SB, uid: string, date: string) => Promise<T>, okMsg?: { title: string; lines?: string[] }) => Promise<T>;
  toasts: Toast[]; toast: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void;
  levelUp: { level: number; rank: Rank } | null; clearLevelUp: () => void; showLevelUp: (l: { level: number; rank: Rank }) => void;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useHunter = () => useContext(C);
let tid = 0;

export function HunterProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [ready, setReady] = useState(!configured);
  const [h, setH] = useState<HunterState | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]); const [levelUp, setLevelUp] = useState<{ level: number; rank: Rank } | null>(null);
  const lastLevel = useRef<number | null>(null);
  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setH(null); lastLevel.current = null; } });
    return () => data.subscription.unsubscribe();
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => { const id = ++tid; setToasts(x => [...x.slice(-2), { ...t, id }]); setTimeout(() => setToasts(x => x.filter(y => y.id !== id)), t.ok ? 4500 : 7000); }, []);
  const dismiss = useCallback((id: number) => setToasts(x => x.filter(y => y.id !== id)), []);

  const load = useCallback(async (sync: boolean) => {
    if (!uid) return;
    const sb = supabase; const date = isoDate();
    const profile = await E.getProfile(sb, uid);
    if (!profile || !profile.onboarded) { setH(null); setLoading(false); return; }
    setLang(profile.language as Lang);
    const s = sync ? await E.syncDay(sb, uid, date) : null;
    const [target, stats, day, workout, chs, ach] = await Promise.all([
      E.getTarget(sb, uid, date), E.getStats(sb, uid), E.loadDay(sb, uid, date), E.todaysWorkout(sb, uid, date, profile),
      sb.from('sf_challenges').select('*').eq('user_id', uid).eq('week_start', startOfWeek(date)).order('created_at'),
      sb.from('sf_achievements').select('key').eq('user_id', uid),
    ]);
    const quests = s?.quests ?? await E.ensureQuests(sb, uid, date, { profile, target });
    const rank = rankFromLevel(stats.level);
    if (lastLevel.current !== null && stats.level > lastLevel.current) setLevelUp({ level: stats.level, rank });
    lastLevel.current = stats.level;
    setH(prev => ({ date, profile, target, stats: { ...stats, rank }, streak: s?.streak ?? prev?.streak ?? 0, quests, day, workout, challenges: chs.data ?? [], achievements: (ach.data ?? []).map(a => a.key) }));
    return s;
  }, [uid]);

  const refresh = useCallback(async () => {
    setError(null);
    try { const s = await load(true); if (s?.awards.length) rewardToast(s, toast); } catch (e: any) { const m = e?.message ?? 'Could not load your data'; setError(/sf_|relation .* does not exist|schema cache/i.test(m) ? 'SHADOW FIT database tables are missing: run supabase/shadow_fit.sql in Supabase → SQL Editor.' : m); }
  }, [load, toast]);

  useEffect(() => { if (uid) { setLoading(true); refresh().finally(() => setLoading(false)); } }, [uid, refresh]);
  useEffect(() => { // new day while the app is open → reload
    const onFocus = () => { if (h && h.date !== isoDate()) refresh(); };
    addEventListener('focus', onFocus); return () => removeEventListener('focus', onFocus);
  }, [h, refresh]);

  const act = useCallback(async <T,>(fn: (sb: E.SB, uid: string, date: string) => Promise<T>, okMsg?: { title: string; lines?: string[] }) => {
    if (!uid) throw new Error('not signed in');
    try {
      const r = await fn(supabase, uid, isoDate());
      if (okMsg) toast({ ok: true, title: okMsg.title, lines: okMsg.lines ?? [] });
      const s = await load(true); if (s?.awards.length) rewardToast(s, toast);
      return r;
    } catch (e: any) { toast({ ok: false, title: 'NOT SAVED', lines: [e?.message ?? String(e)] }); throw e; }
  }, [uid, load, toast]);

  return <C.Provider value={{ session, ready, loading, error, h, uid, refresh, act, toasts, toast, dismiss, levelUp, clearLevelUp: () => setLevelUp(null), showLevelUp: setLevelUp }}>{children}</C.Provider>;
}

function rewardToast(s: E.SyncResult, toast: (t: Omit<Toast, 'id'>) => void) {
  const xp = s.awards.reduce((a, x) => a + x.xp, 0);
  toast({ ok: true, title: s.completed.length ? 'QUEST COMPLETE' : s.achievements.length ? 'ACHIEVEMENT UNLOCKED' : 'SYSTEM REWARD',
    lines: [...s.completed, ...s.achievements.map(a => `★ ${a}`), `+${xp} XP`] });
}
