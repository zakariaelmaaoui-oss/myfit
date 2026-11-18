import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { RECIPES, getRecipe, recipeName, type Meal } from '../data/recipes';
import { priceMap, recipeInfo, scaledIngredients } from '../lib/recipes';
import { foodName, getFood, FOOD_CATEGORIES } from '../lib/foods';
import { addDays, aggregateIngredients, costFor, isoDate, recipeNutrition, round, startOfWeek, sumNutrients } from '../lib/nutrition';
import { AFFORDABLE_FOODS } from '../data/content';
import { recipeDiaryRow } from './recipes';
import { Confirm, Empty, Icon, Modal, Page, errMsg, useFmt } from '../components/ui';

const PMEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function RecipeChooser({ meal, onPick, onClose }: { meal: Meal; onPick: (id: string) => void; onClose: () => void }) {
  const { t, lang } = useI18n(); const fmt = useFmt(); const { data } = useApp();
  const [cat, setCat] = useState<'all' | 'favorites' | 'vegetarian' | 'budget' | 'protein' | 'moroccan'>('all'); const [mealOnly, setMealOnly] = useState(true);
  const favs = new Set(data.favorites.map(f => f.recipe_id));
  const list = RECIPES.map(r => recipeInfo(r)).filter(i => (!mealOnly || i.recipe.meals.includes(meal)) &&
    (cat === 'all' || (cat === 'favorites' && favs.has(i.recipe.id)) || (cat === 'vegetarian' && i.vegetarian) || (cat === 'budget' && i.recipe.budget) || (cat === 'protein' && i.highProtein) || (cat === 'moroccan' && i.recipe.moroccan)));
  return <Modal open onClose={onClose} title={t('plan.choose', { meal: t('meal.' + meal) })}>
    <div className="chips">{(['all', 'favorites', 'vegetarian', 'budget', 'protein', 'moroccan'] as const).map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c === 'all' ? t('common.all') : t('rf.' + c)}</button>)}</div>
    <label className="check"><input type="checkbox" checked={mealOnly} onChange={e => setMealOnly(e.target.checked)} /><span className="small">{t('plan.mealOnly')}</span></label>
    <div className="list">{list.map(i => <button key={i.recipe.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', cursor: 'pointer', width: '100%' }} onClick={() => onPick(i.recipe.id)}>
      <span className="grow">{recipeName(i.recipe, lang)}</span><span className="num small">{fmt(i.perServing.totals.kcal, 'kcal')}</span></button>)}</div>
    {!list.length && <Empty>{t('recipe.none')}</Empty>}
  </Modal>;
}

