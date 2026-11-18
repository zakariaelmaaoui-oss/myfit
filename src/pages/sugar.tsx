import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { isoDate, lastNDays, naturalSugar, round, sumNutrients } from '../lib/nutrition';
import { allFoods, foodName, isHighAddedSugar } from '../lib/foods';
import { SUGAR_EDU, t4 } from '../data/content';
import { Bar, Empty, Page, Seg, useFmt } from '../components/ui';

export function Sugar() {
  const { t, lang, nf, df } = useI18n(); const { data, targets, profile, saveProfile, toast } = useApp(); const fmt = useFmt();
  const [tab, setTab] = useState<'today' | 'week' | 'month' | 'learn'>('today');
  const [custom, setCustom] = useState(String(profile?.custom_added_sugar_g ?? ''));
  const dayStats = (d: string) => {
    const rows = data.diary_entries.filter(e => e.date === d);
    const s = sumNutrients(rows.map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar })));
    return { d, rows, total: s.totals.sugar, added: s.totals.addedSugar, natural: s.incomplete.sugar || s.incomplete.addedSugar ? null : naturalSugar(s.totals.sugar, s.totals.addedSugar), incomplete: s.incomplete.sugar || s.incomplete.addedSugar, n: rows.length };
  };
  const today = dayStats(isoDate()); const max = targets?.addedSugarMaxG ?? null;
  const week = lastNDays(7).map(dayStats); const month = lastNDays(30).map(dayStats);
  const logged = month.filter(d => d.n > 0);
  const avg = (arr: number[]) => arr.length ? round(arr.reduce((a, b) => a + b, 0) / arr.length, 1) : null;
  const overDays = max ? logged.filter(d => d.added > max).length : null;
  const high = useMemo(() => allFoods().filter(isHighAddedSugar).sort((a, b) => (b.per100g.addedSugar ?? 0) - (a.per100g.addedSugar ?? 0)), [data.custom_foods]); // eslint-disable-line
  const top = [...today.rows].filter(r => r.sugar).sort((a, b) => (b.sugar ?? 0) - (a.sugar ?? 0)).slice(0, 6);
  return <Page title={t('nav.sugar')} back>
    <Seg value={tab} onChange={setTab} options={[{ id: 'today', label: t('common.today') }, { id: 'week', label: t('sugar.week') }, { id: 'month', label: t('sugar.month') }, { id: 'learn', label: t('sugar.learn') }]} />
    {tab === 'today' && <>
      <section className="card stack">
        <div className="grid3 center">
          <div><div className="tiny muted">{t('n.sugar')}</div><b className="big num" data-testid="sugar-total">{nf(today.total, 1)}</b><div className="tiny muted">{t('unit.g')}</div></div>
          <div><div className="tiny muted">{t('n.addedSugar')}</div><b className="big num" style={{ color: 'var(--c-sugar)' }}>{nf(today.added, 1)}</b><div className="tiny muted">{t('unit.g')}</div></div>
          <div><div className="tiny muted">{t('n.naturalSugar')}</div><b className="big num">{today.natural === null ? '—' : nf(today.natural, 1)}</b><div className="tiny muted">{t('unit.g')}</div></div>
        </div>
        <div><div className="row between small"><span>{t('sugar.vsGuidance')}</span><span className="num muted">{nf(today.added, 1)} / {max ?? '—'} {t('unit.g')}</span></div><Bar value={today.added} max={max ?? 0} color="var(--c-sugar)" /></div>
        {today.incomplete && <p className="tiny muted">{t('sugar.incomplete')}</p>}
        {max !== null && today.added > max && <div className="card warn small">{t('sugar.overGentle')}</div>}
      </section>
      <section className="card"><h2>{t('sugar.sources')}</h2>{top.length ? <div className="list">{top.map(r => <div className="li" key={r.id}><span className="grow">{r.name}</span>
        <span className="small num">{fmt(r.sugar)} · <span style={{ color: 'var(--c-sugar)' }}>{t('n.addedShort')} {fmt(r.added_sugar)}</span></span></div>)}</div> : <Empty>{t('sugar.noneToday')}</Empty>}</section>
      <section className="card stack"><h2>{t('sugar.guidance')}</h2><p className="small muted">{t('sugar.guidanceInfo')}</p>
        <div className="chips">{[10, 5].map(p => <button key={p} className={`chip ${!profile?.custom_added_sugar_g && (profile?.sugar_guidance_pct ?? 10) === p ? 'on' : ''}`} onClick={() => saveProfile({ sugar_guidance_pct: p as 5 | 10, custom_added_sugar_g: null })}>{t('sugar.pct', { p })}</button>)}</div>
        <div className="row"><input type="number" min={5} max={150} placeholder={t('sugar.customPh')} value={custom} onChange={e => setCustom(e.target.value)} aria-label={t('sugar.customPh')} />
          <button className="btn" onClick={async () => { const v = Number(custom); if (v >= 5 && v <= 150) { await saveProfile({ custom_added_sugar_g: v }); toast(t('common.saved'), 'ok'); } }}>{t('common.save')}</button></div></section>
      <Link to="/food/custom" className="btn soft">{t('sugar.scan')}</Link>
    </>}
    {(tab === 'week' || tab === 'month') && <>
      <section className="card"><h2>{tab === 'week' ? t('common.last7') : t('common.last30')}</h2><div className="chart"><ResponsiveContainer>
        <BarChart data={(tab === 'week' ? week : month).map(d => ({ d: df(d.d, tab === 'week' ? { weekday: 'short' } : { day: 'numeric' }), added: d.added, natural: d.natural ?? 0 }))}>
          <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} width={30} /><Tooltip /><Legend formatter={v => t(v === 'added' ? 'n.addedSugar' : 'n.naturalSugar')} />
          {max && <ReferenceLine y={max} stroke="var(--warn)" strokeDasharray="4 4" />}
          <RBar dataKey="added" stackId="s" fill="var(--c-sugar)" /><RBar dataKey="natural" stackId="s" fill="var(--sage)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="card"><h2>{t('sugar.report')}</h2>{(tab === 'week' ? week : month).some(d => d.n) ? <dl className="kv">
        <dt>{t('report.daysLogged')}</dt><dd>{(tab === 'week' ? week : month).filter(d => d.n).length}</dd>
        <dt>{t('sugar.avgTotal')}</dt><dd>{fmt(avg((tab === 'week' ? week : month).filter(d => d.n).map(d => d.total)))}</dd>
        <dt>{t('sugar.avgAdded')}</dt><dd>{fmt(avg((tab === 'week' ? week : month).filter(d => d.n).map(d => d.added)))}</dd>
        {tab === 'month' && overDays !== null && <><dt>{t('sugar.daysOver')}</dt><dd>{overDays}</dd></>}
      </dl> : <Empty>{t('common.noData')}</Empty>}<p className="tiny muted" style={{ marginTop: 8 }}>{t('sugar.reportNote')}</p></section>
    </>}
    {tab === 'learn' && <>
      {SUGAR_EDU.map((e, i) => <section className="card" key={i}><h3>{t4(e.title, lang)}</h3><p className="small">{t4(e.text, lang)}</p></section>)}
      <section className="card"><h2>{t('sugar.highList')}</h2><p className="tiny muted">{t('sugar.highNote')}</p><div className="list">{high.map(f => <div className="li" key={f.id}><span className="grow">{foodName(f, lang)}</span>
        <span className="small num">{t('n.addedShort')} {fmt(f.per100g.addedSugar)} / 100 g</span></div>)}</div></section>
    </>}
  </Page>;
}
