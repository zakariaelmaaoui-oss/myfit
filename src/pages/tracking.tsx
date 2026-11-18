import { useEffect, useState } from 'react';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { isoDate, lastNDays } from '../lib/nutrition';
import { Bar, Empty, Icon, Page, Ring, errMsg } from '../components/ui';

// ---------------- Water ----------------
export function Water() {
  const { t, nf, df } = useI18n(); const { data, insert, remove, targets, profile, saveProfile, toast } = useApp();
  const today = isoDate(); const [custom, setCustom] = useState(''); const [goal, setGoal] = useState(String(targets?.waterMl ?? 2000)); const [err, setErr] = useState('');
  const todays = data.water_logs.filter(w => w.date === today).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const total = todays.reduce((a, w) => a + Number(w.ml), 0); const target = targets?.waterMl ?? 2000;
  const add = async (ml: number) => { setErr(''); try { await insert('water_logs', { date: today, ml }); toast(t('water.added', { ml }), 'ok'); } catch (e) { setErr(errMsg(e)); } };
  const week = lastNDays(7).map(d => ({ d: df(d, { weekday: 'short' }), ml: data.water_logs.filter(w => w.date === d).reduce((a, w) => a + Number(w.ml), 0) }));
  const saveGoal = async () => {
    const g = Number(goal); if (!(g >= 500 && g <= 5000)) return setErr(t('water.goalRange'));
    await saveProfile({ water_goal_ml: g }); toast(t('common.saved'), 'ok');
  };
  return <Page title={t('nav.water')} back>
    <section className="card center stack" style={{ alignItems: 'center' }}>
      <Ring value={total} max={target} color="var(--c-water)" size={170}><span className="big num" data-testid="water-total">{nf(total / 1000, 2)} L</span><span className="tiny muted">/ {nf(target / 1000, 2)} L</span></Ring>
      <div className="grid3" style={{ width: '100%' }}>{[150, 250, 500].map(ml => <button key={ml} className="btn soft" onClick={() => add(ml)}><span dir="ltr">+{ml} ml</span></button>)}</div>
      <div className="row" style={{ width: '100%' }}><input type="number" inputMode="numeric" placeholder={t('water.customPh')} value={custom} onChange={e => setCustom(e.target.value)} aria-label={t('water.custom')} />
        <button className="btn primary" onClick={() => { const v = Number(custom); if (v > 0 && v <= 2000) { add(v); setCustom(''); } else setErr(t('water.customRange')); }}>{t('common.add')}</button></div>
      {err && <p className="err">{err}</p>}
    </section>
    <section className="card"><h2>{t('water.today')}</h2>{todays.length ? <div className="list">{todays.map(w => <div className="li" key={w.id}><Icon n="drop" s={18} /><span className="grow num">{w.ml} ml</span>
      <span className="tiny muted">{w.created_at ? new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('water_logs', w.id)}><Icon n="trash" s={16} /></button></div>)}</div> : <Empty>{t('water.none')}</Empty>}</section>
    <section className="card"><h2>{t('common.last7')}</h2><div className="chart"><ResponsiveContainer><BarChart data={week}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip /><ReferenceLine y={target} stroke="var(--c-water)" strokeDasharray="4 4" /><RBar dataKey="ml" fill="var(--c-water)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="card stack"><h2>{t('water.goal')}</h2><p className="small muted">{t('water.goalInfo')}</p>
      <div className="row"><input type="number" value={goal} onChange={e => setGoal(e.target.value)} aria-label={t('water.goal')} /><button className="btn" onClick={saveGoal}>{t('common.save')}</button>
        {profile?.water_goal_ml && <button className="btn ghost" onClick={() => { saveProfile({ water_goal_ml: null }); }}>{t('water.auto')}</button>}</div>
      <p className="tiny muted">{t('water.safety')}</p></section>
  </Page>;
}

