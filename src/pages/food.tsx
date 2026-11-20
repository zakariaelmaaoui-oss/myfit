import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { addDays, isoDate, sumNutrients } from '../lib/nutrition';
import { foodName, getFood, isHighAddedSugar, type Food } from '../lib/foods';
import { AddFoodFlow, AddFoodSheet, FoodSearch, MEALS, type MealSlot } from '../components/FoodPicker';
import { Confirm, Icon, MacroBars, Modal, NutrientTable, Page, useFmt } from '../components/ui';

export function FoodHub() {
  const { t } = useI18n();
  const tiles = [
    { to: '/food/database', i: 'search', c: 't-green', k: 'database' },
    { to: '/food/recipes', i: 'pot', c: 't-butter', k: 'recipes' },
    { to: '/food/moroccan', i: 'star', c: 't-rose', k: 'moroccan' }, { to: '/food/planner', i: 'calendar', c: 't-lav', k: 'planner' },
    { to: '/food/sugar', i: 'candy', c: 't-peach', k: 'sugar' },
    { to: '/food/budget', i: 'wallet', c: 't-beige', k: 'budget' },
  ];
  return <Page title={t('nav.food')}><div className="grid2">{tiles.map(x => <Link key={x.to} to={x.to} className={`tile ${x.c}`}>
    <span className="ti"><Icon n={x.i} /></span><b>{t('nav.' + x.k)}</b><span>{t('hub.' + x.k)}</span></Link>)}</div></Page>;
}

export function FoodDetail({ food, onClose }: { food: Food | null; onClose: () => void }) {
  const { t, lang } = useI18n(); const [adding, setAdding] = useState(false);
  if (!food) return null;
  if (adding) return <AddFoodSheet food={food} open onClose={() => { setAdding(false); onClose(); }} />;
  return <Modal open onClose={onClose} title={foodName(food, lang)}>
    <div className="row wrap"><span className="badge">{t('cat.' + food.category)}</span>
      {food.verified ? <span className="badge">{t('food.verified')}</span> : <span className="badge beige">{t('food.unverified')}</span>}
      {isHighAddedSugar(food) && <span className="badge warn">{t('sugar.high')}</span>}</div>
    <h3>{t('food.per100')}</h3>
    <NutrientTable n={food.per100g} />
    <p className="tiny muted">{t('food.source')}: {food.source}{food.fdcId ? ` · FDC ID ${food.fdcId}` : ''}{food.usdaDescription ? ` · “${food.usdaDescription}”` : ''}</p>
    {food.addedSugarBasis === 'single_ingredient' && <p className="tiny muted">{t('food.addedBasisZero')}</p>}
    {food.addedSugarBasis === 'sweetener' && <p className="tiny muted">{t('food.addedBasisAll')}</p>}
    {food.addedSugarBasis === 'unknown' && <p className="tiny muted">{t('food.addedBasisUnknown')}</p>}
    {food.portions.length > 0 && <><h3>{t('food.servings')}</h3><div className="list small">{food.portions.map(p => <div className="li" key={p.label}><span className="grow">{p.label}</span><span className="num">{p.grams} g</span></div>)}</div></>}
    <button className="btn primary block" onClick={() => setAdding(true)}>{t('diary.add')}</button>
  </Modal>;
}

export function FoodDatabase() {
  const { t } = useI18n(); const [sel, setSel] = useState<Food | null>(null);
  return <Page title={t('nav.database')} back>
    <p className="small muted">{t('food.dbIntro')}</p>
    <FoodSearch onPick={setSel} />
    <FoodDetail food={sel} onClose={() => setSel(null)} />
  </Page>;
}