export function Planner() {
  const { t, lang, df, nf } = useI18n(); const { data, insert, update, remove, removeWhere, toast } = useApp(); const fmt = useFmt();
  const [week, setWeek] = useState(startOfWeek(isoDate())); const [choose, setChoose] = useState<{ date: string; meal: Meal; replace?: any } | null>(null);
  const [view, setView] = useState<'week' | 'day'>('week'); const [day, setDay] = useState(isoDate());
  const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(week, i)) : [day];
  const items = data.meal_plan_items;
  const nutr = (it: any) => { const r = getRecipe(it.recipe_id); return r ? recipeNutrition(r.ingredients, r.servings, id => getFood(id)?.per100g, Number(it.portions)) : null; };
  const pick = async (id: string) => {
    if (!choose) return;
    try { if (choose.replace) await update('meal_plan_items', choose.replace.id, { recipe_id: id }); else await insert('meal_plan_items', { date: choose.date, meal: choose.meal, recipe_id: id, portions: 1 }); }
    catch (e) { toast(errMsg(e), 'warn'); } setChoose(null);
  };
  const weekItems = items.filter(i => days.includes(i.date));
  const weekTot = sumNutrients(weekItems.map(nutr).filter(Boolean).map(n => ({ ...n!.totals })));
  const genList = async () => {
    const ings = aggregateIngredients(weekItems.flatMap(i => { const r = getRecipe(i.recipe_id); return r ? scaledIngredients(r, Number(i.portions)).filter(x => x.foodId !== 'water' && x.consumed !== false) : []; }));
    await removeWhere('shopping_items', 'source', 'plan');
    for (const g of ings) { const f = getFood(g.foodId); await insert('shopping_items', { name: foodName(f, lang), food_id: g.foodId, grams: g.grams, category: f?.category ?? 'custom', purchased: false, source: 'plan' }); }
    toast(t('plan.listMade', { n: ings.length }), 'ok');
  };
  return <Page title={t('nav.planner')} back>
    <div className="seg"><button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>{t('plan.week')}</button><button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>{t('plan.day')}</button></div>
    <div className="row between card" style={{ padding: 8 }}>
      <button className="iconbtn" aria-label={t('common.prev')} onClick={() => view === 'week' ? setWeek(addDays(week, -7)) : setDay(addDays(day, -1))}><Icon n="back" className="flip" /></button>
      <b>{view === 'week' ? `${df(week)} – ${df(addDays(week, 6))}` : df(day, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
      <button className="iconbtn" aria-label={t('common.next')} onClick={() => view === 'week' ? setWeek(addDays(week, 7)) : setDay(addDays(day, 1))}><Icon n="next" className="flip" /></button>
    </div>
    <section className="card soft"><div className="row between"><b>{view === 'week' ? t('plan.weekTotal') : t('plan.dayTotal')}</b><b className="num">{fmt(weekTot.totals.kcal, 'kcal')}</b></div>
      <div className="tiny muted">{t('n.protein')} {fmt(weekTot.totals.protein)} · {t('n.carbs')} {fmt(weekTot.totals.carbs)} · {t('n.fat')} {fmt(weekTot.totals.fat)} · {t('n.fiber')} {fmt(weekTot.totals.fiber)} · {t('n.addedSugar')} {fmt(weekTot.totals.addedSugar, 'g', weekTot.incomplete.addedSugar)}</div>
      {view === 'week' && <div className="tiny muted">{t('plan.avgDay', { k: nf(round(weekTot.totals.kcal / 7)) })}</div>}
      <button className="btn primary block" style={{ marginTop: 10 }} disabled={!weekItems.length} onClick={genList}><Icon n="cart" s={18} />{t('plan.makeList')}</button></section>
    {days.map(d => {
      const dayItems = items.filter(i => i.date === d); const dt = sumNutrients(dayItems.map(nutr).filter(Boolean).map(n => ({ ...n!.totals })));
      return <section className="card" key={d} data-testid={`plan-${d}`}>
        <div className="row between"><h2>{df(d, { weekday: 'long', day: 'numeric', month: 'short' })}</h2><span className="num small muted">{fmt(dt.totals.kcal, 'kcal')}</span></div>
        {PMEALS.map(m => { const its = dayItems.filter(i => i.meal === m); return <div key={m} className="li" style={{ alignItems: 'flex-start' }}>
          <span className="small muted" style={{ width: 86, flex: 'none', paddingTop: 6 }}>{t('meal.' + m)}</span>
          <div className="grow stack tight">{its.map(it => { const r = getRecipe(it.recipe_id); const n = nutr(it); return <div key={it.id} className="row wrap" style={{ gap: 6 }}>
            <Link to={`/food/recipes/${it.recipe_id}`} className="grow small" style={{ fontWeight: 600 }}>{r ? recipeName(r, lang) : it.recipe_id}</Link>
            <span className="tiny num muted">{fmt(n?.totals.kcal ?? null, 'kcal')}</span>
            <select aria-label={t('plan.portions')} value={String(it.portions)} onChange={e => update('meal_plan_items', it.id, { portions: Number(e.target.value) })} style={{ width: 76, minHeight: 34, padding: '2px 6px' }}>{[0.5, 1, 1.5, 2, 3, 4].map(p => <option key={p} value={p}>×{p}</option>)}</select>
            <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label={t('plan.replace')} onClick={() => setChoose({ date: d, meal: m, replace: it })}><Icon n="edit" s={15} /></button>
            <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label={t('plan.logIt')} onClick={async () => { await insert('diary_entries', { ...recipeDiaryRow(it.recipe_id, Number(it.portions), lang), date: d > isoDate() ? isoDate() : d, meal: m }); toast(t('diary.added'), 'ok'); }}><Icon n="book" s={15} /></button>
            <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label={t('common.delete')} onClick={() => remove('meal_plan_items', it.id)}><Icon n="trash" s={15} /></button>
          </div>; })}
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setChoose({ date: d, meal: m })}><Icon n="plus" s={15} />{t('common.add')}</button></div></div>; })}
      </section>;
    })}
    <p className="tiny muted center">{t('plan.noAuto')}</p>
    {choose && <RecipeChooser meal={choose.meal} onPick={pick} onClose={() => setChoose(null)} />}
  </Page>;
}