// ---------------- Walking ----------------
const WK = 'myfit:walk-start';
export function useWalkTimer() {
  const { insert, toast } = useApp(); const { t } = useI18n();
  const [start, setStart] = useState<number | null>(() => { const v = localStorage.getItem(WK); return v ? Number(v) : null; });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!start) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [start]);
  const elapsed = start ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
  const label = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  return {
    running: !!start, elapsed, label,
    start: () => { const s = Date.now(); localStorage.setItem(WK, String(s)); setStart(s); setNow(s); },
    stop: async (save = true) => {
      const mins = Math.round(elapsed / 60 * 10) / 10; const s = start; localStorage.removeItem(WK); setStart(null);
      if (save && mins >= 1 && s) { await insert('activity_logs', { date: isoDate(new Date(s)), minutes: mins, kind: 'walk', started_at: new Date(s).toISOString() }); toast(t('walk.saved', { min: Math.round(mins) }), 'ok'); }
      else if (save) toast(t('walk.tooShort'));
    },
  };
}
export function Walk() {
  const { t, nf, df } = useI18n(); const { data, profile, saveProfile, insert, remove, toast } = useApp(); const timer = useWalkTimer();
  const today = isoDate(); const goal = profile?.walk_goal_min ?? 30;
  const todayMin = data.activity_logs.filter(a => a.date === today).reduce((s, a) => s + Number(a.minutes), 0);
  const week = lastNDays(7).map(d => ({ d: df(d, { weekday: 'short' }), min: Math.round(data.activity_logs.filter(a => a.date === d).reduce((s, a) => s + Number(a.minutes), 0)) }));
  const [manual, setManual] = useState(''); const [steps, setSteps] = useState(''); const [g, setG] = useState(String(goal)); const [err, setErr] = useState('');
  const addManual = async () => {
    setErr(''); const m = Number(manual); const s = steps ? Number(steps) : null;
    if (!(m > 0 && m <= 600)) return setErr(t('walk.range'));
    try { await insert('activity_logs', { date: today, minutes: m, steps: s, kind: 'walk' }); setManual(''); setSteps(''); toast(t('common.saved'), 'ok'); } catch (e) { setErr(errMsg(e)); }
  };
  return <Page title={t('nav.walk')} back>
    <section className="card center stack" style={{ alignItems: 'center' }}>
      <span className="timer" data-testid="walk-timer">{timer.label}</span>
      {timer.running ? <div className="row"><button className="btn primary" onClick={() => timer.stop(true)}><Icon n="stop" s={18} />{t('walk.stop')}</button><button className="btn ghost" onClick={() => timer.stop(false)}>{t('common.cancel')}</button></div>
        : <button className="btn primary" onClick={timer.start}><Icon n="play" s={18} />{t('walk.start')}</button>}
      <p className="tiny muted">{t('walk.bgNote')}</p>
    </section>
    <section className="card stack tight"><div className="row between"><h2>{t('walk.today')}</h2><b className="num">{nf(todayMin)} / {goal} {t('unit.min')}</b></div><Bar value={todayMin} max={goal} color="var(--warn)" />
      <p className="small muted">{t('walk.kind')}</p></section>
    <section className="card"><h2>{t('common.last7')}</h2><div className="chart"><ResponsiveContainer><BarChart data={week}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={30} /><Tooltip /><ReferenceLine y={goal} stroke="var(--warn)" strokeDasharray="4 4" /><RBar dataKey="min" fill="var(--warn)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="card stack"><h2>{t('walk.manual')}</h2>
      <div className="grid2"><label className="field">{t('walk.minutes')}<input type="number" value={manual} onChange={e => setManual(e.target.value)} /></label>
        <label className="field">{t('walk.steps')}<input type="number" value={steps} onChange={e => setSteps(e.target.value)} /></label></div>
      <p className="tiny muted">{t('walk.stepsNote')}</p>
      {err && <p className="err">{err}</p>}<button className="btn" onClick={addManual}>{t('common.add')}</button></section>
    <section className="card stack"><h2>{t('walk.goal')}</h2><div className="row"><input type="number" min={5} max={300} value={g} onChange={e => setG(e.target.value)} aria-label={t('walk.goal')} />
      <button className="btn" onClick={async () => { const v = Number(g); if (v >= 5 && v <= 300) { await saveProfile({ walk_goal_min: v }); toast(t('common.saved'), 'ok'); } }}>{t('common.save')}</button></div></section>
    <section className="card"><h2>{t('walk.history')}</h2>{data.activity_logs.length ? <div className="list">{[...data.activity_logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(a => <div className="li" key={a.id}>
      <span className="grow">{df(a.date)} · {nf(a.minutes)} {t('unit.min')}{a.steps ? ` · ${nf(a.steps)} ${t('walk.stepsShort')}` : ''}</span>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('activity_logs', a.id)}><Icon n="trash" s={16} /></button></div>)}</div> : <Empty>{t('walk.none')}</Empty>}</section>
  </Page>;
}

