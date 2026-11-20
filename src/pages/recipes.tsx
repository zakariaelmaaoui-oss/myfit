import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { RECIPES, getRecipe, l3, recipeName, recipeSteps, type Meal } from '../data/recipes';
import { priceMap, recipeInfo, scaledIngredients, type RecipeInfo } from '../lib/recipes';
import { foodName, getFood } from '../lib/foods';
import { recipeEmoji } from '../lib/emoji';
import { addDays, isoDate, recipeNutrition, scaleNutrients } from '../lib/nutrition';
import { MEALS, defaultMeal, type MealSlot } from '../components/FoodPicker';
import { Empty, Icon, Modal, NutrientTable, Page, errMsg, useFmt } from '../components/ui';

const FILTERS = ['cost', 'protein', 'lowsugar', 'vegetarian', 'moroccan', 'quick', 'favorites'] as const;
type Filter = typeof FILTERS[number];

export function RecipeCard({ info, extra }: { info: RecipeInfo; extra?: React.ReactNode }) {
  const { t, lang, nf } = useI18n(); const fmt = useFmt(); const r = info.recipe;
  return <Link to={`/food/recipes/${r.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
    <div className="row between" style={{ alignItems: 'flex-start' }}><span className="thumb" aria-hidden="true">{recipeEmoji(r)}</span><div className="grow" style={{ minWidth: 0 }}><b>{recipeName(r, lang)}</b>
      <div className="tiny muted">{l3(r.serving, lang)} · {info.totalMin} {t('unit.min')}{info.costPerServing !== null ? ` · ${nf(info.costPerServing, 2)} MAD` : ''}</div></div>
      <b className="num small">{fmt(info.perServing.totals.kcal, 'kcal', info.perServing.incomplete.kcal)}</b></div>
    <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
      {r.moroccan && <span className="badge">{t('rf.moroccan')}</span>}{info.vegetarian && <span className="badge">{t('rf.vegetarian')}</span>}
      {info.highProtein && <span className="badge lav">{t('rf.protein')}</span>}{info.lowAddedSugar && <span className="badge">{t('rf.lowsugar')}</span>}
      {info.quick && <span className="badge beige">{t('rf.quick')}</span>}{r.budget && <span className="badge beige">{t('rf.budget')}</span>}
      {r.variantOf && <span className="badge beige">{t('recipe.variation')}: {l3(r.variant, lang)}</span>}
      <span className="tiny muted">{t('n.proteinShort')} {fmt(info.perServing.totals.protein)} · {t('n.addedShort')} {fmt(info.perServing.totals.addedSugar, 'g', info.perServing.incomplete.addedSugar)}</span>
    </div>{extra}
  </Link>;
}

export function Recipes({ moroccanOnly = false }: { moroccanOnly?: boolean }) {
  const { t, lang } = useI18n(); const { data } = useApp();
  const [q, setQ] = useState(''); const [f, setF] = useState<Set<Filter>>(new Set(moroccanOnly ? ['moroccan'] : [])); const [meal, setMeal] = useState<'all' | Meal>('all');
  const prices = useMemo(() => priceMap(data.food_prices), [data.food_prices]);
  const favs = new Set(data.favorites.map(x => x.recipe_id));
  const list = useMemo(() => {
    let l = RECIPES.map(r => recipeInfo(r, prices));
    if (q) { const s = q.toLowerCase(); l = l.filter(i => [i.recipe.name.en, i.recipe.name.fr, i.recipe.name.ar].join(' ').toLowerCase().includes(s)); }
    if (meal !== 'all') l = l.filter(i => i.recipe.meals.includes(meal));
    if (f.has('moroccan')) l = l.filter(i => i.recipe.moroccan);
    if (f.has('vegetarian')) l = l.filter(i => i.vegetarian);
    if (f.has('protein')) l = l.filter(i => i.highProtein);
    if (f.has('lowsugar')) l = l.filter(i => i.lowAddedSugar);
    if (f.has('quick')) l = l.filter(i => i.quick);
    if (f.has('favorites')) l = l.filter(i => favs.has(i.recipe.id));
    if (f.has('cost')) l = [...l].sort((a, b) => (a.costPerServing ?? Infinity) - (b.costPerServing ?? Infinity) || Number(!!b.recipe.budget) - Number(!!a.recipe.budget));
    return l;
  }, [q, f, meal, prices, data.favorites]); // eslint-disable-line
  const toggle = (x: Filter) => setF(s => { const n = new Set(s); n.has(x) ? n.delete(x) : n.add(x); return n; });
  const noPrices = f.has('cost') && list.every(i => i.costPerServing === null);
  return <Page title={moroccanOnly ? t('nav.moroccan') : t('nav.recipes')} back>
    {moroccanOnly && <p className="small muted">{t('moroccan.intro')}</p>}
    <input placeholder={t('recipe.searchPh')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('recipe.searchPh')} />
    <div className="chips">{FILTERS.filter(x => !(moroccanOnly && x === 'moroccan')).map(x => <button key={x} className={`chip ${f.has(x) ? 'on' : ''}`} onClick={() => toggle(x)}>{t('rf.' + x)}</button>)}</div>
    <div className="chips">{(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => <button key={m} className={`chip ${meal === m ? 'on' : ''}`} onClick={() => setMeal(m)}>{m === 'all' ? t('common.all') : t('meal.' + m)}</button>)}</div>
    {noPrices && <div className="card beige small">{t('recipe.noPrices')} <Link to="/food/budget">{t('nav.budget')}</Link></div>}
    <p className="tiny muted">{t('recipe.count', { n: list.length })} · {t('recipe.calcNote')}</p>
    <div className="stack" data-testid="recipe-list">{list.map(i => <RecipeCard key={i.recipe.id} info={i} />)}</div>
    {!list.length && <Empty>{t('recipe.none')}</Empty>}
    {!moroccanOnly && <p className="tiny muted center">{lang && t('recipe.stored')}</p>}
  </Page>;
}

export function RecipeDetail() {
  const { id } = useParams(); const r = getRecipe(id!); const { t, lang, nf } = useI18n(); const nav = useNavigate();
  const { data, insert, remove, toast } = useApp(); const fmt = useFmt();
  const [portions, setPortions] = useState(1); const [diary, setDiary] = useState(false); const [plan, setPlan] = useState(false);
  const prices = useMemo(() => priceMap(data.food_prices), [data.food_prices]);
  if (!r) return <Page title="404" back><Empty>{t('recipe.notFound')}</Empty></Page>;
  const info = recipeInfo(r, prices);
  const n = recipeNutrition(r.ingredients, r.servings, x => getFood(x)?.per100g, portions);
  const fav = data.favorites.find(x => x.recipe_id === r.id);
  const variants = RECIPES.filter(x => x.id !== r.id && (x.variantOf === r.id || (r.variantOf && (x.id === r.variantOf || x.variantOf === r.variantOf))));
  const ings = scaledIngredients(r, portions);
  return <Page title={recipeName(r, lang)} back actions={<button className="iconbtn" aria-label={t('recipe.favorite')} aria-pressed={!!fav} onClick={async () => { if (fav) await remove('favorites', fav.id); else { await insert('favorites', { recipe_id: r.id }); toast(t('recipe.favAdded'), 'ok'); } }} style={fav ? { background: 'var(--butter)' } : {}}><Icon n="star" /></button>}>
    <div className="row wrap">{r.moroccan && <span className="badge">{t('rf.moroccan')}</span>}{info.vegetarian && <span className="badge">{t('rf.vegetarian')}</span>}{info.highProtein && <span className="badge lav">{t('rf.protein')}</span>}{info.lowAddedSugar && <span className="badge">{t('rf.lowsugar')}</span>}</div>
    <div className="grid3"><div className="card center"><div className="tiny muted">{t('recipe.prep')}</div><b>{r.prepMin} {t('unit.min')}</b></div><div className="card center"><div className="tiny muted">{t('recipe.cook')}</div><b>{r.cookMin} {t('unit.min')}</b></div><div className="card center"><div className="tiny muted">{t('recipe.makes')}</div><b>{r.servings}</b></div></div>
    <section className="card stack">
      <div className="row between"><h2>{t('recipe.nutrition')}</h2><div className="row"><button className="iconbtn" aria-label="-" onClick={() => setPortions(p => Math.max(0.5, p - 0.5))}><Icon n="minus" /></button><b className="num">{nf(portions, 1)}</b><button className="iconbtn" aria-label="+" onClick={() => setPortions(p => Math.min(10, p + 0.5))}><Icon n="plus" /></button></div></div>
      <p className="small muted">{t('recipe.portionOf', { s: l3(r.serving, lang) })}</p>
      <NutrientTable n={{ kcal: n.totals.kcal, protein: n.totals.protein, carbs: n.totals.carbs, fat: n.totals.fat, fiber: n.totals.fiber, sugar: n.totals.sugar, addedSugar: n.totals.addedSugar }} incomplete={n.incomplete} />
      <p className="tiny muted">{t('recipe.calcExplain')}</p>{r.note && <p className="tiny muted">{l3(r.note, lang)}</p>}
      {info.cost !== null && <p className="small">{t('recipe.cost', { c: nf(info.costPerServing! * portions, 2) })}</p>}
      <div className="row"><button className="btn grow" onClick={() => setPlan(true)}>{t('recipe.toPlan')}</button><button className="btn primary grow" onClick={() => setDiary(true)}>{t('diary.add')}</button></div>
    </section>
    <section className="card"><h2>{t('recipe.ingredients')}</h2><p className="tiny muted">{t('recipe.forPortions', { n: nf(portions, 1) })}</p><div className="list">{ings.map((i, k) => {
      const fd = getFood(i.foodId); const kc = fd ? scaleNutrients(fd.per100g, i.grams).kcal : null;
      return <div className="li" key={k}><span className="grow">{foodName(fd, lang)}{i.consumed === false && <span className="tiny muted"> · {t('recipe.notEaten')}</span>}</span><span className="num">{nf(i.grams, 1)} g</span><span className="tiny muted num" style={{ minWidth: 58, textAlign: 'end' }}>{i.consumed === false ? '—' : fmt(kc, 'kcal')}</span></div>;
    })}</div></section>
    <section className="card"><h2>{t('recipe.steps')}</h2><ol className="stack" style={{ paddingInlineStart: 20, margin: '8px 0 0' }}>{recipeSteps(r, lang).map((s, k) => <li key={k}>{s}</li>)}</ol></section>
    {variants.length > 0 && <section className="card"><h2>{t('recipe.variations')}</h2><div className="list">{variants.map(v => <button key={v.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'start', width: '100%' }} onClick={() => nav(`/food/recipes/${v.id}`)}>
      <span className="grow">{recipeName(v, lang)}</span><span className="num small">{fmt(recipeInfo(v).perServing.totals.kcal, 'kcal')}</span></button>)}</div></section>}
    {diary && <RecipeToDiary recipeId={r.id} portions={portions} onClose={() => setDiary(false)} />}
    {plan && <RecipeToPlan recipeId={r.id} portions={portions} onClose={() => setPlan(false)} />}
  </Page>;
}

export function recipeDiaryRow(recipeId: string, portions: number, lang: string) {
  const r = getRecipe(recipeId)!; const n = recipeNutrition(r.ingredients, r.servings, x => getFood(x)?.per100g, portions);
  const grams = r.ingredients.filter(i => i.consumed !== false).reduce((a, i) => a + i.grams, 0) / r.servings * portions;
  return { recipe_id: r.id, food_id: null, name: recipeName(r, lang), servings: portions, grams: Math.max(0.1, Math.round(grams)), verified: true,
    kcal: n.totals.kcal, protein: n.totals.protein, carbs: n.totals.carbs, fat: n.totals.fat, fiber: n.totals.fiber,
    sugar: n.incomplete.sugar ? null : n.totals.sugar, added_sugar: n.incomplete.addedSugar ? null : n.totals.addedSugar };
}

function RecipeToDiary({ recipeId, portions, onClose }: { recipeId: string; portions: number; onClose: () => void }) {
  const { t, lang } = useI18n(); const { insert, toast } = useApp(); const [meal, setMeal] = useState<MealSlot>(defaultMeal()); const [date, setDate] = useState(isoDate()); const [err, setErr] = useState('');
  return <Modal open onClose={onClose} title={t('diary.add')}>
    <label className="field">{t('food.meal')}<select value={meal} onChange={e => setMeal(e.target.value as MealSlot)}>{MEALS.map(m => <option key={m} value={m}>{t('meal.' + m)}</option>)}</select></label>
    <label className="field">{t('common.date')}<input type="date" value={date} max={isoDate()} onChange={e => setDate(e.target.value)} /></label>
    {err && <p className="err">{err}</p>}
    <button className="btn primary" onClick={async () => { try { await insert('diary_entries', { ...recipeDiaryRow(recipeId, portions, lang), date, meal }); toast(t('diary.added'), 'ok'); onClose(); } catch (e) { setErr(errMsg(e)); } }}>{t('common.add')}</button>
  </Modal>;
}

export function RecipeToPlan({ recipeId, portions, onClose, date: d0, meal: m0 }: { recipeId: string; portions: number; onClose: () => void; date?: string; meal?: Meal }) {
  const { t, df } = useI18n(); const { insert, toast } = useApp();
  const [meal, setMeal] = useState<Meal>(m0 ?? 'lunch'); const [date, setDate] = useState(d0 ?? isoDate()); const [err, setErr] = useState('');
  const days = Array.from({ length: 14 }, (_, i) => addDays(isoDate(), i));
  return <Modal open onClose={onClose} title={t('recipe.toPlan')}>
    <label className="field">{t('common.date')}<select value={date} onChange={e => setDate(e.target.value)}>{days.map(x => <option key={x} value={x}>{df(x, { weekday: 'long', day: 'numeric', month: 'short' })}</option>)}</select></label>
    <label className="field">{t('food.meal')}<select value={meal} onChange={e => setMeal(e.target.value as Meal)}>{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => <option key={m} value={m}>{t('meal.' + m)}</option>)}</select></label>
    {err && <p className="err">{err}</p>}
    <button className="btn primary" onClick={async () => { try { await insert('meal_plan_items', { date, meal, recipe_id: recipeId, portions }); toast(t('plan.added'), 'ok'); onClose(); } catch (e) { setErr(errMsg(e)); } }}>{t('common.add')}</button>
  </Modal>;
}