export function Shopping() {
  const { t, lang, nf } = useI18n(); const { data, insert, update, remove } = useApp();
  const [name, setName] = useState(''); const [qty, setQty] = useState(''); const [edit, setEdit] = useState<any>(null); const [clear, setClear] = useState(false);
  const prices = useMemo(() => priceMap(data.food_prices), [data.food_prices]);
  const items = data.shopping_items;
  const cats = [...FOOD_CATEGORIES, 'custom'].filter(c => items.some(i => (i.category ?? 'custom') === c));
  const est = items.filter(i => !i.purchased && i.food_id && i.grams).map(i => costFor(Number(i.grams), prices.get(i.food_id)));
  const known = est.filter((x): x is number => x !== null); const unknownCount = est.length - known.length;
  return <Page title={t('nav.shopping')} back>
    <section className="card stack"><div className="row"><input placeholder={t('shop.itemPh')} value={name} onChange={e => setName(e.target.value)} aria-label={t('shop.item')} /><input placeholder={t('shop.qtyPh')} value={qty} onChange={e => setQty(e.target.value)} style={{ maxWidth: 110 }} aria-label={t('shop.qty')} />
      <button className="btn primary" onClick={async () => { if (!name.trim()) return; await insert('shopping_items', { name: name.trim(), quantity_text: qty || null, category: 'custom', purchased: false, source: 'manual' }); setName(''); setQty(''); }}>{t('common.add')}</button></div>
      <p className="tiny muted">{t('shop.fromPlan')} <Link to="/food/planner">{t('nav.planner')}</Link></p></section>
    {items.length > 0 && <div className="card soft small">{t('shop.estimate', { c: nf(round(known.reduce((a, b) => a + b, 0), 2), 2) })}{unknownCount > 0 && ` · ${t('shop.noPrice', { n: unknownCount })}`} <Link to="/food/budget">{t('nav.budget')}</Link></div>}
    {cats.map(c => <section className="card" key={c}><h3>{t('cat.' + c)}</h3><div className="list">{items.filter(i => (i.category ?? 'custom') === c).map(i => <div className="li" key={i.id}>
      <input type="checkbox" checked={!!i.purchased} onChange={e => update('shopping_items', i.id, { purchased: e.target.checked })} aria-label={t('shop.purchased')} />
      <span className="grow" style={{ textDecoration: i.purchased ? 'line-through' : 'none', opacity: i.purchased ? .6 : 1 }}>{i.food_id ? foodName(getFood(i.food_id), lang) : i.name}</span>
      <span className="small num muted">{i.grams ? `${nf(i.grams)} g` : i.quantity_text ?? ''}</span>
      <button className="iconbtn" aria-label={t('common.edit')} onClick={() => setEdit({ ...i })}><Icon n="edit" s={15} /></button>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('shopping_items', i.id)}><Icon n="trash" s={15} /></button></div>)}</div></section>)}
    {!items.length && <Empty>{t('shop.empty')}</Empty>}
    {items.some(i => i.purchased) && <button className="btn" onClick={() => setClear(true)}>{t('shop.clearBought')}</button>}
    {edit && <Modal open onClose={() => setEdit(null)} title={edit.name}>
      {edit.food_id ? <label className="field">{t('food.quantity')}<input type="number" value={edit.grams ?? ''} onChange={e => setEdit({ ...edit, grams: e.target.value })} /></label>
        : <label className="field">{t('shop.qty')}<input value={edit.quantity_text ?? ''} onChange={e => setEdit({ ...edit, quantity_text: e.target.value })} /></label>}
      <button className="btn primary" onClick={async () => { await update('shopping_items', edit.id, edit.food_id ? { grams: Number(edit.grams) || null } : { quantity_text: edit.quantity_text }); setEdit(null); }}>{t('common.save')}</button></Modal>}
    <Confirm open={clear} text={t('shop.clearConfirm')} onNo={() => setClear(false)} onYes={async () => { for (const i of items.filter(x => x.purchased)) await remove('shopping_items', i.id); setClear(false); }} />
  </Page>;
}