// ---------------- Sleep ----------------
export function Sleep() {
  const { t, df, nf } = useI18n(); const { data, insert, remove, profile, toast } = useApp();
  const [date, setDate] = useState(isoDate()); const [hours, setHours] = useState('7.5'); const [q, setQ] = useState(3); const [note, setNote] = useState(''); const [err, setErr] = useState('');
  if (!profile?.enable_sleep) return <OptIn title={t('nav.sleep')} field="enable_sleep" />;
  const rows = [...data.sleep_logs].sort((a, b) => b.date.localeCompare(a.date));
  const week = lastNDays(7).map(d => ({ d: df(d, { weekday: 'short' }), h: Number(data.sleep_logs.find(s => s.date === d)?.hours ?? 0) }));
  const save = async () => { setErr(''); try { await insert('sleep_logs', { date, hours: Number(hours), quality: q, note }); setNote(''); toast(t('common.saved'), 'ok'); } catch (e) { setErr(errMsg(e)); } };
  return <Page title={t('nav.sleep')} back>
    <section className="card stack">
      <div className="grid2"><label className="field">{t('common.date')}<input type="date" value={date} max={isoDate()} onChange={e => setDate(e.target.value)} /></label>
        <label className="field">{t('sleep.hours')}<input type="number" step="0.25" min={0} max={24} value={hours} onChange={e => setHours(e.target.value)} /></label></div>
      <div className="field">{t('sleep.quality')}<div className="chips">{[1, 2, 3, 4, 5].map(n => <button key={n} className={`chip ${q === n ? 'on' : ''}`} onClick={() => setQ(n)}>{t('sleep.q' + n)}</button>)}</div></div>
      <label className="field">{t('common.note')}<input value={note} onChange={e => setNote(e.target.value)} /></label>
      {err && <p className="err">{err}</p>}<button className="btn primary" onClick={save}>{t('common.save')}</button>
      <p className="tiny muted">{t('sleep.disclaimer')}</p>
    </section>
    <section className="card"><h2>{t('common.last7')}</h2><div className="chart"><ResponsiveContainer><BarChart data={week}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={30} /><Tooltip /><RBar dataKey="h" fill="#8d84c4" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="card"><h2>{t('sleep.history')}</h2>{rows.length ? <div className="list">{rows.slice(0, 30).map(s => <div className="li" key={s.id}><Icon n="moon" s={18} />
      <span className="grow">{df(s.date)} · {nf(s.hours, 2)} h · {t('sleep.q' + s.quality)}{s.note ? ` · ${s.note}` : ''}</span>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('sleep_logs', s.id)}><Icon n="trash" s={16} /></button></div>)}</div> : <Empty>{t('common.noData')}</Empty>}</section>
  </Page>;
}

