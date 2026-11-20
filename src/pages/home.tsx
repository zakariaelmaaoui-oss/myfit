import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { addDays, isoDate, startOfWeek, sumNutrients } from '../lib/nutrition';
import { foodName, getFood, type Food } from '../lib/foods';
import { getRecipe } from '../data/recipes';
import { foodEmoji, recipeEmoji } from '../lib/emoji';
import { Donut, Icon, Page, Ring, useFmt } from '../components/ui';
import { AddFoodFlow, AddFoodSheet, MEALS, type MealSlot } from '../components/FoodPicker';

const TOP_FRUITS = ['orange', 'strawberry', 'kiwi', 'mango', 'banana', 'apple', 'grapes', 'pineapple', 'pomegranate', 'dates_medjool', 'watermelon', 'fig'];
const MEAL_ICON: Record<MealSlot, string> = { breakfast: '🔥', lunch: '🔥', dinner: '🔥', snack: '🔥', drink: '🥤' };

export function Home() {
  const { t, lang, nf, df } = useI18n(); const { profile, targets, data, dayTotals, mode } = useApp(); const fmt = useFmt(); const nav = useNavigate();
  const today = isoDate();
  const [week, setWeek] = useState(startOfWeek(today)); const [sel, setSel] = useState(today);
  const [adding, setAdding] = useState<MealSlot | null>(null); const [pick, setPick] = useState<Food | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const thisWeek = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const loggedDays = thisWeek.filter(d => data.diary_entries.some(e => e.date === d)).length;
  const tot = dayTotals(today);
  const water = data.water_logs.filter(w => w.date === today).reduce((a, w) => a + Number(w.ml), 0);
  const glasses = Math.floor(water / 250);
  const acts = data.activity_logs.filter(a => a.date === today);
  const steps = acts.reduce((a, x) => a + (Number(x.steps) || 0), 0);
  const walkMin = acts.filter(x => (x.kind ?? 'walk') === 'walk').reduce((a, x) => a + Number(x.minutes), 0);
  const burned = acts.reduce((a, x) => a + (Number(x.kcal_burned) || 0), 0);
  const hour = new Date().getHours();
  const e = { c: tot.totals.carbs * 4, p: tot.totals.protein * 4, f: tot.totals.fat * 9 }; const eT = e.c + e.p + e.f;
  const share = (v: number) => (eT > 0 ? Math.round((v / eT) * 100) : 0);
  const selEntries = data.diary_entries.filter(x => x.date === sel);
  const emojiOf = (x: any) => x.recipe_id ? (getRecipe(x.recipe_id) ? recipeEmoji(getRecipe(x.recipe_id)!) : '🍽️') : foodEmoji(getFood(x.food_id));
  return <Page>
    <div className="hdr">
      <Link to="/profile" className="avatar" aria-label={t('nav.profile')}>{(profile?.name ?? '?').slice(0, 1).toUpperCase()}</Link>
      <div className="grow" style={{ minWidth: 0 }}><small>{t(hour < 12 ? 'home.greetM' : hour < 18 ? 'home.greetA' : 'home.greetE')}</small><b className="ellipsis" style={{ display: 'block' }}>{profile?.name}</b></div>
      <Link to="/coach" className="iconbtn" aria-label={t('coach.title')}><span style={{ fontSize: '1.1rem' }}>✨</span></Link>
      <Link to="/profile/notifications" className="iconbtn" aria-label={t('nav.notifications')}><Icon n="bell" /></Link>
    </div>
    {mode === 'local' && <div className="banner small">{t('auth.localModeShort')} <Link to="/profile/privacy">{t('common.learnMore')}</Link></div>}
    {targets && targets.restrictions.length > 0 && <div className="card warn small">{t('calc.restricted.' + targets.restrictions[0])}</div>}

    <Link to="/progress" className="weekcard" aria-label={t('home.weeklyProgress')}>
      <div className="grow"><span className="pill"><i>⚡</i>{t('home.dailyIntake')}</span><h2>{t('home.weeklyProgress')}</h2>
        <p className="tiny" style={{ marginTop: 6, opacity: .8 }}>{t('home.daysLogged', { n: loggedDays })}</p></div>
      <div className="ringwrap"><Ring value={loggedDays} max={7} size={92} stroke={10} color="var(--pink)"><b style={{ fontSize: '1.4rem', lineHeight: 1 }}>{loggedDays}</b><span className="tiny">{t('home.days')}</span></Ring></div>
    </Link>

    <div className="grid2">
      <Link to="/wellness/walk" className="metric"><div className="top"><span>{t('home.stepsTitle')}</span><span className="mi" style={{ background: 'var(--pink-soft)' }}>👣</span></div>
        {steps > 0 ? <span className="val">{nf(steps)}<small>{t('walk.stepsShort')}</small></span> : <span className="val">{nf(walkMin)}<small>{t('unit.min')} / {profile?.walk_goal_min ?? 30}</small></span>}
        <span className="tiny muted" data-testid="home-burned">🔥 {nf(burned)} kcal {t('home.burned')}</span></Link>
      <Link to="/wellness/water" className="metric"><div className="top"><span>{t('home.drinkWater')}</span><span className="mi" style={{ background: 'var(--sky-soft)' }}>💧</span></div>
        <span className="val">{glasses}<small>{t('home.glass')} · <span data-testid="home-water" dir="ltr">{nf(water / 1000, 2)} L</span></small></span></Link>
    </div>

    <Link to="/coach" className="coachcard" data-testid="coach-card">
      <span className="coachavatar">✨</span>
      <div className="grow" style={{ minWidth: 0 }}><b>{t('coach.cardTitle')}</b><span className="small">{t('coach.cardText')}</span></div>
      <span className="coachgo"><Icon n="next" s={18} className="flip" /></span>
    </Link>

    <section className="cal">
      <div className="row between"><h2>{df(sel, { month: 'long', year: 'numeric' })}</h2>
        <div className="row" style={{ gap: 6 }}><button className="navarrow" aria-label={t('common.prev')} onClick={() => setWeek(addDays(week, -7))}><Icon n="back" s={16} className="flip" /></button>
          <button className="navarrow" aria-label={t('common.next')} disabled={addDays(week, 7) > today} onClick={() => setWeek(addDays(week, 7))}><Icon n="next" s={16} className="flip" /></button></div></div>
      <div className="days">{days.map(d => <button key={d} className={`day ${d === sel ? 'on' : ''}`} disabled={d > today} onClick={() => setSel(d)} aria-pressed={d === sel}>
        <span>{df(d, { weekday: 'narrow' })}</span><b>{df(d, { day: '2-digit' })}</b>{data.diary_entries.some(x => x.date === d) && <i className="logdot" />}</button>)}</div>
    </section>

    {MEALS.map(m => {
      const rows = selEntries.filter(x => x.meal === m);
      const s = sumNutrients(rows.map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar })));
      return <div className="mealcard" key={m} data-testid={`home-meal-${m}`}>
        <button className="grow" style={{ border: 0, background: 'none', padding: 0, textAlign: 'start', cursor: 'pointer', font: 'inherit', color: 'inherit', minWidth: 0 }} onClick={() => nav(`/food/diary?date=${sel}`)}>
          <h3>{t('meal.' + m)}</h3>
          <span className="kc"><i>{MEAL_ICON[m]}</i>{rows.length ? <>{nf(s.totals.kcal)} <small>{t('unit.kcal')}</small></> : <small>{t('diary.empty')}</small>}</span>
        </button>
        {rows.length > 0 && <div className="plates" aria-hidden="true">{rows.slice(0, 2).map(r => <span key={r.id}>{emojiOf(r)}</span>)}</div>}
        <button className="addround" aria-label={t('diary.addTo', { meal: t('meal.' + m) })} onClick={() => setAdding(m)}><Icon n="plus" s={18} /></button>
      </div>;
    })}

    <section className="card"><div className="row between"><h2>{t('home.energySplit')}</h2><span className="small muted num">{targets?.kcal ? `${t('home.target')}: ${nf(targets.kcal)}` : ''}</span></div>
      <div className="row wrap" style={{ gap: 18, marginTop: 10, justifyContent: 'center' }}>
        <Donut size={136} parts={[{ value: e.c, color: 'var(--c-carbs)' }, { value: e.p, color: 'var(--c-protein)' }, { value: e.f, color: 'var(--c-fat)' }]}>
          <span className="big num" style={{ fontSize: '1.5rem' }} data-testid="home-kcal">{nf(tot.totals.kcal)}</span><span className="tiny muted">{t('unit.kcal')}</span></Donut>
        <div className="legend">
          <div><i className="dot" style={{ background: 'var(--c-carbs)' }} />{t('n.carbs')}<b>{nf(tot.totals.carbs)} g · {share(e.c)}%</b></div>
          <div><i className="dot" style={{ background: 'var(--c-protein)' }} />{t('n.protein')}<b>{nf(tot.totals.protein)} g · {share(e.p)}%</b></div>
          <div><i className="dot" style={{ background: 'var(--c-fat)' }} />{t('n.fat')}<b>{nf(tot.totals.fat)} g · {share(e.f)}%</b></div>
          <div><i className="dot" style={{ background: 'var(--c-sugar)' }} />{t('n.addedSugar')}<b>{fmt(tot.totals.addedSugar, 'g', tot.incomplete.addedSugar)} / {targets?.addedSugarMaxG ?? '—'}</b></div>
        </div></div>
      <p className="tiny muted" style={{ marginTop: 8 }}>{t('calc.estimate')}</p>
    </section>

    <section className="stack tight">
      <div className="row between"><h2>{t('home.topFruits')}</h2><Link className="small" to="/food/database">{t('home.seeAll')}</Link></div>
      <div className="fruitrow">{TOP_FRUITS.map(id => getFood(id)).filter((f): f is Food => !!f).map(f => <button key={f.id} className="fruit" onClick={() => setPick(f)}>
        <span className="fe">{foodEmoji(f)}</span><b>{foodName(f, lang).split(/[,(]/)[0]}</b><span>{nf(f.per100g.kcal)} {t('unit.kcal')}</span></button>)}</div>
    </section>

    <section><h2 style={{ marginBottom: 10 }}>{t('home.quick')}</h2><div className="grid3">
      <Link className="tile t-rose" to="/wellness/checkin"><span className="ti">💗</span><b>{t('nav.checkin')}</b></Link>
      <Link className="tile t-lav" to="/progress/weight"><span className="ti">⚖️</span><b>{t('nav.weight')}</b></Link>
      <Link className="tile t-butter" to="/food/planner"><span className="ti">📅</span><b>{t('nav.planner')}</b></Link>
      <Link className="tile t-sky" to="/food/sugar"><span className="ti">🍬</span><b>{t('nav.sugar')}</b></Link>
      <Link className="tile t-green" to="/sport"><span className="ti">🏋️‍♀️</span><b>{t('nav.sport')}</b></Link>
      <Link className="tile t-peach" to="/wellness/breathing"><span className="ti">🌬️</span><b>{t('nav.breathing')}</b></Link>
    </div></section>
    <AddFoodFlow open={!!adding} onClose={() => setAdding(null)} date={sel} meal={adding ?? undefined} />
    {pick && <AddFoodSheet food={pick} open onClose={() => setPick(null)} />}
  </Page>;
}
