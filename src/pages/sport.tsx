import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { isoDate, lastNDays } from '../lib/nutrition';
import { activityKcal, workoutKcal } from '../lib/activity';
import { EXERCISES, REST_MET, TIPS, WORKOUTS, getExercise, getWorkout, tx, type Exercise } from '../data/sport';
import { Bar, Empty, Icon, Modal, Page, errMsg } from '../components/ui';

const isSport = (a: any) => a.kind === 'workout' || a.kind === 'exercise';
const blockMet = (ex: string) => (ex === 'rest' ? REST_MET : getExercise(ex)?.met ?? 3);

export function SportHub() {
  const { t, lang, nf, df } = useI18n(); const { data, profile, insert, remove, toast } = useApp();
  const kg = Number(profile?.weight_kg) || 65;
  const today = isoDate();
  const todays = data.activity_logs.filter(a => a.date === today);
  const burnedToday = todays.reduce((s, a) => s + (Number(a.kcal_burned) || 0), 0);
  const week = lastNDays(7);
  const sportWeek = data.activity_logs.filter(a => isSport(a) && week.includes(a.date));
  const [ex, setEx] = useState<Exercise | null>(null);
  const history = [...data.activity_logs].filter(isSport).sort((a, b) => (b.created_at ?? b.date).localeCompare(a.created_at ?? a.date)).slice(0, 15);
  const nameOf = (a: any) => a.kind === 'workout' ? (getWorkout(a.source) ? tx(getWorkout(a.source)!.name, lang) : t('sport.workout')) : (getExercise(a.source) ? tx(getExercise(a.source)!.name, lang) : t('sport.exercise'));
  return <Page title={t('nav.sport')}>
    <section className="sporthero">
      <div className="grow"><span className="small">{t('sport.burnedToday')}</span><b className="statbig" data-testid="sport-burned">{nf(burnedToday)}<small>kcal</small></b>
        <span className="tiny">{t('sport.weekSummary', { n: sportWeek.length, m: nf(sportWeek.reduce((s, a) => s + Number(a.minutes), 0)) })}</span></div>
      <span className="sportemoji">🏋️‍♀️</span>
    </section>

    <div className="row between"><h2>{t('sport.workouts')}</h2></div>
    <div className="stack" data-testid="workouts">{WORKOUTS.map(w => {
      const est = workoutKcal(w.blocks.map(b => ({ met: blockMet(b.ex), sec: b.sec })), kg);
      return <Link key={w.id} to={`/sport/workout/${w.id}`} className="workoutcard">
        <span className="thumb">{w.emoji}</span>
        <div className="grow" style={{ minWidth: 0 }}><b>{tx(w.name, lang)}</b><span className="small muted" style={{ display: 'block' }}>{tx(w.desc, lang)}</span>
          <div className="row wrap" style={{ gap: 6, marginTop: 6 }}><span className="badge lav">≈ {nf(est.kcal)} kcal</span><span className="badge beige">{t('sport.level' + w.level)}</span>
            <span className="badge">{t(w.impact === 'low' ? 'sport.lowImpact' : 'sport.highImpact')}</span></div></div>
        <span className="coachgo"><Icon n="play" s={16} /></span></Link>;
    })}</div>

    <Link to="/sport/tips" className="coachcard"><span className="coachavatar">💡</span><div className="grow"><b>{t('sport.tipsTitle')}</b><span className="small">{t('sport.tipsText')}</span></div><span className="coachgo"><Icon n="next" s={18} className="flip" /></span></Link>

    <section className="card"><h2>{t('sport.library')}</h2><p className="tiny muted">{t('sport.per10', { kg: nf(kg, 1) })}</p>
      <div className="list" data-testid="exercises">{EXERCISES.map(e => <button key={e.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', width: '100%', textAlign: 'start' }} onClick={() => setEx(e)}>
        <span className="thumb sm">{e.emoji}</span><span className="grow"><b>{tx(e.name, lang)}</b><span className="tiny muted" style={{ display: 'block' }}>{t(e.impact === 'low' ? 'sport.lowImpact' : 'sport.highImpact')} · MET {e.met}</span></span>
        <b className="num small" style={{ color: 'var(--pink-strong)' }}>{nf(activityKcal(e.met, kg, 10))} kcal</b></button>)}</div></section>

    <section className="card"><h2>{t('sport.history')}</h2>{history.length ? <div className="list">{history.map(a => <div className="li" key={a.id}>
      <span className="grow">{nameOf(a)}<span className="tiny muted" style={{ display: 'block' }}>{df(a.date)} · {nf(a.minutes, 1)} {t('unit.min')} · {nf(a.kcal_burned ?? 0)} kcal</span></span>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('activity_logs', a.id)}><Icon n="trash" s={15} /></button></div>)}</div> : <Empty>{t('sport.none')}</Empty>}</section>
    <p className="tiny muted center">{t('sport.note')}</p>
    {ex && <ExerciseModal ex={ex} kg={kg} onClose={() => setEx(null)} onLog={async (min) => {
      await insert('activity_logs', { date: today, minutes: min, kind: 'exercise', source: ex.id, kcal_burned: activityKcal(ex.met, kg, min) });
      toast(t('sport.logged', { k: nf(activityKcal(ex.met, kg, min)) }), 'ok'); setEx(null);
    }} />}
  </Page>;
}

