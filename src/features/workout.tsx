import { useEffect, useMemo, useState } from 'react';
import { Holo, Icon } from '../design';
import { ExerciseFigure } from '../design/ExerciseFigure';
import { supabase } from '../lib/supabase';
import { EXERCISES, getEx, exName, exText, fmtDose, type Exercise } from '../data/exercises';
import { startOfWeek, addDays, isoDate } from '../lib/nutrition';
import * as E from '../core/engine';
import type { Prescription } from '../core/training';
import { useHunter } from '../app/store';
import { Modal, Num, Seg, Busy, useBusy, fmt, Spinner, Field } from '../app/ui';
import { t, lang } from '../app/i18n';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const restFor = (e?: Exercise) => (e?.group === 'cardio' ? 45 : e?.group === 'core' ? 45 : e?.loadStep ? 90 : 60);

export function ExerciseInfo({ id, onClose }: { id: string; onClose: () => void }) {
  const e = getEx(id)!;
  return <Modal title={exName(e, lang())} onClose={onClose}>
    <div className="flex flex-col items-center"><div className="rounded-2xl bg-violet-500/10 border border-violet-400/25">{e.figure ? <ExerciseFigure id={e.figure} size={200} /> : <div className="w-[200px] h-[160px] grid place-items-center text-violet-300 text-sm text-center px-4"><Icon n="sword" s={40} /><span>No animation for this move yet — follow the steps below.</span></div>}</div></div>
    <div className="mt-4 space-y-2 text-sm"><div className="flex flex-wrap gap-2"><span className="chip">{e.muscles}</span><span className="chip">Level {'★'.repeat(e.level)}</span><span className="chip">{e.equip.includes('none') ? 'No equipment' : e.equip.join(', ')}</span></div>
      <p className="text-slate-200" dir="auto">{exText(e.how, lang())}</p><p className="text-sky-200" dir="auto">💡 {exText(e.cue, lang())}</p>
      {(e.easier || e.harder) && <p className="text-[12px] text-slate-400">{e.easier && <>Easier: {exName(getEx(e.easier), lang())}. </>}{e.harder && <>Evolves into: {exName(getEx(e.harder), lang())}.</>}</p>}</div>
  </Modal>;
}

function RestTimer({ sec, onDone }: { sec: number; onDone: () => void }) {
  const [left, setLeft] = useState(sec);
  useEffect(() => { const i = setInterval(() => setLeft(l => { if (l <= 1) { clearInterval(i); onDone(); try { navigator.vibrate?.(200); } catch { /* no vibration */ } return 0; } return l - 1; }), 1000); return () => clearInterval(i); }, [sec, onDone]);
  return <div className="fixed bottom-28 lg:bottom-6 inset-x-0 z-30 flex justify-center px-4"><div className="holo violet !py-3 flex items-center gap-4 w-full max-w-sm">
    <Icon n="clock" className="text-violet-300" /><div className="flex-1"><div className="label">{t('rest')}</div><div className="bar h-2 mt-1"><i style={{ width: `${(left / sec) * 100}%`, transition: 'width 1s linear' }} /></div></div>
    <span className="display text-2xl text-sky-50 w-14 text-right">{left}s</span><button className="ghost-btn !min-h-8 !px-2" onClick={onDone}>Skip</button></div></div>;
}

