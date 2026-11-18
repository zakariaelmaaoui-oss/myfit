import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { RECIPES, getRecipe, l3, recipeName, recipeSteps, type Meal } from '../data/recipes';
import { matchFridge, priceMap, recipeInfo, scaledIngredients, type RecipeInfo } from '../lib/recipes';
import { foodName, getFood, type Food } from '../lib/foods';
import { recipeEmoji } from '../lib/emoji';
import { addDays, isoDate, recipeNutrition, scaleNutrients } from '../lib/nutrition';
import { FoodSearch, MEALS, defaultMeal, type MealSlot } from '../components/FoodPicker';
import { Empty, Icon, Modal, NutrientTable, Page, errMsg, useFmt } from '../components/ui';

const FILTERS = ['cost', 'protein', 'lowsugar', 'vegetarian', 'moroccan', 'quick', 'available', 'favorites'] as const;
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
  const fridgeIds = data.fridge_items.map(x => x.food_id);
  const avail = useMemo(() => new Map(matchFridge(fridgeIds, prices).map(m => [m.info.recipe.id, m.pct])), [data.fridge_items, prices]); // eslint-disable-line
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
    if (f.has('available')) l = l.filter(i => (avail.get(i.recipe.id) ?? 0) >= 50).sort((a, b) => (avail.get(b.recipe.id) ?? 0) - (avail.get(a.recipe.id) ?? 0));
    if (f.has('cost')) l = [...l].sort((a, b) => (a.costPerServing ?? Infinity) - (b.costPerServing ?? Infinity) || Number(!!b.recipe.budget) - Number(!!a.recipe.budget));
    return l;
  }, [q, f, meal, prices, data.favorites, avail]); // eslint-disable-line
  const toggle = (x: Filter) => setF(s => { const n = new Set(s); n.has(x) ? n.delete(x) : n.add(x); return n; });
  const noPrices = f.has('cost') && list.every(i => i.costPerServing === null);
  return <Page title={moroccanOnly ? t('nav.moroccan') : t('nav.recipes')} back>
    {moroccanOnly && <p className="small muted">{t('moroccan.intro')}</p>}
    <input placeholder={t('recipe.searchPh')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('recipe.searchPh')} />
    <div className="chips">{FILTERS.filter(x => !(moroccanOnly && x === 'moroccan')).map(x => <button key={x} className={`chip ${f.has(x) ? 'on' : ''}`} onClick={() => toggle(x)}>{t('rf.' + x)}</button>)}</div>
    <div className="chips">{(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => <button key={m} className={`chip ${meal === m ? 'on' : ''}`} onClick={() => setMeal(m)}>{m === 'all' ? t('common.all') : t('meal.' + m)}</button>)}</div>
    {noPrices && <div className="card beige small">{t('recipe.noPrices')} <Link to="/food/budget">{t('nav.budget')}</Link></div>}
    {f.has('available') && !fridgeIds.length && <div className="card beige small">{t('fridge.emptyHint')} <Link to="/food/fridge">{t('nav.fridge')}</Link></div>}
    <p className="tiny muted">{t('recipe.count', { n: list.length })} · {t('recipe.calcNote')}</p>
    <div className="stack" data-testid="recipe-list">{list.map(i => <RecipeCard key={i.recipe.id} info={i} extra={f.has('available') ? <div className="tiny muted" style={{ marginTop: 6 }}>{t('fridge.match', { p: avail.get(i.recipe.id) ?? 0 })}</div> : null} />)}</div>
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