function ExerciseModal({ ex, kg, onClose, onLog }: { ex: Exercise; kg: number; onClose: () => void; onLog: (min: number) => Promise<void> }) {
  const { t, lang, nf } = useI18n(); const [min, setMin] = useState('10'); const [err, setErr] = useState('');
  const m = Number(min);
  return <Modal open onClose={onClose} title={`${ex.emoji} ${tx(ex.name, lang)}`}>
    <p>{tx(ex.how, lang)}</p>
    <div className="row wrap" style={{ gap: 6 }}><span className="badge">{t(ex.impact === 'low' ? 'sport.lowImpact' : 'sport.highImpact')}</span><span className="badge beige">{t('sport.level' + ex.level)}</span><span className="badge beige">MET {ex.met}</span></div>
    <label className="field">{t('sport.minutesDone')}<input type="number" min={1} max={300} value={min} onChange={e => setMin(e.target.value)} /></label>
    <div className="card beige row between"><span>{t('sport.estimate')}</span><b className="num">{m > 0 ? nf(activityKcal(ex.met, kg, m)) : 0} kcal</b></div>
    {err && <p className="err">{err}</p>}
    <button className="btn primary" onClick={async () => { if (!(m >= 1 && m <= 300)) return setErr(t('walk.range')); try { await onLog(m); } catch (e) { setErr(errMsg(e)); } }}>{t('sport.log')}</button>
  </Modal>;
}