function ExerciseCard({ item, sessionId, logged, onRest }: { item: Prescription & { last_change?: string | null }; sessionId: string | null; logged: any[]; onRest: (s: number) => void }) {
  const { act } = useHunter(); const e = getEx(item.exercise_id)!; const [open, setOpen] = useState(false); const [info, setInfo] = useState(false); const [busy, run] = useBusy();
  const time = e.measure === 'time';
  const [val, setVal] = useState<number | ''>((time ? item.seconds : item.reps) ?? ''); const [load, setLoad] = useState<number | ''>(item.load_kg || '');
  const done = logged.length; const target = item.sets; const complete = done >= target;
  const log = () => run(async () => {
    await act((sb, u, d) => E.logSets(sb, u, d, [{ exercise_id: e.id, set_no: done + 1, reps: time ? null : Number(val) || 0, seconds: time ? Number(val) || 0 : null, load_kg: load === '' ? null : Number(load) }], sessionId));
    if (done + 1 < target) onRest(restFor(e));
  });
  return <div className={`holo !p-0 overflow-hidden ${complete ? '!border-emerald-400/40' : ''}`}>
    <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setOpen(!open)}>
      <div className="shrink-0 rounded-xl bg-violet-500/10 border border-violet-400/25">{e.figure ? <ExerciseFigure id={e.figure} size={68} /> : <div className="w-[68px] h-[68px] grid place-items-center text-violet-300"><Icon n="sword" s={26} /></div>}</div>
      <div className="flex-1 min-w-0"><div className="font-ui font-bold text-lg text-slate-50 truncate">{exName(e, lang())}</div>
        <div className="text-[12px] text-slate-400">{fmtDose(item.sets, item.reps, item.seconds, item.load_kg || null)} · {e.muscles}</div>
        {item.last_change && <div className="text-[11px] text-emerald-300">↑ {item.last_change}</div>}</div>
      <div className="text-right"><div className={`display text-sm ${complete ? 'text-emerald-300' : 'text-sky-200'}`}>{done}/{target}</div><div className="label !text-[9px]">{t('sets')}</div></div>
    </button>
    {open && <div className="px-3 pb-3 space-y-3 border-t border-sky-400/10 pt-3">
      <p className="text-sm text-slate-300" dir="auto">{exText(e.how, lang())} <button className="text-sky-300 underline" onClick={() => setInfo(true)}>Demo</button></p>
      {logged.length > 0 && <div className="flex flex-wrap gap-2">{logged.map((s, i) => <span key={s.id} className="chip !border-emerald-400/40 !text-emerald-200">Set {i + 1}: {s.seconds ? `${s.seconds}s` : `${s.reps} reps`}{s.load_kg ? ` · ${s.load_kg}kg` : ''}</span>)}</div>}
      {!sessionId ? <p className="text-[12px] text-amber-200">Start the session to log sets.</p> : <div className="flex items-end gap-2">
        <Field label={time ? t('seconds') : t('reps')}><Num value={val} min={0} max={time ? 3600 : 500} onChange={setVal} className="!w-24" /></Field>
        {(e.loadStep || !e.equip.includes('none')) && <Field label="kg"><Num value={load} min={0} max={500} step={0.5} onChange={setLoad} className="!w-24" placeholder="0" /></Field>}
        <Busy busy={busy} className="neon-btn flex-1" disabled={val === ''} onClick={log}><Icon n="check" s={16} />{t('logSet')} {done + 1}</Busy></div>}
      {item.load_kg === 0 && !!e.loadStep && <p className="text-[11px] text-slate-500">First time: pick a weight you can lift for the target reps with good form — it will be remembered.</p>}
    </div>}
    {info && <ExerciseInfo id={e.id} onClose={() => setInfo(false)} />}
  </div>;
}

function ActivityLogger() {
  const { act } = useHunter(); const [ex, setEx] = useState('brisk_walk'); const [min, setMin] = useState<number | ''>(30); const [km, setKm] = useState<number | ''>(''); const [busy, run] = useBusy();
  return <Holo title={t('activity')}>
    <Seg value={ex} onChange={setEx} options={['brisk_walk', 'running', 'cycling', 'stairs', 'stretching', 'hip_mobility'].map(id => ({ id, label: exName(getEx(id), lang()) }))} />
    <div className="flex items-end gap-2 mt-3"><Field label="Minutes"><Num value={min} min={1} max={600} onChange={setMin} className="!w-24" /></Field>
      {['brisk_walk', 'running', 'cycling'].includes(ex) && <Field label="km (optional)"><Num value={km} min={0} max={300} step={0.1} onChange={setKm} className="!w-28" /></Field>}
      <Busy busy={busy} className="neon-btn flex-1" disabled={!min} onClick={() => run(() => act((sb, u, d) => E.logSets(sb, u, d, [{ exercise_id: ex, seconds: Number(min) * 60, distance_km: km === '' ? null : Number(km) }])))}>{t('save')}</Busy></div>
    <p className="text-[11px] text-slate-500 mt-2">Counts for walk, recovery and cardio quests. Steps are not tracked automatically on the web — log minutes here or tell THE SYSTEM.</p>
  </Holo>;
}

