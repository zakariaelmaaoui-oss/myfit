import { useEffect, useState } from 'react';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { isoDate, lastNDays } from '../lib/nutrition';
import { estimateWalk } from '../lib/activity';
import { walkSession } from '../lib/walk';
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
export function useWalkTimer() {
  const { insert, toast, profile } = useApp(); const { t } = useI18n();
  const [, force] = useState(0);
  useEffect(() => { walkSession.resume(); return walkSession.subscribe(() => force(x => x + 1)); }, []);
  const start = walkSession.startedAt();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!start) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [start]);
  const elapsed = start ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
  const label = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const steps = walkSession.steps(); const sensor = walkSession.sensor();
  const est = profile ? estimateWalk({ minutes: elapsed / 60, steps: sensor === 'on' ? steps : null, weightKg: profile.weight_kg, heightCm: profile.height_cm, sex: profile.sex }) : null;
  return {
    running: !!start, elapsed, label, steps, sensor, estimate: est,
    start: () => { setNow(Date.now()); walkSession.start(); },
    stop: async (save = true) => {
      const r = walkSession.stop(); const mins = Math.round(elapsed / 60 * 10) / 10;
      if (save && mins >= 1 && r.startedAt) {
        const e = profile ? estimateWalk({ minutes: mins, steps: r.sensorWorked ? r.steps : null, weightKg: profile.weight_kg, heightCm: profile.height_cm, sex: profile.sex }) : null;
        await insert('activity_logs', { date: isoDate(new Date(r.startedAt)), minutes: mins, kind: 'walk', started_at: new Date(r.startedAt).toISOString(),
          steps: r.sensorWorked ? r.steps : null, distance_m: e?.distanceM ?? null, kcal_burned: e?.kcal ?? null, source: r.sensorWorked ? 'sensor' : 'timer' });
        toast(t('walk.saved', { min: Math.round(mins) }), 'ok');
      } else if (save) toast(t('walk.tooShort'));
    },
  };
}
export function Walk() {
  const { t, nf, df } = useI18n(); const { data, profile, saveProfile, insert, remove, toast } = useApp(); const timer = useWalkTimer();
  const today = isoDate(); const goal = profile?.walk_goal_min ?? 30;
  const walks = data.activity_logs.filter(a => (a.kind ?? 'walk') === 'walk');
  const todays = walks.filter(a => a.date === today);
  const todayMin = todays.reduce((s, a) => s + Number(a.minutes), 0);
  const todaySteps = todays.reduce((s, a) => s + (Number(a.steps) || 0), 0);
  const todayKcal = todays.reduce((s, a) => s + (Number(a.kcal_burned) || 0), 0);
  const week = lastNDays(7).map(d => ({ d: df(d, { weekday: 'short' }), min: Math.round(walks.filter(a => a.date === d).reduce((s, a) => s + Number(a.minutes), 0)) }));
  const [manual, setManual] = useState(''); const [steps, setSteps] = useState(''); const [g, setG] = useState(String(goal)); const [err, setErr] = useState('');
  const addManual = async () => {
    setErr(''); const m = Number(manual); const s = steps ? Number(steps) : null;
    if (!(m > 0 && m <= 600)) return setErr(t('walk.range'));
    const e = profile ? estimateWalk({ minutes: m, steps: s, weightKg: profile.weight_kg, heightCm: profile.height_cm, sex: profile.sex }) : null;
    try { await insert('activity_logs', { date: today, minutes: m, steps: s, kind: 'walk', distance_m: e?.distanceM ?? null, kcal_burned: e?.kcal ?? null, source: 'manual' }); setManual(''); setSteps(''); toast(t('common.saved'), 'ok'); } catch (x) { setErr(errMsg(x)); }
  };
  const est = timer.estimate;
  return <Page title={t('nav.walk')} back>
    <section className="card center stack walkhero" style={{ alignItems: 'center' }}>
      <span className="timer" data-testid="walk-timer">{timer.label}</span>
      {timer.running && <div className="grid3" style={{ width: '100%' }} data-testid="walk-live">
        <div><div className="tiny muted">{t('walk.stepsLive')}</div><b className="num big2">{timer.sensor === 'on' ? nf(timer.steps) : '—'}</b></div>
        <div><div className="tiny muted">{t('walk.distance')}</div><b className="num big2">{est?.distanceM != null ? `${nf(est.distanceM / 1000, 2)} km` : '—'}</b></div>
        <div><div className="tiny muted">{t('walk.burned')}</div><b className="num big2">{est ? `${nf(est.kcal)} kcal` : '—'}</b></div>
      </div>}
      {timer.running && timer.sensor !== 'on' && <p className="tiny muted">{t(timer.sensor === 'denied' ? 'walk.sensorDenied' : timer.sensor === 'unsupported' ? 'walk.sensorNone' : 'walk.sensorWaiting')}</p>}
      {timer.running ? <div className="row"><button className="btn primary" onClick={() => timer.stop(true)}><Icon n="stop" s={18} />{t('walk.stop')}</button><button className="btn ghost" onClick={() => timer.stop(false)}>{t('common.cancel')}</button></div>
        : <button className="btn primary" onClick={timer.start}><Icon n="play" s={18} />{t('walk.start')}</button>}
      <p className="tiny muted">{t('walk.bgNote')}</p>
    </section>
    <section className="card stack tight"><div className="row between"><h2>{t('walk.today')}</h2><b className="num">{nf(todayMin)} / {goal} {t('unit.min')}</b></div><Bar value={todayMin} max={goal} />
      <div className="grid2" style={{ marginTop: 8 }}>
        <div className="ministat"><span className="mi" style={{ background: 'var(--accent-soft)' }}>👣</span><div><span>{t('walk.steps')}</span><b className="num" data-testid="walk-today-steps">{nf(todaySteps)}</b></div></div>
        <div className="ministat"><span className="mi" style={{ background: 'var(--green-soft)' }}>🔥</span><div><span>{t('walk.burned')}</span><b className="num" data-testid="walk-today-kcal">{nf(todayKcal)} kcal</b></div></div>
      </div>
      <p className="tiny muted">{t('walk.kcalNote')}</p>
      <p className="small muted">{t('walk.kind')}</p></section>
    <section className="card"><h2>{t('common.last7')}</h2><div className="chart"><ResponsiveContainer><BarChart data={week}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={30} /><Tooltip /><ReferenceLine y={goal} stroke="var(--accent)" strokeDasharray="4 4" /><RBar dataKey="min" fill="var(--green)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="card stack"><h2>{t('walk.manual')}</h2>
      <div className="grid2"><label className="field">{t('walk.minutes')}<input type="number" value={manual} onChange={e => setManual(e.target.value)} /></label>
        <label className="field">{t('walk.steps')}<input type="number" value={steps} onChange={e => setSteps(e.target.value)} /></label></div>
      <p className="tiny muted">{t('walk.stepsNote')}</p>
      {err && <p className="err">{err}</p>}<button className="btn" onClick={addManual}>{t('common.add')}</button></section>
    <section className="card stack"><h2>{t('walk.goal')}</h2><div className="row"><input type="number" min={5} max={300} value={g} onChange={e => setG(e.target.value)} aria-label={t('walk.goal')} />
      <button className="btn" onClick={async () => { const v = Number(g); if (v >= 5 && v <= 300) { await saveProfile({ walk_goal_min: v }); toast(t('common.saved'), 'ok'); } }}>{t('common.save')}</button></div></section>
    <section className="card"><h2>{t('walk.history')}</h2>{walks.length ? <div className="list">{[...walks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(a => <div className="li" key={a.id}>
      <span className="grow">{df(a.date)} · {nf(a.minutes)} {t('unit.min')}{a.steps ? ` · ${nf(a.steps)} ${t('walk.stepsShort')}` : ''}{a.kcal_burned ? ` · ${nf(a.kcal_burned)} kcal` : ''}</span>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('activity_logs', a.id)}><Icon n="trash" s={16} /></button></div>)}</div> : <Empty>{t('walk.none')}</Empty>}</section>
  </Page>;
}

export const MOODS = ['calm', 'happy', 'tired', 'stressed', 'sad', 'anxious', 'irritable', 'bored'];
