import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { isoDate } from '../lib/nutrition';
import { Bar, Icon, Logo, MacroBars, Page, Ring, useFmt } from '../components/ui';
import { AddFoodFlow } from '../components/FoodPicker';
import { POSITIVE_REMINDERS, t4 } from '../data/content';
import { useWalkTimer } from './tracking';

export function Home() {
  const { t, lang, nf } = useI18n(); const { profile, targets, data, dayTotals, insert, toast, mode } = useApp(); const fmt = useFmt();
  const [adding, setAdding] = useState(false);
  const today = isoDate(); const tot = dayTotals(today);
  const water = data.water_logs.filter(w => w.date === today).reduce((a, w) => a + Number(w.ml), 0);
  const walk = data.activity_logs.filter(w => w.date === today).reduce((a, w) => a + Number(w.minutes), 0);
  const walkGoal = profile?.walk_goal_min ?? 30;
  const habitsDone = data.habit_logs.filter(h => h.date === today).length;
  const timer = useWalkTimer();
  const kcalT = targets?.kcal ?? null;
  const remaining = kcalT !== null ? kcalT - tot.totals.kcal : null;
  const reminder = POSITIVE_REMINDERS[new Date().getDate() % POSITIVE_REMINDERS.length];
  const hour = new Date().getHours();
  const greet = t(hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening', { name: profile?.name ?? '' });
  const addWater = async (ml: number) => { await insert('water_logs', { date: today, ml }); toast(t('water.added', { ml }), 'ok'); };
  const goals = [
    { done: tot.entries > 0, label: t('home.goalLog') },
    { done: water >= (targets?.waterMl ?? 2000), label: t('home.goalWater') },
    { done: walk >= walkGoal, label: t('home.goalWalk', { min: walkGoal }) },
    { done: habitsDone >= 3, label: t('home.goalHabits') },
  ];
  return <Page>
    <div className="row between"><div className="row"><Logo s={34} /><div><h1 style={{ fontSize: '1.25rem' }}>{greet}</h1><p className="small muted">{t4(reminder, lang)}</p></div></div>
      <Link to="/profile/notifications" className="iconbtn" aria-label={t('nav.notifications')}><Icon n="bell" /></Link></div>
    {mode === 'local' && <div className="banner small">{t('auth.localModeShort')} <Link to="/profile/privacy">{t('common.learnMore')}</Link></div>}
    {targets && targets.restrictions.length > 0 && <div className="card warn small">{t('calc.restricted.' + targets.restrictions[0])}</div>}

    <section className="card hero" aria-label={t('home.calories')}>
      <div className="row" style={{ gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Ring value={tot.totals.kcal} max={kcalT ?? 0} size={156} color={remaining !== null && remaining < 0 ? 'var(--c-sugar)' : 'var(--green-dark)'}>
          <span className="big num" data-testid="home-kcal">{nf(tot.totals.kcal)}</span><span className="tiny muted">{t('unit.kcal')} {t('home.eaten')}</span>
        </Ring>
        <div className="stack grow" style={{ minWidth: 170 }}>
          <dl className="kv"><dt>{t('home.target')}</dt><dd className="num">{kcalT !== null ? fmt(kcalT, 'kcal') : '—'}</dd>
            <dt>{t('home.consumed')}</dt><dd className="num">{fmt(tot.totals.kcal, 'kcal', tot.incomplete.kcal)}</dd>
            <dt>{remaining !== null && remaining < 0 ? t('home.over') : t('home.remaining')}</dt><dd className="num">{remaining !== null ? fmt(Math.abs(remaining), 'kcal') : '—'}</dd></dl>
          <p className="tiny muted">{t('calc.estimate')}</p>
        </div>
      </div>
    </section>

    <section className="card"><div className="row between"><h2>{t('home.macros')}</h2><Link className="small" to="/food/diary">{t('nav.diary')}</Link></div>
      {targets ? <MacroBars totals={tot.totals} targets={targets} /> : <p className="small muted">{t('home.noTargets')}</p>}
      <div className="row between small" style={{ marginTop: 10 }}><span>{t('n.addedSugar')}</span><span className="num muted">{fmt(tot.totals.addedSugar, 'g', tot.incomplete.addedSugar)} / {targets?.addedSugarMaxG ?? '—'} {t('unit.g')}</span></div>
      <Bar value={tot.totals.addedSugar} max={targets?.addedSugarMaxG ?? 0} color="var(--c-sugar)" />
    </section>

    <div className="grid2">
      <section className="card stack tight" style={{ background: 'var(--sky)', border: 0 }}>
        <div className="row between"><b className="row" style={{ gap: 6 }}><Icon n="drop" s={18} />{t('nav.water')}</b><Link to="/wellness/water" className="tiny">{t('common.more')}</Link></div>
        <span className="big num" data-testid="home-water">{nf(water / 1000, 2)} L</span>
        <Bar value={water} max={targets?.waterMl ?? 2000} color="var(--c-water)" />
        <div className="row"><button className="btn sm grow" onClick={() => addWater(250)}><span dir="ltr">+250 ml</span></button></div>
      </section>
      <section className="card stack tight" style={{ background: 'var(--peach)', border: 0 }}>
        <div className="row between"><b className="row" style={{ gap: 6 }}><Icon n="walk" s={18} />{t('nav.walk')}</b><Link to="/wellness/walk" className="tiny">{t('common.more')}</Link></div>
        <span className="big num">{nf(walk)} <span className="small">/ {walkGoal} {t('unit.min')}</span></span>
        <Bar value={walk} max={walkGoal} color="var(--warn)" />
        {timer.running ? <Link className="btn sm" to="/wellness/walk">{timer.label}</Link> : <button className="btn sm" onClick={timer.start}>{t('walk.start')}</button>}
      </section>
    </div>

    <section className="card"><h2>{t('home.dailyGoals')}</h2><div className="list">{goals.map((g, i) => <div className="li" key={i}>
      <span className="iconbtn" style={{ width: 30, height: 30, background: g.done ? 'var(--green-dark)' : 'var(--surface)', color: g.done ? '#fff' : 'var(--muted)' }}><Icon n="check" s={16} /></span>
      <span className={g.done ? '' : 'muted'}>{g.label}</span></div>)}</div></section>

    <section><h2 style={{ marginBottom: 10 }}>{t('home.quick')}</h2><div className="grid3">
      <button className="tile t-green" onClick={() => setAdding(true)}><span className="ti"><Icon n="plus" /></span><b>{t('home.addFood')}</b></button>
      <button className="tile t-sky" onClick={() => addWater(500)}><span className="ti"><Icon n="drop" /></span><b dir="ltr">+500 ml</b></button>
      <Link className="tile t-rose" to="/wellness/checkin"><span className="ti"><Icon n="heart" /></span><b>{t('nav.checkin')}</b></Link>
      <Link className="tile t-lav" to="/progress/weight"><span className="ti"><Icon n="scale" /></span><b>{t('nav.weight')}</b></Link>
      <Link className="tile t-butter" to="/food/planner"><span className="ti"><Icon n="calendar" /></span><b>{t('nav.planner')}</b></Link>
      <Link className="tile t-peach" to="/wellness/breathing"><span className="ti"><Icon n="wind" /></span><b>{t('nav.breathing')}</b></Link>
    </div></section>
    <AddFoodFlow open={adding} onClose={() => setAdding(false)} />
  </Page>;
}