function FreeLog() {
  const { act } = useHunter(); const [id, setId] = useState('pushup'); const [v, setV] = useState<number | ''>(10); const [kg, setKg] = useState<number | ''>(''); const [busy, run] = useBusy();
  const e = getEx(id)!;
  return <Holo title="Quick log · any exercise">
    <select className="field" value={id} onChange={x => setId(x.target.value)}>{EXERCISES.map(x => <option key={x.id} value={x.id}>{exName(x, lang())}</option>)}</select>
    <div className="flex items-end gap-2 mt-2"><Field label={e.measure === 'time' ? t('seconds') : t('reps')}><Num value={v} min={1} max={3600} onChange={setV} className="!w-24" /></Field>
      <Field label="kg"><Num value={kg} min={0} max={500} step={0.5} onChange={setKg} className="!w-24" /></Field>
      <Busy busy={busy} className="ghost-btn flex-1" disabled={!v} onClick={() => run(() => act((sb, u, d) => E.logSets(sb, u, d, [{ exercise_id: id, reps: e.measure === 'time' ? null : Number(v), seconds: e.measure === 'time' ? Number(v) : null, load_kg: kg === '' ? null : Number(kg) }])))}>{t('logSet')}</Busy></div>
  </Holo>;
}

export function Workout() {
  const { h, act, uid, toast } = useHunter(); const [busy, run] = useBusy(); const [rest, setRest] = useState<number | null>(null); const [rpe, setRpe] = useState(7);
  const [week, setWeek] = useState<{ date: string; status: string }[]>([]); const [prs, setPrs] = useState<any[]>([]); const [info, setInfo] = useState<string | null>(null);
  useEffect(() => { if (!uid || !h) return; const ws = startOfWeek(h.date);
    supabase.from('sf_workout_sessions').select('date,status').eq('user_id', uid).gte('date', ws).lte('date', addDays(ws, 6)).then(({ data }) => setWeek(data ?? []));
    supabase.from('sf_personal_records').select('*').eq('user_id', uid).order('achieved_on', { ascending: false }).limit(12).then(({ data }) => setPrs(data ?? [])); }, [uid, h]);
  const w = h?.workout; const session = h?.day.sessions.find(s => s.status === 'in_progress') ?? null; const finished = h?.day.sessions.find(s => s.status === 'completed');
  const ws = h ? startOfWeek(h.date) : isoDate();
  const strip = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = addDays(ws, i); const dow = new Date(d + 'T12:00:00').getDay(); const pd = w?.plan?.days.find(x => x.dow === dow);
    return { d, dow, name: pd?.name, done: week.some(s => s.date === d && s.status === 'completed'), today: d === h?.date }; }), [ws, w, week, h?.date]);
  if (!h || !w) return <Spinner />;
  const setsBy = (id: string) => h.day.sets.filter(s => s.exercise_id === id && (session ? s.session_id === session.id : finished ? s.session_id === finished.id : false));
  return <div className="space-y-5 animate-rise">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="label text-neon-cyan">{w.plan?.name ?? 'No plan'} · week {w.week}{w.deload ? ' · DELOAD' : ''}</div><h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">{w.day?.name ?? t('restDay').toUpperCase()}</h1></div></div>
    <div className="grid grid-cols-7 gap-1.5">{strip.map(s => <div key={s.d} className={`rounded-xl border p-2 text-center ${s.today ? 'border-sky-300 bg-sky-400/10 shadow-glow' : 'border-sky-400/15 bg-void-950/40'}`}>
      <div className="label !text-[9px]">{DOW[s.dow]}</div><div className={`text-[11px] font-ui font-bold truncate ${s.name ? 'text-sky-100' : 'text-slate-500'}`}>{s.name ? s.name.split(' ')[0] : 'Rest'}</div>
      <div className="text-sm">{s.done ? '✅' : s.name ? '⚔️' : '·'}</div></div>)}</div>
    {w.deload && <Holo violet title="Deload week"><p className="text-sm text-slate-300">Every 5th week: one set less and a little lighter. Your body absorbs the last 4 weeks of work — progression resumes next week.</p></Holo>}
    {w.day ? <>
      <Holo violet scan title={finished ? '✔ Dungeon cleared' : session ? 'Session in progress' : t('todaysDungeon')} right={<span className="text-[12px] text-slate-400">~{h.profile.session_minutes} min</span>}>
        {finished ? <p className="text-sm text-emerald-200">Cleared · {finished.minutes} min · RPE {finished.rpe} · {Math.round(Number(finished.completed_ratio) * 100)}% completed · ≈{finished.kcal} kcal. Recover well, Hunter.</p>
          : !session ? <div className="space-y-2"><p className="text-sm text-slate-300">{w.items.length} exercises. Doses adapt to your real performance: two strong sessions in a row → the dose rises; two hard ones → it eases.</p>
            <Busy busy={busy} className="neon-btn w-full" onClick={() => run(() => act((sb, u, d) => E.startSession(sb, u, d, w.day!.name, w.day!.dow)))}><Icon n="play" s={16} />{t('start')}</Busy></div>
          : <div className="space-y-3"><div><span className="label">{t('rpe')}</span><div className="flex gap-1 mt-1">{[4, 5, 6, 7, 8, 9, 10].map(n => <button key={n} className={`flex-1 h-10 rounded-lg border font-ui font-bold ${rpe === n ? 'border-sky-300 bg-sky-400/20 text-sky-50 shadow-glow' : 'border-slate-600 text-slate-400'}`} onClick={() => setRpe(n)}>{n}</button>)}</div>
              <div className="text-[11px] text-slate-500 mt-1">7 = could do 3 more reps · 9 = almost nothing left · 10 = maximal</div></div>
            <Busy busy={busy} className="neon-btn w-full" onClick={() => run(async () => { const r = await act((sb, u) => E.finishSession(sb, u, session.id, { rpe })); const ch = r.changes.filter(c => c.change !== 'hold');
              if (ch.length) toast({ ok: true, title: 'THE SYSTEM ADAPTED YOUR PLAN', lines: ch.map(c => `${exName(getEx(c.exercise_id), lang())}: ${c.message}`) }); })}><Icon n="trophy" s={16} />{t('finish')}</Busy></div>}
      </Holo>
      <div className="space-y-3">{w.items.map(i => <ExerciseCard key={i.exercise_id} item={i} sessionId={session?.id ?? null} logged={setsBy(i.exercise_id)} onRest={setRest} />)}</div>
    </> : <Holo title={t('restDay')}><p className="text-sm text-slate-300">No dungeon today. Recovery quests: a walk and 5 minutes of mobility. Muscles grow while you rest.</p></Holo>}
    <div className="grid lg:grid-cols-2 gap-5"><ActivityLogger /><FreeLog /></div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Holo title="Weekly plan">{w.plan?.days.map(d => <div key={d.dow} className="py-2 border-b border-sky-400/10 last:border-0"><div className="flex justify-between"><span className="font-ui font-bold text-sky-100">{DOW[d.dow]} · {d.name}</span></div>
        <div className="flex flex-wrap gap-1.5 mt-1">{d.exercises.map(id => <button key={id} className="chip !text-[11px]" onClick={() => setInfo(id)}>{exName(getEx(id), lang())}</button>)}</div></div>)}
        <p className="text-[11px] text-slate-500 mt-2">Change days, place or equipment in PROFILE, or ask THE SYSTEM — the plan rebuilds itself.</p></Holo>
      <Holo violet title="Personal records">{!prs.length ? <p className="text-sm text-slate-400">Your first logged sets become your baseline. Beat them to set records.</p> :
        prs.map(p => <div key={p.exercise_id + p.metric} className="flex justify-between py-1.5 border-b border-violet-400/10 last:border-0 text-sm"><span className="text-slate-200">{exName(getEx(p.exercise_id), lang())}</span>
          <span className="display text-violet-200">{fmt(p.value, 1)} {p.metric === 'load_kg' ? 'kg' : p.metric === 'seconds' ? 's' : p.metric === 'distance_km' ? 'km' : 'reps'}{p.times_beaten > 0 ? ' ★' : ''}</span></div>)}</Holo>
    </div>
    {rest && <RestTimer sec={rest} onDone={() => setRest(null)} />}
    {info && <ExerciseInfo id={info} onClose={() => setInfo(null)} />}
  </div>;
}
