import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { addDays, goalProgress, isoDate, lastNDays, monthlyAverages, startOfWeek, sumNutrients, weeklyAverages, weeklyReport } from '../lib/nutrition';
import { backend } from '../lib/store';
import { WEIGHT_NOTE, t4 } from '../data/content';
import { Bar, Confirm, Empty, Icon, Modal, Page, Seg, errMsg, useFmt } from '../components/ui';

export function ProgressHub() {
  const { t, nf, df } = useI18n(); const { data, targets, profile } = useApp();
  const today = isoDate(); const [week, setWeek] = useState(startOfWeek(today)); const [sel, setSel] = useState(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const kcalOf = (d: string) => sumNutrients(data.diary_entries.filter(e => e.date === d).map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar }))).totals;
  const target = targets?.kcal ?? null; const selT = kcalOf(sel);
  const cols = days.map(d => { const k = kcalOf(d).kcal; return { d, k, pct: target ? Math.round((k / target) * 100) : null }; });
  const maxPct = Math.max(110, ...cols.map(c => c.pct ?? 0));
  const walkWeek = days.map(d => data.activity_logs.filter(a => a.date === d).reduce((s, a) => s + Number(a.minutes), 0));
  const walkMax = Math.max(1, ...walkWeek);
  const weights = [...data.weight_logs].filter(w => w.weight_kg).sort((a, b) => a.date.localeCompare(b.date));
  const lastW = weights.length ? Number(weights[weights.length - 1].weight_kg) : null;
  const wSpark = weights.slice(-10).map(w => Number(w.weight_kg)); const wMin = Math.min(...wSpark), wMax = Math.max(...wSpark);
  const waterSel = data.water_logs.filter(w => w.date === sel).reduce((a, w) => a + Number(w.ml), 0);
  const glassGoal = Math.max(1, Math.round((targets?.waterMl ?? 2000) / 250)); const glasses = Math.floor(waterSel / 250);
  const tiles = [{ to: '/progress/weight', i: '⚖️', k: 'weight' }, { to: '/progress/nutrition', i: '📊', k: 'nutritionCharts' }, { to: '/progress/activity', i: '🚶‍♀️', k: 'activity' }, { to: '/progress/report', i: '📝', k: 'report' }];
  return <Page title={t('stats.title')}>
    <section className="card">
      <div className="row between"><b>{t('stats.calories')}</b><div className="row" style={{ gap: 6 }}>
        <button className="navarrow" aria-label={t('common.prev')} onClick={() => setWeek(addDays(week, -7))}><Icon n="back" s={16} className="flip" /></button>
        <button className="navarrow" aria-label={t('common.next')} disabled={addDays(week, 7) > today} onClick={() => setWeek(addDays(week, 7))}><Icon n="next" s={16} className="flip" /></button></div></div>
      <div className="row between" style={{ alignItems: 'flex-end', marginTop: 6 }}>
        <span className="statbig" data-testid="stat-kcal">{nf(selT.kcal)}<small>{t('unit.kcal')}</small></span>
        <span className="small muted">{t('stats.target')}: <b style={{ color: 'var(--text)' }}>{target ? nf(target) : '—'}</b> {t('unit.kcal')}</span></div>
      <p className="tiny muted" style={{ marginTop: 4 }}>{df(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <div className="bars" role="list">{cols.map(c => <button key={c.d} role="listitem" className={`bcol ${c.d === sel ? 'on' : ''}`} disabled={c.d > today} onClick={() => setSel(c.d)} aria-label={`${df(c.d)}: ${nf(c.k)} kcal`}>
        <span className="pct">{c.pct !== null && c.k > 0 ? `${c.pct}%` : ''}</span>
        <div className="bstack"><div className="btarget" style={{ height: `${(100 / maxPct) * 100}%` }} />{c.k > 0 && <div className="bfill" style={{ height: `${Math.min(100, ((c.pct ?? 0) / maxPct) * 100)}%` }} />}</div>
        <span className="dl">{df(c.d, { weekday: 'short' })}</span></button>)}</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>{t('stats.barsNote')}</p>
    </section>
    <div className="grid2">
      <Link to="/progress/activity" className="metric"><div className="top"><span className="row" style={{ gap: 8 }}><span className="mi" style={{ background: '#dff5ea' }}>🏃‍♀️</span>{t('stats.exercise')}</span></div>
        <div className="spark">{walkWeek.map((m, i) => <i key={i} style={{ height: `${(m / walkMax) * 100}%`, opacity: days[i] === sel ? 1 : .55 }} />)}</div>
        <span className="val">{nf(walkWeek.reduce((a, b) => a + b, 0) / 60, 1)}<small>{t('stats.hoursWeek')}</small></span></Link>
      <Link to="/food/sugar" className="metric"><div className="top"><span className="row" style={{ gap: 8 }}><span className="mi" style={{ background: '#ffe3e3' }}>🍬</span>{t('n.addedSugar')}</span></div>
        <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${targets?.addedSugarMaxG ? Math.min(100, selT.addedSugar / targets.addedSugarMaxG * 100) : 0}%`, background: 'var(--c-sugar)' }} /></div>
        <span className="val">{nf(selT.addedSugar, 1)}<small>/ {targets?.addedSugarMaxG ?? '—'} g</small></span></Link>
      <Link to="/progress/weight" className="metric"><div className="top"><span className="row" style={{ gap: 8 }}><span className="mi" style={{ background: '#fdeadb' }}>⚖️</span>{t('nav.weight')}</span></div>
        {profile?.track_weight === false ? <span className="small muted">{t('weight.pause')}</span> : <>
        {wSpark.length >= 2 ? <div className="spark">{wSpark.map((w, i) => <i key={i} style={{ height: `${wMax > wMin ? 25 + ((w - wMin) / (wMax - wMin)) * 75 : 60}%`, background: '#f2a35e' }} />)}</div> : <div className="spark" />}
        <span className="val">{lastW !== null ? nf(lastW, 1) : '—'}<small>kg</small></span></>}</Link>
      <Link to="/wellness/water" className="metric"><div className="top"><span className="row" style={{ gap: 8 }}><span className="mi" style={{ background: '#dcefff' }}>💧</span>{t('nav.water')}</span></div>
        <div className="drops" aria-hidden="true">{Array.from({ length: Math.min(glassGoal, 10) }, (_, i) => <span key={i} className={i < glasses ? 'on' : ''}>💧</span>)}</div>
        <span className="val">{glasses}<small>/ {glassGoal} {t('home.glass')}</small></span></Link>
    </div>
    <div className="grid2">{tiles.map(x => <Link key={x.to} to={x.to} className="tile t-green"><span className="ti">{x.i}</span><b>{t('nav.' + x.k)}</b><span>{t('hub.' + x.k)}</span></Link>)}</div>
  </Page>;
}

async function resizeImage(file: File, max = 1080): Promise<Blob> {
  const img = await createImageBitmap(file); const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('image')), 'image/jpeg', 0.82));
}
function Photo({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { backend.photoUrl(path).then(setUrl); }, [path]);
  return url ? <img src={url} alt="" loading="lazy" /> : <div style={{ aspectRatio: '3/4', background: 'var(--surface-2)', borderRadius: 12 }} />;
}

export function Weight() {
  const { t, nf, df } = useI18n(); const { data, insert, remove, profile, saveProfile, user, toast } = useApp(); const fmt = useFmt();
  const [f, setF] = useState<any>({ date: isoDate(), weight_kg: '', waist_cm: '', hips_cm: '', chest_cm: '', arm_cm: '', thigh_cm: '', note: '' });
  const [more, setMore] = useState(false); const [photo, setPhoto] = useState<File | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<'30' | '90' | 'all'>('90'); const [del, setDel] = useState<any>(null); const [photoConsent, setPhotoConsent] = useState(false); const [view, setView] = useState<string | null>(null);
  const rows = [...data.weight_logs].sort((a, b) => a.date.localeCompare(b.date));
  const pts = rows.filter(r => r.weight_kg).map(r => ({ date: r.date, weightKg: Number(r.weight_kg) }));
  const since = range === 'all' ? '0000' : addDays(isoDate(), -Number(range));
  const shown = pts.filter(p => p.date >= since);
  const weekly = weeklyAverages(pts); const monthly = monthlyAverages(pts);
  const start = Number(profile?.start_weight_kg ?? pts[0]?.weightKg ?? 0); const current = pts.length ? pts[pts.length - 1].weightKg : null; const target = profile?.target_weight_kg ? Number(profile.target_weight_kg) : null;
  const prog = current !== null && target ? goalProgress(start, current, target) : null;
  const paused = profile?.track_weight === false;
  const save = async () => {
    setErr('');
    const n = (v: any) => (v === '' || v === null ? null : Number(v));
    if (!f.weight_kg && !f.waist_cm && !photo) return setErr(t('weight.needOne'));
    if (photo && !photoConsent) return setErr(t('weight.photoConsent'));
    setBusy(true);
    try {
      let photo_path = null; if (photo) photo_path = await backend.uploadPhoto(user!.id, await resizeImage(photo));
      await insert('weight_logs', { date: f.date, weight_kg: n(f.weight_kg), waist_cm: n(f.waist_cm), hips_cm: n(f.hips_cm), chest_cm: n(f.chest_cm), arm_cm: n(f.arm_cm), thigh_cm: n(f.thigh_cm), note: f.note || null, photo_path });
      if (f.weight_kg && f.date >= (rows[rows.length - 1]?.date ?? '')) await saveProfile({ weight_kg: Number(f.weight_kg) });
      setF({ ...f, weight_kg: '', waist_cm: '', hips_cm: '', chest_cm: '', arm_cm: '', thigh_cm: '', note: '' }); setPhoto(null); toast(t('common.saved'), 'ok');
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  if (paused) return <Page title={t('nav.weight')} back><section className="card stack"><p>{t('weight.paused')}</p><button className="btn primary" onClick={() => saveProfile({ track_weight: true })}>{t('weight.resume')}</button></section></Page>;
  return <Page title={t('nav.weight')} back actions={<button className="btn sm ghost" onClick={() => saveProfile({ track_weight: false })}>{t('weight.pause')}</button>}>
    <div className="grid3">
      <div className="card center"><div className="tiny muted">{t('weight.current')}</div><b className="num" data-testid="weight-current">{current !== null ? `${nf(current, 1)} kg` : '—'}</b></div>
      <div className="card center"><div className="tiny muted">{t('weight.start')}</div><b className="num">{start ? `${nf(start, 1)} kg` : '—'}</b></div>
      <div className="card center"><div className="tiny muted">{t('weight.target')}</div><b className="num">{target ? `${nf(target, 1)} kg` : '—'}</b></div>
    </div>
    {prog !== null && <section className="card stack tight"><div className="row between small"><span>{t('weight.goalProgress')}</span><b>{prog}%</b></div><Bar value={prog} max={100} /></section>}
    <section className="card stack"><h2>{t('weight.add')}</h2>
      <div className="grid2"><label className="field">{t('common.date')}<input type="date" value={f.date} max={isoDate()} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <label className="field">{t('p.weight')}<input data-testid="weight-input" type="number" step="0.1" inputMode="decimal" value={f.weight_kg} onChange={e => setF({ ...f, weight_kg: e.target.value })} /></label>
        <label className="field">{t('weight.waist')}<input type="number" step="0.5" value={f.waist_cm} onChange={e => setF({ ...f, waist_cm: e.target.value })} /></label>
        <label className="field">{t('weight.photo')}<input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} /></label></div>
      {photo && <label className="check"><input type="checkbox" checked={photoConsent} onChange={e => setPhotoConsent(e.target.checked)} /><span className="small">{t('weight.photoConsentLabel')}</span></label>}
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>{more ? t('common.less') : t('weight.moreMeasures')}</button>
      {more && <div className="grid2">{(['hips_cm', 'chest_cm', 'arm_cm', 'thigh_cm'] as const).map(k => <label className="field" key={k}>{t('weight.' + k)}<input type="number" step="0.5" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
        <label className="field" style={{ gridColumn: '1/-1' }}>{t('common.note')}<input value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></label></div>}
      {err && <p className="err">{err}</p>}<button className="btn primary" disabled={busy} onClick={save}>{t('common.save')}</button></section>
    <div className="card soft small">{t4(WEIGHT_NOTE, useI18n().lang)}</div>
    <section className="card"><div className="row between"><h2>{t('weight.history')}</h2><Seg value={range} onChange={setRange} options={[{ id: '30', label: '30 d' }, { id: '90', label: '90 d' }, { id: 'all', label: t('common.all') }]} /></div>
      {shown.length >= 2 ? <div className="chart"><ResponsiveContainer><LineChart data={shown.map(p => ({ d: df(p.date), w: p.weightKg }))}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} width={36} /><Tooltip />
        {target && <ReferenceLine y={target} stroke="var(--green)" strokeDasharray="4 4" />}<Line type="monotone" dataKey="w" stroke="var(--green-dark)" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <Empty>{t('weight.needTwo')}</Empty>}</section>
    <section className="card"><h2>{t('weight.weekly')}</h2>{weekly.length ? <><div className="chart" style={{ height: 180 }}><ResponsiveContainer><LineChart data={weekly.slice(-16).map(w => ({ d: df(w.week), avg: w.avg }))}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} width={36} tick={{ fontSize: 11 }} /><Tooltip /><Line dataKey="avg" stroke="#8d84c4" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>
      <div className="list small">{monthly.slice(-6).reverse().map(m => <div className="li" key={m.month}><span className="grow">{df(m.month + '-01', { month: 'long', year: 'numeric' })}</span><span className="num">{nf(m.avg, 1)} kg</span><span className="tiny muted">({m.n})</span></div>)}</div></> : <Empty>{t('common.noData')}</Empty>}
      <p className="tiny muted" style={{ marginTop: 6 }}>{t('weight.monthlyNote')}</p></section>
    {rows.some(r => r.photo_path) && <section className="card"><h2>{t('weight.photos')}</h2><p className="tiny muted">{t('weight.photosPrivate')}</p><div className="photo-grid" style={{ marginTop: 8 }}>{rows.filter(r => r.photo_path).map(r => <button key={r.id} onClick={() => setView(r.photo_path)} style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer' }}><Photo path={r.photo_path} /><div className="tiny muted">{df(r.date)}</div></button>)}</div></section>}
    <section className="card"><h2>{t('weight.entries')}</h2>{rows.length ? <div className="list">{[...rows].reverse().map(r => <div className="li" key={r.id}>
      <div className="grow"><b>{df(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</b><div className="tiny muted">{r.weight_kg ? `${nf(r.weight_kg, 1)} kg` : ''}{r.waist_cm ? ` · ${t('weight.waist')} ${fmt(r.waist_cm, 'g').replace(/ .*/, '')} cm` : ''}{r.photo_path ? ' · 📷' : ''}{r.note ? ` · ${r.note}` : ''}</div></div>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => setDel(r)}><Icon n="trash" s={15} /></button></div>)}</div> : <Empty>{t('common.noData')}</Empty>}</section>
    <Confirm open={!!del} text={t('weight.confirmDelete')} onNo={() => setDel(null)} onYes={async () => { if (del.photo_path) await backend.removePhoto(del.photo_path); await remove('weight_logs', del.id); setDel(null); }} />
    {view && <Modal open onClose={() => setView(null)} title={t('weight.photo')}><Photo path={view} /></Modal>}
  </Page>;
}

export function NutritionCharts() {
  const { t, df, nf } = useI18n(); const { data, targets } = useApp(); const fmt = useFmt(); const [n, setN] = useState<'7' | '14' | '30'>('14');
  const days = lastNDays(Number(n));
  const rows = days.map(d => { const es = data.diary_entries.filter(e => e.date === d);
    const s = sumNutrients(es.map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar })));
    return { d: df(d, Number(n) <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'numeric' }), logged: es.length > 0, kcal: es.length ? s.totals.kcal : null, protein: s.totals.protein * 4, carbs: s.totals.carbs * 4, fat: s.totals.fat * 9, fiber: s.totals.fiber }; });
  const logged = rows.filter(r => r.logged);
  const avg = (k: 'kcal' | 'fiber') => logged.length ? Math.round(logged.reduce((a, r) => a + (r[k] ?? 0), 0) / logged.length) : null;
  return <Page title={t('nav.nutritionCharts')} back>
    <Seg value={n} onChange={setN} options={[{ id: '7', label: '7 d' }, { id: '14', label: '14 d' }, { id: '30', label: '30 d' }]} />
    <section className="card"><h2>{t('charts.kcal')}</h2>{logged.length ? <div className="chart"><ResponsiveContainer><BarChart data={rows}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis width={40} tick={{ fontSize: 11 }} /><Tooltip />
      {targets?.kcal && <ReferenceLine y={targets.kcal} stroke="var(--green)" strokeDasharray="4 4" />}<RBar dataKey="kcal" fill="var(--green-dark)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty>{t('common.noData')}</Empty>}
      <p className="small">{t('charts.avg', { k: avg('kcal') !== null ? nf(avg('kcal')) : '—', d: logged.length })}</p></section>
    <section className="card"><h2>{t('charts.energySplit')}</h2>{logged.length ? <div className="chart"><ResponsiveContainer><BarChart data={rows}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis width={40} tick={{ fontSize: 11 }} /><Tooltip /><Legend formatter={v => t('n.' + v)} />
      <RBar dataKey="protein" stackId="a" fill="var(--c-protein)" /><RBar dataKey="carbs" stackId="a" fill="var(--c-carbs)" /><RBar dataKey="fat" stackId="a" fill="var(--c-fat)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty>{t('common.noData')}</Empty>}
      <p className="tiny muted">{t('charts.energyNote')}</p></section>
    <section className="card"><h2>{t('n.fiber')}</h2><p className="small">{t('charts.fiberAvg', { g: fmt(avg('fiber')), t: targets?.fiber ?? '—' })}</p></section>
  </Page>;
}

export function ActivityHistory() {
  const { t, df, nf } = useI18n(); const { data, profile } = useApp();
  const days = lastNDays(30);
  const rows = days.map(d => ({ d: df(d, { day: 'numeric', month: 'numeric' }), walk: Math.round(data.activity_logs.filter(a => a.date === d).reduce((s, a) => s + Number(a.minutes), 0)),
    water: Math.round(data.water_logs.filter(a => a.date === d).reduce((s, a) => s + Number(a.ml), 0) / 100) / 10 }));
  const active = rows.filter(r => r.walk > 0).length; const total = rows.reduce((a, r) => a + r.walk, 0);
  return <Page title={t('nav.activity')} back>
    <div className="grid2"><div className="card center"><div className="tiny muted">{t('activity.activeDays')}</div><b className="big num">{active}</b><div className="tiny muted">/ 30</div></div>
      <div className="card center"><div className="tiny muted">{t('activity.totalMin')}</div><b className="big num">{nf(total)}</b><div className="tiny muted">{t('unit.min')}</div></div></div>
    <section className="card"><h2>{t('nav.walk')}</h2><div className="chart"><ResponsiveContainer><BarChart data={rows}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 9 }} /><YAxis width={30} tick={{ fontSize: 11 }} /><Tooltip /><ReferenceLine y={profile?.walk_goal_min ?? 30} stroke="var(--warn)" strokeDasharray="4 4" /><RBar dataKey="walk" fill="var(--warn)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="card"><h2>{t('nav.water')} (L)</h2><div className="chart"><ResponsiveContainer><BarChart data={rows}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 9 }} /><YAxis width={30} tick={{ fontSize: 11 }} /><Tooltip /><RBar dataKey="water" fill="var(--c-water)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
  </Page>;
}

export function Report() {
  const { t, df, nf } = useI18n(); const { data, targets, profile } = useApp(); const fmt = useFmt();
  const [week, setWeek] = useState(startOfWeek(addDays(isoDate(), -7)));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const r = useMemo(() => {
    const byDay = new Map<string, any[]>(); data.diary_entries.forEach(e => byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]));
    const diary = [...byDay.entries()].map(([date, es]) => { const s = sumNutrients(es.map(x => ({ kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat, fiber: x.fiber, sugar: x.sugar, addedSugar: x.added_sugar })));
      return { date, kcal: s.totals.kcal, protein: s.totals.protein, sugar: s.totals.sugar, addedSugar: s.totals.addedSugar, entries: es.length }; });
    return weeklyReport({ days, diary, water: data.water_logs.map(w => ({ date: w.date, ml: Number(w.ml) })), walks: data.activity_logs.map(a => ({ date: a.date, minutes: Number(a.minutes) })),
      weights: data.weight_logs.filter(w => w.weight_kg).map(w => ({ date: w.date, weightKg: Number(w.weight_kg) })), journalDates: [...data.mood_journal, ...data.craving_journal].map(j => j.date) });
  }, [data, week]); // eslint-disable-line
  const msgs: string[] = [];
  if (r.daysWithMeals === 0) msgs.push(t('report.msgNoMeals'));
  else if (r.daysWithMeals >= 5) msgs.push(t('report.msgConsistent', { n: r.daysWithMeals }));
  else msgs.push(t('report.msgSome', { n: r.daysWithMeals }));
  if (r.totalWalkMin >= (profile?.walk_goal_min ?? 30) * 5) msgs.push(t('report.msgWalkGood'));
  if (r.avgWaterMl !== null && targets && r.avgWaterMl < targets.waterMl * 0.6) msgs.push(t('report.msgWater'));
  if (r.avgAddedSugar !== null && targets?.addedSugarMaxG && r.avgAddedSugar > targets.addedSugarMaxG) msgs.push(t('report.msgSugar'));
  if (r.journalEntries > 0) msgs.push(t('report.msgJournal'));
  const val = (v: number | null, u: 'kcal' | 'g' | 'ml' = 'g') => (v === null ? t('report.noData') : fmt(v, u));
  return <Page title={t('nav.report')} back>
    <div className="row between card" style={{ padding: 8 }}>
      <button className="iconbtn" aria-label={t('common.prev')} onClick={() => setWeek(addDays(week, -7))}><Icon n="back" className="flip" /></button>
      <b>{df(week)} – {df(addDays(week, 6))}</b>
      <button className="iconbtn" aria-label={t('common.next')} disabled={addDays(week, 7) > isoDate()} onClick={() => setWeek(addDays(week, 7))}><Icon n="next" className="flip" /></button></div>
    <section className="card"><dl className="kv" data-testid="report">
      <dt>{t('report.daysLogged')}</dt><dd>{r.daysWithMeals} / 7</dd>
      <dt>{t('report.avgKcal')}</dt><dd>{val(r.avgKcal, 'kcal')}</dd>
      <dt>{t('report.avgProtein')}</dt><dd>{val(r.avgProtein)}</dd>
      <dt>{t('report.avgSugar')}</dt><dd>{val(r.avgSugar)}</dd>
      <dt>{t('report.avgAdded')}</dt><dd>{val(r.avgAddedSugar)}</dd>
      <dt>{t('report.water')}</dt><dd>{r.avgWaterMl === null ? t('report.noData') : `${nf(r.avgWaterMl)} ml ${t('report.perDay')} (${r.daysWithWater} d)`}</dd>
      <dt>{t('report.walk')}</dt><dd>{r.daysWithWalk ? `${nf(r.totalWalkMin)} ${t('unit.min')} (${r.daysWithWalk} d)` : t('report.noData')}</dd>
      <dt>{t('report.weight')}</dt><dd>{r.weightChange === null ? (r.weightEnd !== null ? `${nf(r.weightEnd, 1)} kg` : t('report.noData')) : `${r.weightChange > 0 ? '+' : ''}${nf(r.weightChange, 1)} kg`}</dd>
      <dt>{t('report.journal')}</dt><dd>{r.journalEntries}</dd>
    </dl></section>
    <section className="card soft stack">{msgs.map((m, i) => <p key={i} className="small">{m}</p>)}</section>
    <p className="tiny muted">{t('report.note')}</p>
  </Page>;
}