export function WorkoutPlayer() {
  const { id } = useParams(); const w = getWorkout(id!); const nav = useNavigate();
  const { t, lang, nf } = useI18n(); const { profile, insert, toast } = useApp();
  const kg = Number(profile?.weight_kg) || 65;
  const [idx, setIdx] = useState(0); const [left, setLeft] = useState(w?.blocks[0].sec ?? 0); const [running, setRunning] = useState(false);
  const done = useRef<number[]>([]); const [finished, setFinished] = useState(false); const [saved, setSaved] = useState<{ kcal: number; minutes: number } | null>(null);
  const wake = useRef<any>(null);
  useEffect(() => {
    if (!running) { wake.current?.release?.().catch(() => {}); wake.current = null; return; }
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => { wake.current = l; }).catch(() => {});
    const iv = setInterval(() => {
      done.current[idx] = (done.current[idx] ?? 0) + 1;
      setLeft(l => {
        if (l > 1) return l - 1;
        navigator.vibrate?.(200);
        if (idx + 1 < w!.blocks.length) { setIdx(idx + 1); return w!.blocks[idx + 1].sec; }
        setRunning(false); setFinished(true); return 0;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, idx]); // eslint-disable-line
  if (!w) return <Page title="404" back="/sport"><Empty>{t('recipe.notFound')}</Empty></Page>;
  const block = w.blocks[idx]; const isRest = block.ex === 'rest'; const exo = isRest ? null : getExercise(block.ex)!;
  const next = w.blocks[idx + 1]; const nextEx = next && next.ex !== 'rest' ? getExercise(next.ex) : null;
  const totalSec = w.blocks.reduce((a, b) => a + b.sec, 0); const doneSec = done.current.reduce((a, b) => a + (b ?? 0), 0);
  const progress = () => workoutKcal(w.blocks.map((b, i) => ({ met: blockMet(b.ex), sec: done.current[i] ?? 0 })), kg);
  const save = async () => {
    setRunning(false); const p = progress();
    if (p.minutes < 1) { toast(t('walk.tooShort')); nav('/sport'); return; }
    await insert('activity_logs', { date: isoDate(), minutes: p.minutes, kind: 'workout', source: w.id, kcal_burned: p.kcal });
    setSaved(p); setFinished(true);
  };
  if (saved) return <Page title={tx(w.name, lang)} back="/sport"><section className="sporthero center" style={{ flexDirection: 'column' }}>
    <span className="sportemoji">🎉</span><h2>{t('sport.wellDone')}</h2><b className="statbig" data-testid="workout-kcal">{nf(saved.kcal)}<small>kcal</small></b><span className="small">{nf(saved.minutes, 1)} {t('unit.min')}</span></section>
    <Link className="btn primary" to="/sport">{t('sport.backToSport')}</Link></Page>;
  return <Page title={tx(w.name, lang)} back="/sport">
    <section className={`card center stack player ${isRest ? 'rest' : ''}`} style={{ alignItems: 'center' }} data-testid="player">
      <span className="tiny muted">{t('sport.step', { i: idx + 1, n: w.blocks.length })}</span>
      <span style={{ fontSize: '3.6rem', lineHeight: 1 }}>{isRest ? '😮‍💨' : exo!.emoji}</span>
      <h2 style={{ fontSize: '1.4rem' }}>{isRest ? t('sport.rest') : tx(exo!.name, lang)}</h2>
      <span className="timer">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
      {!isRest && <p className="small muted">{tx(exo!.how, lang)}</p>}
      {next && <p className="small"><b>{t('sport.next')}:</b> {next.ex === 'rest' ? t('sport.rest') : `${nextEx?.emoji} ${tx(nextEx!.name, lang)}`}</p>}
      <div style={{ width: '100%' }}><Bar value={doneSec} max={totalSec} /></div>
      <p className="small">🔥 {nf(progress().kcal)} kcal · {nf(doneSec / 60, 1)} / {nf(totalSec / 60)} {t('unit.min')}</p>
      {finished ? <button className="btn primary" onClick={save}>{t('sport.save')}</button> : <div className="row">
        <button className="btn primary" onClick={() => setRunning(!running)}><Icon n={running ? 'pause' : 'play'} s={18} />{running ? t('sport.pause') : doneSec ? t('sport.resume') : t('common.start')}</button>
        <button className="iconbtn" aria-label={t('sport.skip')} onClick={() => { if (idx + 1 < w.blocks.length) { setIdx(idx + 1); setLeft(w.blocks[idx + 1].sec); } else { setRunning(false); setFinished(true); } }}><Icon n="next" s={18} className="flip" /></button>
      </div>}
      {doneSec > 0 && !finished && <button className="btn ghost sm" onClick={save}>{t('sport.finishSave')}</button>}
    </section>
    <p className="tiny muted center">{t('sport.safety')}</p>
  </Page>;
}

export function SportTips() {
  const { t, lang } = useI18n();
  return <Page title={t('sport.tipsTitle')} back="/sport">
    {TIPS.map((x, i) => <section className="card row" key={i} style={{ alignItems: 'flex-start' }}><span className="thumb sm">{x.emoji}</span>
      <div className="grow"><h3>{tx(x.title, lang)}</h3><p className="small" style={{ marginTop: 4 }}>{tx(x.text, lang)}</p></div></section>)}
  </Page>;
}