// ---------------- My Fridge ----------------
export function Fridge() {
  const { t, lang, nf, df } = useI18n(); const { data, insert, update, remove, toast } = useApp();
  const [pick, setPick] = useState(false); const [sel, setSel] = useState<Food | null>(null); const [grams, setGrams] = useState('500'); const [exp, setExp] = useState(''); const [err, setErr] = useState('');
  const [edit, setEdit] = useState<any>(null);
  const prices = useMemo(() => priceMap(data.food_prices), [data.food_prices]);
  const items = [...data.fridge_items].sort((a, b) => (a.expires_on || '9999').localeCompare(b.expires_on || '9999'));
  const matches = useMemo(() => matchFridge(items.map(i => i.food_id), prices), [data.fridge_items, prices]); // eslint-disable-line
  const today = isoDate(); const soon = addDays(today, 2);
  const add = async () => {
    setErr(''); try { await insert('fridge_items', { food_id: sel!.id, grams: grams ? Number(grams) : null, expires_on: exp || null }); toast(t('fridge.added'), 'ok'); setSel(null); setPick(false); setGrams('500'); setExp(''); } catch (e) { setErr(errMsg(e)); }
  };
  return <Page title={t('nav.fridge')} back actions={<button className="btn primary sm" onClick={() => setPick(true)}><Icon n="plus" s={16} />{t('common.add')}</button>}>
    <p className="small muted">{t('fridge.intro')}</p>
    <section className="card">{items.length ? <div className="list" data-testid="fridge-list">{items.map(i => {
      const fd = getFood(i.food_id); const expired = i.expires_on && i.expires_on < today; const isSoon = i.expires_on && !expired && i.expires_on <= soon;
      return <div className="li" key={i.id}><div className="grow"><b>{foodName(fd, lang)}</b><div className="tiny muted">{i.grams ? `${nf(i.grams)} g` : ''}{i.expires_on ? ` · ${t('fridge.expires')} ${df(i.expires_on)}` : ''}</div></div>
        {expired && <span className="badge warn">{t('fridge.expired')}</span>}{isSoon && <span className="badge warn">{t('fridge.soon')}</span>}
        <button className="iconbtn" aria-label={t('common.edit')} onClick={() => setEdit({ ...i })}><Icon n="edit" s={16} /></button>
        <button className="iconbtn" aria-label={t('fridge.used')} onClick={() => remove('fridge_items', i.id)}><Icon n="check" s={16} /></button></div>;
    })}</div> : <Empty>{t('fridge.empty')}</Empty>}</section>
    {items.length > 0 && <><h2>{t('fridge.recipes')}</h2><p className="tiny muted">{t('fridge.matchNote')}</p>
      <div className="stack" data-testid="fridge-matches">{matches.slice(0, 12).map(m => <RecipeCard key={m.info.recipe.id} info={m.info} extra={<div className="tiny" style={{ marginTop: 6 }}>
        <b>{t('fridge.match', { p: m.pct })}</b>{m.missing.length > 0 && <span className="muted"> · {t('fridge.missing')}: {m.missing.map(x => foodName(getFood(x), lang)).join(', ')}</span>}</div>} />)}</div>
      {!matches.length && <Empty>{t('fridge.noMatch')}</Empty>}</>}
    {pick && !sel && <Modal open onClose={() => setPick(false)} title={t('fridge.add')}><FoodSearch onPick={setSel} autoFocus /></Modal>}
    {sel && <Modal open onClose={() => { setSel(null); setPick(false); }} title={foodName(sel, lang)}>
      <label className="field">{t('food.quantity')}<input type="number" value={grams} onChange={e => setGrams(e.target.value)} /></label>
      <label className="field">{t('fridge.expiry')}<input type="date" value={exp} onChange={e => setExp(e.target.value)} /></label>
      {err && <p className="err">{err}</p>}<button className="btn primary" onClick={add}>{t('common.add')}</button></Modal>}
    {edit && <Modal open onClose={() => setEdit(null)} title={foodName(getFood(edit.food_id), lang)}>
      <label className="field">{t('food.quantity')}<input type="number" value={edit.grams ?? ''} onChange={e => setEdit({ ...edit, grams: e.target.value })} /></label>
      <label className="field">{t('fridge.expiry')}<input type="date" value={edit.expires_on ?? ''} onChange={e => setEdit({ ...edit, expires_on: e.target.value })} /></label>
      <div className="row"><button className="btn danger grow" onClick={async () => { await remove('fridge_items', edit.id); setEdit(null); }}>{t('fridge.used')}</button>
        <button className="btn primary grow" onClick={async () => { await update('fridge_items', edit.id, { grams: edit.grams === '' ? null : Number(edit.grams), expires_on: edit.expires_on || null }); setEdit(null); }}>{t('common.save')}</button></div></Modal>}
  </Page>;
}
