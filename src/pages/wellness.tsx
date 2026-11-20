import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { addDays, isoDate, lastNDays, recipeNutrition, round } from '../lib/nutrition';
import { getFood, foodName } from '../lib/foods';
import { BREATHING, CHECKIN_QUESTIONS, COPING, DETOX_NOTE, DRINKS, DRINK_UNCOUNTED_NOTE, GUIDED_STRESS, HABITS, MSG, POSITIVE_REMINDERS, RELAXATION, STRESS_TIPS, t4 } from '../data/content';
import { Empty, Icon, NutrientTable, Page, Seg, errMsg } from '../components/ui';
import { MOODS } from './tracking';

export function WellnessHub() {
  const { t, lang } = useI18n();
  const tiles = [
    { to: '/sport', i: 'flame', c: 't-rose', k: 'sport' }, { to: '/coach', i: 'smile', c: 't-green', k: 'coach' }, { to: '/wellness/checkin', i: 'heart', c: 't-rose', k: 'checkin' }, { to: '/wellness/journal', i: 'book', c: 't-lav', k: 'journal' },
    { to: '/wellness/stress', i: 'leaf', c: 't-green', k: 'stress' }, { to: '/wellness/breathing', i: 'wind', c: 't-sky', k: 'breathing' },
    { to: '/wellness/habits', i: 'check', c: 't-butter', k: 'habits' }, { to: '/wellness/drinks', i: 'cup', c: 't-peach', k: 'drinks' },
    { to: '/wellness/water', i: 'drop', c: 't-sky', k: 'water' }, { to: '/wellness/walk', i: 'walk', c: 't-peach', k: 'walk' },
  ];
  return <Page title={t('nav.wellness')}>
    <div className="card hero"><b>{t('well.title')}</b><p className="small" style={{ marginTop: 6 }}>{t4(MSG.noGuilt, lang)}</p></div>
    <div className="grid2">{tiles.map(x => <Link key={x.to} to={x.to} className={`tile ${x.c}`}><span className="ti"><Icon n={x.i} /></span><b>{t('nav.' + x.k)}</b>
      <span>{t('hub.' + x.k)}</span></Link>)}</div>
  </Page>;
}

// ---------------- Hunger check-in ----------------
export function CheckIn() {
  const { t, lang } = useI18n(); const { insert, toast } = useApp();
  const [ans, setAns] = useState<Record<string, boolean>>({}); const [done, setDone] = useState<string | null>(null); const [note, setNote] = useState(''); const [craving, setCraving] = useState('');
  const yes = (id: string) => ans[id] === true;
  const category = (): 'physical' | 'emotional' | 'craving' => {
    const emo = CHECKIN_QUESTIONS.filter(q => q.leans === 'emotional' && yes(q.id)).length;
    if (yes('physical') && emo === 0) return 'physical';
    if (emo > 0) return 'emotional';
    if (yes('craving')) return 'craving';
    return 'physical';
  };
  const finish = async () => {
    const c = category();
    try { await insert('mood_journal', { date: isoDate(), time: new Date().toTimeString().slice(0, 5), kind: 'checkin', category: c, answers: ans, note: [craving && `${t('checkin.craving')}: ${craving}`, note].filter(Boolean).join(' — ') || null }); }
    catch (e) { toast(errMsg(e), 'warn'); }
    setDone(c);
  };
  if (done) return <Page title={t('nav.checkin')} back><section className="card soft stack">
    <span className="badge" style={{ alignSelf: 'flex-start' }}>{t('cat3.' + done)}</span>
    <p data-testid="checkin-msg">{t4(done === 'physical' ? MSG.physical : done === 'emotional' ? MSG.emotional : MSG.craving, lang)}</p>
    <p className="small">{t4(MSG.noGuilt, lang)}</p></section>
    <div className="grid2"><Link className="btn" to="/wellness/breathing">{t('nav.breathing')}</Link><Link className="btn" to="/wellness/stress">{t('nav.stress')}</Link>
      <Link className="btn" to="/wellness/journal">{t('journal.write')}</Link><Link className="btn primary" to="/food/diary">{t('nav.diary')}</Link></div>
    <button className="btn ghost" onClick={() => { setAns({}); setDone(null); setNote(''); setCraving(''); }}>{t('checkin.again')}</button>
  </Page>;
  return <Page title={t('nav.checkin')} back>
    <p className="small muted">{t('checkin.intro')}</p>
    {CHECKIN_QUESTIONS.map(q => <section className="card stack tight" key={q.id}><p style={{ fontWeight: 600 }}>{t4(q.q, lang)}</p>
      <div className="row">{[true, false].map(v => <button key={String(v)} className={`chip ${ans[q.id] === v ? 'on' : ''}`} onClick={() => setAns(a => ({ ...a, [q.id]: v }))}>{v ? t('common.yes') : t('common.no')}</button>)}</div>
      {q.id === 'craving' && yes('craving') && <input placeholder={t('checkin.cravingPh')} value={craving} onChange={e => setCraving(e.target.value)} />}
      {q.id === 'trigger' && yes('trigger') && <textarea placeholder={t('checkin.triggerPh')} value={note} onChange={e => setNote(e.target.value)} />}
    </section>)}
    <button className="btn primary" disabled={Object.keys(ans).length < 2} onClick={finish}>{t('checkin.finish')}</button>
  </Page>;
}