export function Budget() {
  const { t, lang, nf, df } = useI18n(); const { data, profile, saveProfile, insert, remove, toast } = useApp();
  const [budget, setBudget] = useState(String(profile?.budget_mad ?? '')); const [period, setPeriod] = useState(profile?.budget_period ?? 'week');
  const [food, setFood] = useState(AFFORDABLE_FOODS[0]); const [price, setPrice] = useState(''); const [store, setStore] = useState(''); const [err, setErr] = useState('');
  const prices = useMemo(() => priceMap(data.food_prices), [data.food_prices]);
  const shopCost = data.shopping_items.filter(i => !i.purchased && i.food_id && i.grams).map(i => costFor(Number(i.grams), prices.get(i.food_id))).filter((x): x is number => x !== null).reduce((a, b) => a + b, 0);
  const b = Number(profile?.budget_mad) || 0;
  return <Page title={t('nav.budget')} back>
    <div className="card beige small">{t('budget.noInvent')}</div>
    <section className="card stack"><h2>{t('budget.mine')}</h2>
      <div className="row"><input type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} aria-label={t('p.budget')} placeholder="MAD" />
        <select value={period} onChange={e => setPeriod(e.target.value as any)} style={{ maxWidth: 150 }}><option value="week">{t('common.perWeek')}</option><option value="month">{t('common.perMonth')}</option></select>
        <button className="btn" onClick={async () => { await saveProfile({ budget_mad: budget === '' ? null : Number(budget), budget_period: period as any }); toast(t('common.saved'), 'ok'); }}>{t('common.save')}</button></div>
      {b > 0 && <p className="small">{t('budget.listVs', { c: nf(round(shopCost, 2), 2), b: nf(b), p: t(period === 'week' ? 'common.perWeek' : 'common.perMonth') })}</p>}</section>
    <section className="card stack"><h2>{t('budget.addPrice')}</h2>
      <label className="field">{t('budget.food')}<select value={food} onChange={e => setFood(e.target.value)}>{[...new Set([...AFFORDABLE_FOODS, ...data.shopping_items.map(i => i.food_id).filter(Boolean)])].map(id => <option key={id} value={id}>{foodName(getFood(id), lang)}</option>)}</select></label>
      <div className="grid2"><label className="field">{t('budget.pricePerKg')}<input type="number" min={0} step="0.5" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label className="field">{t('budget.store')}<input value={store} onChange={e => setStore(e.target.value)} /></label></div>
      <p className="tiny muted">{t('budget.eggHint')}</p>
      {err && <p className="err">{err}</p>}
      <button className="btn primary" onClick={async () => { setErr(''); try { await insert('food_prices', { food_id: food, price_mad_per_kg: Number(price), store: store || null, observed_on: isoDate() }); setPrice(''); toast(t('common.saved'), 'ok'); } catch (e) { setErr(errMsg(e)); } }}>{t('common.save')}</button></section>
    <section className="card"><h2>{t('budget.affordable')}</h2><p className="tiny muted">{t('budget.affordableNote')}</p><div className="scroll-x"><table className="nt" style={{ minWidth: 420 }}><thead><tr className="tiny muted"><td>{t('budget.food')}</td><td>{t('n.protein')}/100 g</td><td>MAD/kg</td><td>{t('budget.per10p')}</td></tr></thead><tbody>
      {AFFORDABLE_FOODS.map(id => { const f = getFood(id)!; const p = prices.get(id); const prot = f.per100g.protein ?? 0;
        return <tr key={id}><td>{foodName(f, lang)}</td><td className="num">{nf(prot, 1)} g</td><td className="num">{p !== undefined ? nf(p, 2) : '—'}</td><td className="num">{p !== undefined && prot > 0 ? `${nf(round((p / 1000) * (10 / prot) * 100, 2), 2)} MAD` : '—'}</td></tr>; })}
    </tbody></table></div></section>
    <section className="card"><h2>{t('budget.myPrices')}</h2>{data.food_prices.length ? <div className="list">{[...data.food_prices].sort((a, b) => (b.observed_on ?? '').localeCompare(a.observed_on ?? '')).map(p => <div className="li" key={p.id}>
      <span className="grow">{foodName(getFood(p.food_id), lang)} · <b>{nf(p.price_mad_per_kg, 2)} MAD/kg</b><span className="tiny muted"> · {p.store ? `${p.store} · ` : ''}{p.observed_on ? df(p.observed_on) : ''}</span></span>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('food_prices', p.id)}><Icon n="trash" s={15} /></button></div>)}</div> : <Empty>{t('budget.noPrices')}</Empty>}</section>
  </Page>;
}
