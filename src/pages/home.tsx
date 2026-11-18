import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { isoDate } from '../lib/nutrition';
import { foodName, getFood, type Food } from '../lib/foods';
import { foodEmoji } from '../lib/emoji';
import { Bar, Donut, Icon, Page, Ring, useFmt } from '../components/ui';
import { AddFoodFlow, AddFoodSheet } from '../components/FoodPicker';
import { POSITIVE_REMINDERS, t4 } from '../data/content';
import { useWalkTimer } from './tracking';

const TOP_FRUITS = ['orange', 'strawberry', 'kiwi', 'mango', 'banana', 'apple', 'grapes', 'pineapple', 'pomegranate', 'dates_medjool', 'watermelon', 'fig'];

export function Home() {
  const { t, lang, nf } = useI18n(); const { profile, targets, data, dayTotals, insert, toast, mode } = useApp(); const fmt = useFmt();
  const [adding, setAdding] = useState(false); const [pick, setPick] = useState<Food | null>(null);
  const today = isoDate(); const tot = dayTotals(today);
  const water = data.water_logs.filter(w => w.date === today).reduce((a, w) => a + Number(w.ml), 0);
  const walk = data.activity_logs.filter(w => w.date === today).reduce((a, w) => a + Number(w.minutes), 0);
  const walkGoal = profile?.walk_goal_min ?? 30;
  const habitsDone = data.habit_logs.filter(h => h.date === today).length;
  const timer = useWalkTimer();
  const kcalT = targets?.kcal ?? null;
  const remaining = kcalT !== null ? kcalT - tot.totals.kcal : null;
  const pct = kcalT ? Math.round((tot.totals.kcal / kcalT) * 100) : null;
  const reminder = POSITIVE_REMINDERS[new Date().getDate() % POSITIVE_REMINDERS.length];
  const hour = new Date().getHours();
  const greet = t(hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening', { name: profile?.name ?? '' });
  const addWater = async (ml: number) => { await insert('water_logs', { date: today, ml }); toast(t('water.added', { ml }), 'ok'); };
  const e = { c: tot.totals.carbs * 4, p: tot.totals.protein * 4, f: tot.totals.fat * 9 }; const eT = e.c + e.p + e.f;
  const share = (v: number) => (eT > 0 ? Math.round((v / eT) * 100) : 0);
  const goals = [
    { done: tot.entries > 0, label: t('home.goalLog') },
    { done: water >= (targets?.waterMl ?? 2000), label: t('home.goalWater') },
    { done: walk >= walkGoal, label: t('home.goalWalk', { min: walkGoal }) },
    { done: habitsDone >= 3, label: t('home.goalHabits') },
  ];
  const stat = (emoji: string, bg: string, label: string, value: string) => <div className="ministat"><span className="mi" style={{ background: bg }}>{emoji}</span><div className="grow" style={{ minWidth: 0 }}><span>{label}</span><b className="num ellipsis">{value}</b></div></div>;
  return <Page>
    <div className="row between">
      <div className="grow" style={{ minWidth: 0 }}><h1 style={{ fontSize: '1.35rem' }}>{greet} 👋</h1><p className="small muted">{t4(reminder, lang)}</p></div>
      <Link to="/profile/notifications" className="iconbtn" aria-label={t('nav.notifications')}><Icon n="bell" /></Link>
      <Link to="/profile" className="avatar" aria-label={t('nav.profile')}>{(profile?.name ?? '?').slice(0, 1).toUpperCase()}</Link>
    </div>
    {mode === 'local' && <div className="banner small">{t('auth.localModeShort')} <Link to="/profile/privacy">{t('common.learnMore')}</Link></div>}
    {targets && targets.restrictions.length > 0 && <div className="card warn small">{t('calc.restricted.' + targets.restrictions[0])}</div>}

    <Link to="/food/database" className="searchbar"><Icon n="search" s={18} /><span>{t('home.search')}</span></Link>

    <section className="card goalcard" aria-label={t('home.calories')}>
      <div className="grow stack tight" style={{ minWidth: 0 }}>
        <span className="small muted">{t('home.todayGoal')}</span>
        <span className="big num">{kcalT !== null ? nf(kcalT) : '—'} <span className="small muted">{t('unit.kcal')}</span></span>
        <Bar value={tot.totals.kcal} max={kcalT ?? 0} color={remaining !== null && remaining < 0 ? 'var(--c-kcal)' : 'var(--green-dark)'} />
        <span className="tiny muted"><b className="num" data-testid="home-kcal" style={{ color: 'var(--text)' }}>{nf(tot.totals.kcal)}</b> {t('home.eaten')} · {remaining !== null ? `${fmt(Math.abs(remaining), 'kcal')} ${remaining < 0 ? t('home.over').toLowerCase() : t('home.remaining').toLowerCase()}` : ''}</span>
      </div>
      <Ring value={tot.totals.kcal} max={kcalT ?? 0} size={92} stroke={10} color={remaining !== null && remaining < 0 ? 'var(--c-kcal)' : 'var(--green-dark)'}>
        <b className="num">{pct !== null ? `${pct}%` : '—'}</b></Ring>
    </section>

    <section className="stack tight">
      <div className="row between"><h2>{t('home.overview')}</h2><Link className="small" to="/food/diary">{t('home.seeAll')}</Link></div>
      <div className="stat4">
        {stat('🔥', '#fde0cf', t('n.kcal'), fmt(tot.totals.kcal, 'kcal', tot.incomplete.kcal))}
        {stat('🌾', '#f9efc6', t('n.carbs'), `${nf(tot.totals.carbs)} / ${targets?.carbs ?? '—'} ${t('unit.g')}`)}
        {stat('💪', '#d7ecf7', t('n.protein'), `${nf(tot.totals.protein)} / ${targets?.protein ?? '—'} ${t('unit.g')}`)}
        {stat('🥑', '#fbdbe3', t('n.fat'), `${nf(tot.totals.fat)} / ${targets?.fat ?? '—'} ${t('unit.g')}`)}
      </div>
    </section>

    <section className="card"><h2>{t('home.energySplit')}</h2>
      <div className="row wrap" style={{ gap: 18, marginTop: 10, justifyContent: 'center' }}>
        <Donut size={140} parts={[{ value: e.c, color: 'var(--c-carbs)' }, { value: e.p, color: 'var(--c-protein)' }, { value: e.f, color: 'var(--c-fat)' }]}>
          <span className="big num" style={{ fontSize: '1.5rem' }}>{nf(tot.totals.kcal)}</span><span className="tiny muted">{t('unit.kcal')}</span></Donut>
        <div className="legend">
          <div><i className="dot" style={{ background: 'var(--c-carbs)' }} />{t('n.carbs')}<b>{nf(tot.totals.carbs)} g · {share(e.c)}%</b></div>
          <div><i className="dot" style={{ background: 'var(--c-protein)' }} />{t('n.protein')}<b>{nf(tot.totals.protein)} g · {share(e.p)}%</b></div>
          <div><i className="dot" style={{ background: 'var(--c-fat)' }} />{t('n.fat')}<b>{nf(tot.totals.fat)} g · {share(e.f)}%</b></div>
          <div><i className="dot" style={{ background: 'var(--c-sugar)' }} />{t('n.addedSugar')}<b>{fmt(tot.totals.addedSugar, 'g', tot.incomplete.addedSugar)} / {targets?.addedSugarMaxG ?? '—'}</b></div>
        </div>
      </div>
    </section>

    <div className="grid2">
      <section className="card stack tight">
        <div className="row between"><b className="row" style={{ gap: 6 }}>💧 {t('nav.water')}</b><Link to="/wellness/water" className="tiny">{t('common.more')}</Link></div>
        <span className="big num" data-testid="home-water" style={{ color: 'var(--c-water2)' }}>{nf(water / 1000, 2)} L</span>
        <Bar value={water} max={targets?.waterMl ?? 2000} color="var(--c-water2)" />
        <button className="btn sm" onClick={() => addWater(250)}><span dir="ltr">+250 ml</span></button>
      </section>
      <section className="card stack tight">
        <div className="row between"><b className="row" style={{ gap: 6 }}>🚶‍♀️ {t('nav.walk')}</b><Link to="/wellness/walk" className="tiny">{t('common.more')}</Link></div>
        <span className="big num" style={{ color: 'var(--warn)' }}>{nf(walk)} <span className="small muted">/ {walkGoal} {t('unit.min')}</span></span>
        <Bar value={walk} max={walkGoal} color="var(--warn)" />
        {timer.running ? <Link className="btn sm" to="/wellness/walk">{timer.label}</Link> : <button className="btn sm" onClick={timer.start}>{t('walk.start')}</button>}
      </section>
    </div>

    <section className="stack tight">
      <div className="row between"><h2>{t('home.topFruits')}</h2><Link className="small" to="/food/database">{t('home.seeAll')}</Link></div>
      <div className="fruitrow">{TOP_FRUITS.map(id => getFood(id)).filter((f): f is Food => !!f).map(f => <button key={f.id} className="fruit" onClick={() => setPick(f)}>
        <span className="fe">{foodEmoji(f)}</span><b>{foodName(f, lang).split(/[,(]/)[0]}</b><span>{nf(f.per100g.kcal)} {t('unit.kcal')}</span></button>)}</div>
    </section>

    <section className="card"><h2>{t('home.dailyGoals')}</h2><div className="list">{goals.map((g, i) => <div className="li" key={i}>
      <span className="iconbtn" style={{ width: 30, height: 30, background: g.done ? 'var(--green-dark)' : undefined, color: g.done ? '#fff' : 'var(--muted)' }}><Icon n="check" s={16} /></span>
      <span className={g.done ? '' : 'muted'}>{g.label}</span></div>)}</div></section>

    <section><h2 style={{ marginBottom: 10 }}>{t('home.quick')}</h2><div className="grid3">
      <button className="tile t-green" onClick={() => setAdding(true)}><span className="ti">🍽️</span><b>{t('home.addFood')}</b></button>
      <button className="tile t-sky" onClick={() => addWater(500)}><span className="ti">💧</span><b dir="ltr">+500 ml</b></button>
      <Link className="tile t-rose" to="/wellness/checkin"><span className="ti">💗</span><b>{t('nav.checkin')}</b></Link>
      <Link className="tile t-lav" to="/progress/weight"><span className="ti">⚖️</span><b>{t('nav.weight')}</b></Link>
      <Link className="tile t-butter" to="/food/planner"><span className="ti">📅</span><b>{t('nav.planner')}</b></Link>
      <Link className="tile t-peach" to="/wellness/breathing"><span className="ti">🌬️</span><b>{t('nav.breathing')}</b></Link>
    </div></section>
    <AddFoodFlow open={adding} onClose={() => setAdding(false)} />
    {pick && <AddFoodSheet food={pick} open onClose={() => setPick(null)} />}
  </Page>;
}