// ---------------- Period ----------------
export const SYMPTOMS = ['cramps', 'bloating', 'headache', 'fatigue', 'tender', 'acne', 'backpain', 'nausea'];
export function Period() {
  const { t, df } = useI18n(); const { data, insert, update, remove, profile, toast } = useApp();
  const [start, setStart] = useState(isoDate()); const [end, setEnd] = useState(''); const [sym, setSym] = useState<string[]>([]);
  const [appetite, setAppetite] = useState(''); const [mood, setMood] = useState(''); const [err, setErr] = useState('');
  if (!profile?.enable_period) return <OptIn title={t('nav.period')} field="enable_period" />;
  const rows = [...data.period_logs].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const save = async () => {
    setErr(''); if (end && end < start) return setErr(t('period.endBefore'));
    try { await insert('period_logs', { start_date: start, end_date: end || null, symptoms: sym, appetite: appetite || null, mood: mood || null }); setSym([]); toast(t('common.saved'), 'ok'); } catch (e) { setErr(errMsg(e)); }
  };
  const lengths = rows.slice(0, -1).map((r, i) => (new Date(r.start_date).getTime() - new Date(rows[i + 1].start_date).getTime()) / 86400000).filter(x => x > 0 && x < 90);
  const avg = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null;
  return <Page title={t('nav.period')} back>
    <section className="card stack">
      <div className="grid2"><label className="field">{t('period.start')}<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="field">{t('period.end')}<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label></div>
      <div className="field">{t('period.symptoms')}<div className="chips">{SYMPTOMS.map(s => <button key={s} className={`chip ${sym.includes(s) ? 'on' : ''}`} onClick={() => setSym(x => x.includes(s) ? x.filter(y => y !== s) : [...x, s])}>{t('sym.' + s)}</button>)}</div></div>
      <div className="grid2"><label className="field">{t('period.appetite')}<select value={appetite} onChange={e => setAppetite(e.target.value)}><option value="">—</option>{['lower', 'usual', 'higher'].map(a => <option key={a} value={a}>{t('period.app.' + a)}</option>)}</select></label>
        <label className="field">{t('period.mood')}<select value={mood} onChange={e => setMood(e.target.value)}><option value="">—</option>{MOODS.map(m => <option key={m} value={m}>{t('mood.' + m)}</option>)}</select></label></div>
      {err && <p className="err">{err}</p>}<button className="btn primary" onClick={save}>{t('common.save')}</button>
      <p className="tiny muted">{t('period.disclaimer')}</p>
    </section>
    {avg && <div className="card soft small">{t('period.avg', { d: avg })}</div>}
    <section className="card"><h2>{t('period.history')}</h2>{rows.length ? <div className="list">{rows.map(r => <div className="li" key={r.id}>
      <div className="grow"><b>{df(r.start_date)}{r.end_date ? ` → ${df(r.end_date)}` : ''}</b><div className="tiny muted">{(r.symptoms ?? []).map((s: string) => t('sym.' + s)).join(', ')}{r.appetite ? ` · ${t('period.appetite')}: ${t('period.app.' + r.appetite)}` : ''}{r.mood ? ` · ${t('mood.' + r.mood)}` : ''}</div></div>
      {!r.end_date && <button className="btn sm" onClick={() => update('period_logs', r.id, { end_date: isoDate() })}>{t('period.endToday')}</button>}
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('period_logs', r.id)}><Icon n="trash" s={16} /></button></div>)}</div> : <Empty>{t('common.noData')}</Empty>}</section>
  </Page>;
}
export const MOODS = ['calm', 'happy', 'tired', 'stressed', 'sad', 'anxious', 'irritable', 'bored'];

function OptIn({ title, field }: { title: string; field: 'enable_sleep' | 'enable_period' }) {
  const { t } = useI18n(); const { saveProfile, profile } = useApp(); const [c, setC] = useState(!!profile?.consent_sensitive);
  return <Page title={title} back><section className="card stack"><p>{t('optin.text')}</p>
    <label className="check"><input type="checkbox" checked={c} onChange={e => setC(e.target.checked)} /><span className="small">{t('p.consent')}</span></label>
    <button className="btn primary" disabled={!c} onClick={() => saveProfile({ [field]: true, consent_sensitive: true, consent_at: profile?.consent_at ?? new Date().toISOString() } as any)}>{t('optin.enable')}</button></section></Page>;
}
