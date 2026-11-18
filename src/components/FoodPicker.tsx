import { useMemo, useState } from 'react';
import { FOOD_CATEGORIES, foodName, getFood, searchFoods, type Food } from '../lib/foods';
import { useI18n } from '../lib/i18n';
import { useApp } from '../lib/app';
import { isoDate, scaleNutrients } from '../lib/nutrition';
import { Icon, Modal, NutrientTable, errMsg, useFmt } from './ui';
import { foodEmoji } from '../lib/emoji';

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'] as const;
export type MealSlot = typeof MEALS[number];
export function defaultMeal(): MealSlot {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}

export function FoodSearch({ onPick, category: initialCat = 'all', autoFocus }: { onPick: (f: Food) => void; category?: string; autoFocus?: boolean }) {
  const { t, lang } = useI18n(); const f = useFmt();
  const [q, setQ] = useState(''); const [cat, setCat] = useState(initialCat); const [limit, setLimit] = useState(40);
  const results = useMemo(() => searchFoods(q, cat), [q, cat]);
  return <div className="stack">
    <div className="row"><div className="grow" style={{ position: 'relative' }}>
      <input aria-label={t('food.search')} placeholder={t('food.searchPh')} value={q} autoFocus={autoFocus} onChange={e => { setQ(e.target.value); setLimit(40); }} style={{ paddingInlineStart: 38 }} />
      <span style={{ position: 'absolute', insetInlineStart: 12, top: 12, color: 'var(--muted)' }}><Icon n="search" s={18} /></span></div></div>
    <div className="chips scroll-x" style={{ flexWrap: 'nowrap', paddingBottom: 4 }}>
      {['all', ...FOOD_CATEGORIES, 'custom'].map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{t('cat.' + c)}</button>)}
    </div>
    <div className="list" data-testid="food-results">
      {results.slice(0, limit).map(fd => <button key={fd.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', cursor: 'pointer', width: '100%' }} onClick={() => onPick(fd)}>
        <span className="thumb sm" aria-hidden="true">{foodEmoji(fd)}</span>
        <div className="grow" style={{ minWidth: 0 }}><div className="ellipsis" style={{ fontWeight: 600 }}>{foodName(fd, lang)}</div>
          <div className="tiny muted">{t('food.per100')} · {f(fd.per100g.protein)} {t('n.proteinShort')} · {f(fd.per100g.sugar)} {t('n.sugarShort')}{!fd.verified && <> · <span className="badge beige">{t('food.unverified')}</span></>}</div></div>
        <b className="num small">{f(fd.per100g.kcal, 'kcal')}</b>
      </button>)}
      {!results.length && <p className="empty">{t('food.noResults')}</p>}
      {results.length > limit && <button className="btn ghost" onClick={() => setLimit(limit + 40)}>{t('common.showMore')} ({results.length - limit})</button>}
    </div>
  </div>;
}

/** Quantity + meal selection with live calculation. Used to add and to edit diary entries. */
export function AddFoodSheet({ food, open, onClose, date = isoDate(), entry, initialMeal }: { food: Food | null; open: boolean; onClose: () => void; date?: string; entry?: any; initialMeal?: MealSlot }) {
  const { t, lang } = useI18n(); const { insert, update, toast } = useApp(); const f = useFmt();
  const [grams, setGrams] = useState<string>(entry ? String(entry.grams) : '100');
  const [portion, setPortion] = useState<string>('');
  const [count, setCount] = useState('1');
  const [meal, setMeal] = useState<MealSlot>(entry?.meal ?? initialMeal ?? (food?.category === 'drinks' ? 'drink' : defaultMeal()));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (!food) return null;
  const g = portion ? Number(portion) * Number(count || 0) : Number(grams);
  const n = scaleNutrients(food.per100g, isFinite(g) ? g : 0);
  const save = async () => {
    setErr('');
    if (!(g > 0) || g > 5000) return setErr(t('val.grams'));
    const row = { date: entry?.date ?? date, meal, food_id: food.id, recipe_id: null, name: foodName(food, lang), grams: Math.round(g * 10) / 10,
      portion_label: portion ? `${count} × ${food.portions.find(p => String(p.grams) === portion)?.label ?? ''}` : null,
      kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, fiber: n.fiber, sugar: n.sugar, added_sugar: n.addedSugar, verified: food.verified };
    setBusy(true);
    try {
      if (entry) await update('diary_entries', entry.id, row); else await insert('diary_entries', row);
      toast(t(entry ? 'diary.updated' : 'diary.added'), 'ok'); onClose();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return <Modal open={open} onClose={onClose} title={foodName(food, lang)}>
    <div className="tiny muted">{food.source}{food.fdcId ? ` · FDC ${food.fdcId}` : ''}</div>
    {food.portions.length > 0 && <label className="field">{t('food.serving')}<select value={portion} onChange={e => setPortion(e.target.value)}>
      <option value="">{t('food.grams')}</option>{food.portions.map(p => <option key={p.label + p.grams} value={String(p.grams)}>{p.label} ({p.grams} g)</option>)}</select></label>}
    {portion ? <label className="field">{t('food.count')}<input type="number" inputMode="decimal" min={0.25} step={0.25} value={count} onChange={e => setCount(e.target.value)} /></label>
      : <label className="field">{t('food.quantity')}<input data-testid="grams" type="number" inputMode="decimal" min={1} max={5000} value={grams} onChange={e => setGrams(e.target.value)} /></label>}
    <label className="field">{t('food.meal')}<select value={meal} onChange={e => setMeal(e.target.value as MealSlot)}>{MEALS.map(m => <option key={m} value={m}>{t('meal.' + m)}</option>)}</select></label>
    <div className="card beige"><div className="row between"><b>{t('food.forQty', { g: Math.round(g * 10) / 10 || 0 })}</b><b className="num" data-testid="calc-kcal">{f(n.kcal, 'kcal')}</b></div><NutrientTable n={n} /></div>
    {err && <p className="err" role="alert">{err}</p>}
    <button className="btn primary block" disabled={busy} onClick={save}>{entry ? t('common.save') : t('diary.add')}</button>
  </Modal>;
}

/** Convenience wrapper: search → quantity. */
export function AddFoodFlow({ open, onClose, date, meal }: { open: boolean; onClose: () => void; date?: string; meal?: MealSlot }) {
  const { t } = useI18n(); const [food, setFood] = useState<Food | null>(null);
  if (!open) return null;
  if (food) return <AddFoodSheet food={food} open onClose={() => { setFood(null); onClose(); }} date={date} initialMeal={meal} />;
  return <Modal open onClose={onClose} title={t('diary.addFood')}><FoodSearch onPick={setFood} autoFocus /></Modal>;
}

export function entryFood(e: any) { return e.food_id ? getFood(e.food_id) : undefined; }