export function Diary() {
  const { t, df, nf } = useI18n(); const { data, dayTotals, targets, remove, prefs } = useApp(); const fmt = useFmt();
  const [params, setParams] = useSearchParams(); const date = params.get('date') || isoDate();
  const setDate = (d: string) => setParams({ date: d });
  const [adding, setAdding] = useState<MealSlot | null>(null); const [editing, setEditing] = useState<any>(null); const [del, setDel] = useState<any>(null);
  const tot = dayTotals(date); const entries = data.diary_entries.filter(e => e.date === date);
  return <Page title={t('nav.diary')} back>
    <div className="row between card" style={{ padding: 8 }}>
      <button className="iconbtn" aria-label={t('common.prev')} onClick={() => setDate(addDays(date, -1))}><Icon n="back" className="flip" /></button>
      <label className="center"><b>{date === isoDate() ? t('common.today') : df(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
        <input type="date" className="sr" value={date} onChange={e => e.target.value && setDate(e.target.value)} /></label>
      <button className="iconbtn" aria-label={t('common.next')} disabled={date >= isoDate()} onClick={() => setDate(addDays(date, 1))}><Icon n="next" className="flip" /></button>
    </div>
    <section className="card"><div className="row between"><h2>{t('diary.total')}</h2><b className="num" data-testid="diary-total">{fmt(tot.totals.kcal, 'kcal', tot.incomplete.kcal)}{targets?.kcal ? ` / ${nf(targets.kcal)}` : ''}</b></div>
      {targets && <MacroBars totals={tot.totals} targets={targets} />}
      <div className="grid3 small" style={{ marginTop: 10 }}>
        <div><div className="muted tiny">{t('n.sugar')}</div><b>{fmt(tot.totals.sugar, 'g', tot.incomplete.sugar)}</b></div>
        <div><div className="muted tiny">{t('n.addedSugar')}</div><b>{fmt(tot.totals.addedSugar, 'g', tot.incomplete.addedSugar)}</b></div>
        <div><div className="muted tiny">{t('n.fiber')}</div><b>{fmt(tot.totals.fiber, 'g', tot.incomplete.fiber)}</b></div></div>
      {(tot.incomplete.sugar || tot.incomplete.addedSugar || tot.incomplete.fiber) && <p className="tiny muted" style={{ marginTop: 8 }}>{t('diary.incomplete')}</p>}
      {targets?.kcal && tot.totals.kcal > targets.kcal && prefs.calorie_excess_alert && <p className="small" style={{ marginTop: 8 }}>{t('diary.overGentle', { kcal: nf(tot.totals.kcal - targets.kcal) })}</p>}
    </section>
    {MEALS.map(m => {
      const rows = entries.filter(e => e.meal === m); const s = sumNutrients(rows.map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar })));
      return <section className="card" key={m} data-testid={`meal-${m}`}>
        <div className="row between"><h2>{t('meal.' + m)}</h2><div className="row"><span className="num small muted">{fmt(s.totals.kcal, 'kcal')}</span>
          <button className="iconbtn" aria-label={t('diary.addTo', { meal: t('meal.' + m) })} onClick={() => setAdding(m)}><Icon n="plus" /></button></div></div>
        {rows.length ? <div className="list">{rows.map(e => <div className="li" key={e.id}>
          <div className="grow"><div style={{ fontWeight: 600 }}>{e.name}{!e.verified && <span className="badge beige" style={{ marginInlineStart: 6 }}>{t('food.unverified')}</span>}</div>
            <div className="tiny muted">{e.recipe_id ? `${nf(e.servings ?? 1, 2)} ${t('recipe.portion')}` : (e.portion_label || `${nf(e.grams)} g`)} · {t('n.proteinShort')} {fmt(e.protein)} · {t('n.sugarShort')} {fmt(e.sugar)}</div></div>
          <b className="num small">{fmt(e.kcal, 'kcal')}</b>
          {!e.recipe_id && <button className="iconbtn" aria-label={t('common.edit')} onClick={() => setEditing(e)}><Icon n="edit" s={16} /></button>}
          <button className="iconbtn" aria-label={t('common.delete')} onClick={() => setDel(e)}><Icon n="trash" s={16} /></button>
        </div>)}</div> : <p className="small muted">{t('diary.empty')}</p>}
      </section>;
    })}
    <p className="tiny muted center">{t('calc.estimate')}</p>
    <AddFoodFlow open={!!adding} onClose={() => setAdding(null)} date={date} meal={adding ?? undefined} />
    {editing && <AddFoodSheet food={getFood(editing.food_id) ?? null} entry={editing} open onClose={() => setEditing(null)} />}
    {editing && !getFood(editing.food_id) && <Modal open onClose={() => setEditing(null)} title={t('common.edit')}><p>{t('diary.foodMissing')}</p></Modal>}
    <Confirm open={!!del} text={t('diary.confirmDelete', { name: del?.name ?? '' })} onNo={() => setDel(null)} onYes={async () => { await remove('diary_entries', del.id); setDel(null); }} />
  </Page>;
}