// ---------------- Journals & patterns ----------------
export function Journal() {
  const { t, lang, df, nf } = useI18n(); const { data, insert, remove, toast } = useApp();
  const [tab, setTab] = useState<'craving' | 'feelings' | 'patterns'>('craving');
  const [c, setC] = useState({ hunger: 5, craving: '', mood: '', stress: 5, time: new Date().toTimeString().slice(0, 5), reason: '', after: '', loss_of_control: false, distress: false });
  const [entry, setEntry] = useState(''); const [mood, setMood] = useState(''); const [err, setErr] = useState('');
  const since14 = addDays(isoDate(), -13);
  const flags = data.craving_journal.filter(x => x.date >= since14 && (x.loss_of_control || x.distress)).length;
  const saveCraving = async () => {
    setErr(''); try { await insert('craving_journal', { date: isoDate(), time: c.time, hunger: c.hunger, craving: c.craving || null, mood: c.mood || null, stress: c.stress, reason: c.reason || null, feeling_after: c.after || null, loss_of_control: c.loss_of_control, distress: c.distress });
      toast(t('common.saved'), 'ok'); setC({ ...c, craving: '', reason: '', after: '', loss_of_control: false, distress: false }); } catch (e) { setErr(errMsg(e)); }
  };
  const saveFeel = async () => { if (!entry.trim()) return; await insert('mood_journal', { date: isoDate(), time: new Date().toTimeString().slice(0, 5), kind: 'journal', mood: mood || null, note: entry.trim() }); setEntry(''); setMood(''); toast(t('common.saved'), 'ok'); };
  const week = lastNDays(7);
  const wk = data.craving_journal.filter(x => week.includes(x.date));
  const patterns = useMemo(() => {
    const byBucket = ['morning', 'afternoon', 'evening', 'night'].map(b => ({ b: t('journal.' + b), n: wk.filter(x => { const h = Number((x.time ?? '12:00').slice(0, 2)); return b === 'morning' ? h >= 5 && h < 12 : b === 'afternoon' ? h >= 12 && h < 17 : b === 'evening' ? h >= 17 && h < 22 : h >= 22 || h < 5; }).length }));
    const moods = MOODS.map(m => ({ m, n: wk.filter(x => x.mood === m).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
    const cats = (['physical', 'emotional', 'craving'] as const).map(k => ({ k, n: data.mood_journal.filter(x => week.includes(x.date) && x.category === k).length }));
    const avg = (a: number[]) => a.length ? round(a.reduce((s, v) => s + v, 0) / a.length, 1) : null;
    return { byBucket, moods, cats, avgStress: avg(wk.map(x => Number(x.stress)).filter(n => !isNaN(n))), avgHunger: avg(wk.map(x => Number(x.hunger)).filter(n => !isNaN(n))) };
  }, [data.craving_journal, data.mood_journal]); // eslint-disable-line
  const all = [...data.craving_journal.map(x => ({ ...x, _t: 'craving' })), ...data.mood_journal.map(x => ({ ...x, _t: 'mood' }))].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  return <Page title={t('nav.journal')} back>
    {flags >= 3 && <div className="card warn small" role="note" data-testid="pro-support">{t4(MSG.professional, lang)}</div>}
    <Seg value={tab} onChange={setTab} options={[{ id: 'craving', label: t('journal.cravingTab') }, { id: 'feelings', label: t('journal.feelingsTab') }, { id: 'patterns', label: t('journal.patterns') }]} />
    {tab === 'craving' && <section className="card stack">
      <label className="field">{t('journal.hunger')}: {c.hunger}/10<input type="range" min={0} max={10} value={c.hunger} onChange={e => setC({ ...c, hunger: Number(e.target.value) })} /></label>
      <label className="field">{t('journal.craving')}<input value={c.craving} onChange={e => setC({ ...c, craving: e.target.value })} placeholder={t('checkin.cravingPh')} /></label>
      <div className="grid2"><label className="field">{t('journal.mood')}<select value={c.mood} onChange={e => setC({ ...c, mood: e.target.value })}><option value="">—</option>{MOODS.map(m => <option key={m} value={m}>{t('mood.' + m)}</option>)}</select></label>
        <label className="field">{t('journal.time')}<input type="time" value={c.time} onChange={e => setC({ ...c, time: e.target.value })} /></label></div>
      <label className="field">{t('journal.stress')}: {c.stress}/10<input type="range" min={0} max={10} value={c.stress} onChange={e => setC({ ...c, stress: Number(e.target.value) })} /></label>
      <label className="field">{t('journal.reason')}<input value={c.reason} onChange={e => setC({ ...c, reason: e.target.value })} /></label>
      <label className="field">{t('journal.after')}<input value={c.after} onChange={e => setC({ ...c, after: e.target.value })} /></label>
      <label className="check"><input type="checkbox" checked={c.loss_of_control} onChange={e => setC({ ...c, loss_of_control: e.target.checked })} /><span className="small">{t('journal.loc')}</span></label>
      <label className="check"><input type="checkbox" checked={c.distress} onChange={e => setC({ ...c, distress: e.target.checked })} /><span className="small">{t('journal.distress')}</span></label>
      {err && <p className="err">{err}</p>}<button className="btn primary" onClick={saveCraving}>{t('common.save')}</button>
      <p className="tiny muted">{t('journal.private')}</p></section>}
    {tab === 'feelings' && <section className="card stack">
      <label className="field">{t('journal.mood')}<select value={mood} onChange={e => setMood(e.target.value)}><option value="">—</option>{MOODS.map(m => <option key={m} value={m}>{t('mood.' + m)}</option>)}</select></label>
      <label className="field">{t('journal.write')}<textarea value={entry} onChange={e => setEntry(e.target.value)} placeholder={t('journal.writePh')} /></label>
      <button className="btn primary" onClick={saveFeel}>{t('common.save')}</button><p className="tiny muted">{t('journal.private')}</p></section>}
    {tab === 'patterns' && <>
      <section className="card"><h2>{t('journal.weekPatterns')}</h2>{wk.length ? <>
        <div className="chart" style={{ height: 180 }}><ResponsiveContainer><BarChart data={patterns.byBucket}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="b" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={24} tick={{ fontSize: 11 }} /><Tooltip /><RBar dataKey="n" fill="#a18fd6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <dl className="kv"><dt>{t('journal.entries')}</dt><dd>{wk.length}</dd><dt>{t('journal.avgHunger')}</dt><dd>{nf(patterns.avgHunger, 1)}/10</dd><dt>{t('journal.avgStress')}</dt><dd>{nf(patterns.avgStress, 1)}/10</dd>
          {patterns.moods[0] && <><dt>{t('journal.topMood')}</dt><dd>{t('mood.' + patterns.moods[0].m)} ({patterns.moods[0].n})</dd></>}</dl></> : <Empty>{t('common.noData')}</Empty>}</section>
      <section className="card"><h2>{t('journal.checkins')}</h2><dl className="kv">{patterns.cats.map(x => <Fragment key={x.k}><dt>{t('cat3.' + x.k)}</dt><dd>{x.n}</dd></Fragment>)}</dl>
        <p className="tiny muted" style={{ marginTop: 8 }}>{t('journal.noDiagnosis')}</p></section>
    </>}
    {tab !== 'patterns' && <section className="card"><h2>{t('journal.history')}</h2>{all.length ? <div className="list">{all.slice(0, 40).map(x => <div className="li" key={x.id} style={{ alignItems: 'flex-start' }}>
      <div className="grow"><div className="tiny muted">{df(x.date)} · {x.time}{x._t === 'mood' && x.category ? ` · ${t('cat3.' + x.category)}` : ''}{x.mood ? ` · ${t('mood.' + x.mood)}` : ''}</div>
        {x._t === 'craving' ? <div className="small">{t('journal.hunger')} {x.hunger}/10 · {t('journal.stress')} {x.stress}/10{x.craving ? ` · ${x.craving}` : ''}{x.reason ? ` · ${x.reason}` : ''}{x.feeling_after ? ` → ${x.feeling_after}` : ''}</div> : <div className="small">{x.note ?? t('nav.checkin')}</div>}</div>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove(x._t === 'craving' ? 'craving_journal' : 'mood_journal', x.id)}><Icon n="trash" s={15} /></button></div>)}</div> : <Empty>{t('common.noData')}</Empty>}</section>}
  </Page>;
}

// ---------------- Breathing ----------------
export function Breathing() {
  const { t, lang } = useI18n(); const [sel, setSel] = useState(BREATHING[0].id); const ex = BREATHING.find(b => b.id === sel)!;
  const [run, setRun] = useState(false); const [i, setI] = useState(0); const [left, setLeft] = useState(0); const [cycle, setCycle] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!run) return;
    timer.current = window.setInterval(() => setLeft(l => {
      if (l > 1) return l - 1;
      setI(prev => { const ni = (prev + 1) % ex.pattern.length; if (ni === 0) setCycle(c => { if (c + 1 >= ex.cycles) { setRun(false); } return c + 1; }); setLeft(ex.pattern[ni].sec); return ni; });
      return l;
    }), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [run, ex]);
  const start = () => { setI(0); setLeft(ex.pattern[0].sec); setCycle(0); setRun(true); };
  const ph = ex.pattern[i]; const scale = !run ? 0.8 : ph.phase === 'in' ? 1.15 : ph.phase === 'out' ? 0.75 : undefined;
  return <Page title={t('nav.breathing')} back>
    <div className="chips">{BREATHING.map(b => <button key={b.id} className={`chip ${sel === b.id ? 'on' : ''}`} onClick={() => { setSel(b.id); setRun(false); }}>{t4(b.name, lang)}</button>)}</div>
    <section className="card center stack" style={{ alignItems: 'center' }}><p className="small muted">{t4(ex.desc, lang)}</p>
      <div className="breath" style={{ transform: scale ? `scale(${scale})` : undefined, transitionDuration: `${ph.sec}s` }} data-testid="breath-circle">
        <div className="stack tight center"><span>{run ? t('breath.' + ph.phase) : t('breath.ready')}</span>{run && <span className="big num">{left}</span>}</div></div>
      <p className="small muted">{run ? t('breath.cycle', { c: Math.min(cycle + 1, ex.cycles), n: ex.cycles }) : cycle >= ex.cycles ? t('breath.done') : ''}</p>
      {run ? <button className="btn" onClick={() => setRun(false)}><Icon n="stop" s={16} />{t('common.stop')}</button> : <button className="btn primary" onClick={start}><Icon n="play" s={16} />{t('common.start')}</button>}
    </section>
  </Page>;
}

// ---------------- Stress management ----------------
export function Stress() {
  const { t, lang } = useI18n(); const [step, setStep] = useState(-1); const [left, setLeft] = useState(0);
  useEffect(() => {
    if (step < 0 || step >= GUIDED_STRESS.length) return;
    setLeft(GUIDED_STRESS[step].sec);
    const iv = setInterval(() => setLeft(l => { if (l <= 1) { clearInterval(iv); setStep(s => s + 1); return 0; } return l - 1; }), 1000);
    return () => clearInterval(iv);
  }, [step]);
  const reminder = POSITIVE_REMINDERS[new Date().getDay() % POSITIVE_REMINDERS.length];
  return <Page title={t('nav.stress')} back>
    <section className="card hero stack"><h2>{t('stress.guided')}</h2><p className="small">{t('stress.guidedIntro')}</p>
      {step < 0 && <button className="btn primary" onClick={() => setStep(0)}><Icon n="play" s={16} />{t('common.start')}</button>}
      {step >= 0 && step < GUIDED_STRESS.length && <div className="stack" data-testid="stress-step"><div className="row between"><b>{step + 1}/{GUIDED_STRESS.length} · {t4(GUIDED_STRESS[step].title, lang)}</b><span className="num">{left}s</span></div>
        <p>{t4(GUIDED_STRESS[step].text, lang)}</p><div className="row"><button className="btn grow" onClick={() => setStep(-1)}>{t('common.stop')}</button><button className="btn soft grow" onClick={() => setStep(s => s + 1)}>{t('common.next')}</button></div></div>}
      {step >= GUIDED_STRESS.length && <div className="stack"><p>{t('stress.done')}</p><p className="small">{t4(reminder, lang)}</p><button className="btn" onClick={() => setStep(-1)}>{t('checkin.again')}</button></div>}
    </section>
    <section className="card"><h2>{t('stress.relax')}</h2><div className="list">{RELAXATION.map((r, i) => <div className="li" key={i} style={{ alignItems: 'flex-start' }}><Icon n="leaf" /><div><b>{t4(r.title, lang)}</b><p className="small">{t4(r.text, lang)}</p></div></div>)}</div></section>
    <section className="card"><h2>{t('stress.tips')}</h2><ul className="stack tight small" style={{ paddingInlineStart: 18, margin: '8px 0 0' }}>{STRESS_TIPS.map((s, i) => <li key={i}>{t4(s, lang)}</li>)}</ul></section>
    <section className="card"><h2>{t('stress.coping')}</h2><div className="chips" style={{ marginTop: 8 }}>{COPING.map((c, i) => <span key={i} className="badge beige" style={{ fontSize: '.82rem', padding: '6px 10px' }}>{t4(c, lang)}</span>)}</div></section>
    <section className="card"><h2>{t('stress.reminders')}</h2><ul className="stack tight small" style={{ paddingInlineStart: 18, margin: '8px 0 0' }}>{POSITIVE_REMINDERS.map((s, i) => <li key={i}>{t4(s, lang)}</li>)}</ul></section>
    <div className="card beige small">{t('stress.help')}</div>
  </Page>;
}

// ---------------- Habits ----------------
export function Habits() {
  const { t, lang, df } = useI18n(); const { data, insert, remove } = useApp(); const today = isoDate();
  const logs = data.habit_logs; const done = (id: string, d = today) => logs.find(h => h.habit_id === id && h.date === d);
  const toggle = async (id: string) => { const x = done(id); if (x) await remove('habit_logs', x.id); else await insert('habit_logs', { date: today, habit_id: id }); };
  const week = lastNDays(7);
  return <Page title={t('nav.habits')} back>
    <section className="card"><h2>{t('common.today')}</h2><div className="list">{HABITS.map(h => <label className="li check" key={h.id}><input type="checkbox" checked={!!done(h.id)} onChange={() => toggle(h.id)} /><span>{t4(h.label, lang)}</span></label>)}</div></section>
    <section className="card"><h2>{t('common.last7')}</h2><div className="scroll-x"><table className="nt" style={{ minWidth: 420 }}><thead><tr className="tiny muted"><td></td>{week.map(d => <td key={d} className="center">{df(d, { weekday: 'narrow' })}</td>)}</tr></thead>
      <tbody>{HABITS.map(h => <tr key={h.id}><td className="small">{t4(h.label, lang)}</td>{week.map(d => <td key={d} className="center">{done(h.id, d) ? '●' : '·'}</td>)}</tr>)}</tbody></table></div></section>
  </Page>;
}

// ---------------- Healthy drinks ----------------
export function Drinks() {
  const { t, lang } = useI18n();
  return <Page title={t('nav.drinks')} back>
    <div className="card soft small">{t4(DETOX_NOTE, lang)}</div>
    {DRINKS.map(d => { const n = recipeNutrition(d.ingredients, d.servings, id => getFood(id)?.per100g);
      return <section className="card stack" key={d.id}><div className="row between"><h2>{t4(d.name, lang)}</h2><span className="small muted">{t4(d.serving, lang)}</span></div>
        <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>{d.ingredients.map((i, k) => <li key={k}>{foodName(getFood(i.foodId), lang)} — {i.grams} {i.foodId === 'water' || getFood(i.foodId)?.category === 'drinks' ? 'ml' : 'g'}{i.consumed === false ? ` (${t('recipe.notEaten')})` : ''}</li>)}</ul>
        <p className="small">{t4(d.prep, lang)}</p>
        <details><summary className="small" style={{ cursor: 'pointer' }}>{t('drinks.nutrition')}</summary><NutrientTable n={{ ...n.totals }} incomplete={n.incomplete} showNatural={false} /></details>
      </section>; })}
    <p className="tiny muted">{t4(DRINK_UNCOUNTED_NOTE, lang)}</p>
  </Page>;
}
