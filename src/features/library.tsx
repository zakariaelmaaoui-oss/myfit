import { useEffect, useMemo, useState } from 'react';
import { Holo, Icon } from '../design';
import { supabase } from '../lib/supabase';
import { RECIPES, recipeName, recipeSteps, l3, type Meal } from '../data/recipes';
import { recipeInfo, type RecipeInfo } from '../lib/recipes';
import { getFood, foodName } from '../lib/foods';
import { recipeEmoji, foodEmoji } from '../lib/emoji';
import { recipeNutrition, isoDate } from '../lib/nutrition';
import { priceTable, SWAPS } from '../data/market';
import { allowed, cuisineOf, mealIdeas, planDay, CUISINES } from '../core/meals';
import * as E from '../core/engine';
import { useHunter } from '../app/store';
import { Modal, Seg, Busy, useBusy, fmt, Spinner } from '../app/ui';
import { t, lang } from '../app/i18n';

const PRICES = priceTable();
const ART = ['from-sky-500/30 via-indigo-600/20 to-violet-700/30', 'from-violet-600/30 via-fuchsia-600/15 to-sky-600/25', 'from-cyan-500/25 via-sky-700/20 to-indigo-800/30', 'from-indigo-600/30 via-violet-700/20 to-fuchsia-700/25'];
const FLAG: Record<string, string> = { moroccan: '🇲🇦', mediterranean: '🫒', middle_eastern: '🧆', french: '🇫🇷', italian: '🇮🇹', spanish: '🇪🇸', turkish: '🇹🇷', indian: '🇮🇳', asian: '🥢', mexican: '🇲🇽', american: '🇺🇸' };
const CATS = ['all', 'u200', 'u300', 'u400', 'u500', 'protein', 'budget', 'quick', 'veg', 'fav'] as const;
const CAT_LABEL: Record<string, string> = { all: 'All', u200: '< 200 kcal', u300: '< 300 kcal', u400: '< 400 kcal', u500: '< 500 kcal', protein: 'High protein', budget: 'Budget', quick: 'Quick ≤ 20 min', veg: 'Vegetarian', fav: '★ Favorites' };
const INFOS = () => RECIPES.map(r => recipeInfo(r, PRICES));

function RecipeDetail({ info, onClose, fav, toggleFav }: { info: RecipeInfo; onClose: () => void; fav: boolean; toggleFav: () => void }) {
  const { act } = useHunter(); const r = info.recipe; const [servings, setServings] = useState(1); const [meal, setMeal] = useState<Meal>(r.meals[0] ?? 'lunch');
  const [swaps, setSwaps] = useState<Record<string, string>>({}); const [busy, run] = useBusy();
  const ings = r.ingredients.map(i => ({ ...i, foodId: swaps[i.foodId] ?? i.foodId }));
  const n = recipeNutrition(ings, r.servings, id => getFood(id)?.per100g).totals;
  const k = (v: number) => Math.round(v * servings);
  const swapped = Object.keys(swaps).length > 0;
  const alternatives = useMemo(() => INFOS().filter(x => x.recipe.id !== r.id && x.recipe.meals.some(m => r.meals.includes(m)) && Math.abs(x.perServing.totals.kcal - info.perServing.totals.kcal) < 150).sort((a, b) => b.perServing.totals.protein - a.perServing.totals.protein).slice(0, 4), [r.id]);
  const add = () => run(async () => {
    await act(async (sb, u) => {
      if (!swapped) await E.logFood(sb, u, isoDate(), meal, [{ recipe_id: r.id, servings, name: recipeName(r, lang()) }]);
      else await E.logFood(sb, u, isoDate(), meal, [{ name: `${recipeName(r, lang())} (with swaps)`, kcal: k(n.kcal), protein: k(n.protein), carbs: k(n.carbs), fat: k(n.fat), source: 'manual', estimate: false }]);
    }, { title: 'FOOD LOGGED', lines: [`${recipeName(r, lang())} ×${servings} — ${k(n.kcal)} kcal`] }); onClose();
  });
  return <Modal title={recipeName(r, lang())} onClose={onClose} wide>
    <div className="space-y-4">
      <div className={`relative h-40 rounded-xl bg-gradient-to-br ${ART[r.id.length % ART.length]} grid place-items-center`}><span className="text-7xl drop-shadow-[0_0_18px_rgba(56,189,248,.6)]">{recipeEmoji(r)}</span>
        <span className="absolute top-2 left-2 chip !py-0.5 !text-[11px]">{FLAG[cuisineOf(r)]} {cuisineOf(r).replace('_', ' ')}</span>
        <button className={`absolute top-2 right-2 grid place-items-center w-9 h-9 rounded-full bg-black/40 ${fav ? 'text-amber-300' : 'text-slate-200'}`} onClick={toggleFav} aria-label="Favorite"><Icon n="star" s={18} /></button></div>
      <div className="grid grid-cols-4 gap-2 text-center">{[['kcal', k(n.kcal)], [t('protein'), `${k(n.protein)} g`], [t('carbs'), `${k(n.carbs)} g`], [t('fat'), `${k(n.fat)} g`]].map(([l, v]) =>
        <div key={String(l)} className="rounded-lg bg-void-950/60 border border-sky-400/15 py-2"><div className="display text-sky-100">{v}</div><div className="label !text-[9px]">{l}</div></div>)}</div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300"><span><Icon n="clock" s={14} className="inline -mt-0.5" /> {info.totalMin} min</span>
        <span>🍽️ {l3(r.serving, lang())}</span>{info.costPerServing !== null && <span title="Approximate Moroccan market prices">💰 ≈ {fmt(info.costPerServing * servings, 0)} MAD (estimate)</span>}
        {swapped && <span className="text-amber-200">Swaps applied — values recalculated</span>}</div>
      <div><span className="label">Servings</span><div className="mt-1"><Seg value={String(servings)} onChange={v => setServings(Number(v))} options={['0.5', '1', '1.5', '2', '3'].map(x => ({ id: x, label: `×${x}` }))} /></div></div>
      <div><div className="label mb-1">Ingredients (for {fmt(servings)} serving{servings > 1 ? 's' : ''})</div>
        <ul className="divide-y divide-sky-400/10">{r.ingredients.map(i => { const id = swaps[i.foodId] ?? i.foodId; const f = getFood(id); const opts = SWAPS[i.foodId];
          return <li key={i.foodId} className="flex items-center gap-2 py-1.5 text-sm"><span>{foodEmoji(f)}</span><span className="flex-1 text-slate-200">{foodName(f, lang())}{swaps[i.foodId] && <span className="text-amber-200"> (swap)</span>}</span>
            <span className="text-slate-400">{fmt(i.grams / r.servings * servings)} g</span>
            {opts && <select className="field !min-h-8 !py-0.5 !w-auto !text-xs" value={swaps[i.foodId] ?? ''} onChange={e => setSwaps(s => { const x = { ...s }; if (e.target.value) x[i.foodId] = e.target.value; else delete x[i.foodId]; return x; })}>
              <option value="">swap…</option>{opts.map(o => <option key={o.to} value={o.to}>{foodName(getFood(o.to), lang())} · {o.why}</option>)}</select>}</li>; })}</ul></div>
      <div><div className="label mb-1">Steps</div><ol className="list-decimal ps-5 space-y-1 text-sm text-slate-300">{recipeSteps(r, lang()).map((s, i) => <li key={i} dir="auto">{s}</li>)}</ol></div>
      {r.note && <p className="text-[13px] text-slate-400">💡 {l3(r.note, lang())}</p>}
      {alternatives.length > 0 && <div><div className="label mb-1">Alternatives (similar calories)</div><div className="flex flex-wrap gap-2">{alternatives.map(a => <span key={a.recipe.id} className="chip">{recipeEmoji(a.recipe)} {recipeName(a.recipe, lang())} · {fmt(a.perServing.totals.kcal)} kcal</span>)}</div></div>}
      <div className="flex gap-2 items-center sticky bottom-0 bg-void-900/95 py-2"><Seg value={meal} onChange={setMeal} options={(['breakfast', 'lunch', 'snack', 'dinner'] as Meal[]).map(m => ({ id: m, label: t(m) }))} />
        <Busy busy={busy} className="neon-btn flex-1 shrink-0" onClick={add}><Icon n="plus" s={16} />Diary · {k(n.kcal)} kcal</Busy></div>
      <p className="text-[11px] text-slate-500">Nutrition calculated from USDA ingredient data. Prices are approximate Moroccan market estimates.</p>
    </div>
  </Modal>;
}

function Planner({ onOpen }: { onOpen: (id: string) => void }) {
  const { h } = useHunter(); const [meal, setMeal] = useState<Meal | 'day'>('dinner'); const [seed, setSeed] = useState(0);
  if (!h) return null;
  const p = { diet: h.profile.diet, allergies: h.profile.allergies, cuisines: h.profile.cuisines };
  const remKcal = Math.max(200, (h.target?.kcal ?? 2000) - h.day.totals.kcal); const remP = Math.max(0, (h.target?.protein ?? 0) - h.day.totals.protein);
  const logged = new Set(h.day.foods.map(f => f.meal)); const left = (['breakfast', 'lunch', 'snack', 'dinner'] as Meal[]).filter(m => !logged.has(m));
  const ideas = meal === 'day' ? null : mealIdeas(meal, Math.min(remKcal, meal === 'snack' ? 300 : 800), p, { count: 10 });
  const plan = meal === 'day' ? planDay(remKcal, remP, left.length ? left : ['snack'], p, seed) : null;
  return <Holo violet title={`${t('ideas')} · AI planner`} right={<span className="text-[12px] text-slate-400">{fmt(remKcal)} kcal · {fmt(remP)} g P left</span>}>
    <Seg value={meal} onChange={v => setMeal(v)} options={[...(['breakfast', 'lunch', 'snack', 'dinner'] as Meal[]).map(m => ({ id: m, label: t(m) })), { id: 'day' as const, label: `🗓️ ${t('planDay')}` }]} />
    {ideas && <div className="mt-3 grid sm:grid-cols-2 gap-2">{ideas.map(i => <button key={i.recipe_id} className="flex items-center gap-3 rounded-xl border border-sky-400/15 bg-void-950/40 p-2.5 text-left hover:shadow-glow" onClick={() => onOpen(i.recipe_id)}>
      <span className="text-2xl">{recipeEmoji(RECIPES.find(r => r.id === i.recipe_id)!)}</span><span className="flex-1 min-w-0"><span className="block text-slate-100 truncate">{recipeName(RECIPES.find(r => r.id === i.recipe_id)!, lang())}</span><span className="text-[11px] text-slate-500">{i.kcal} kcal · {i.protein} g P · {i.minutes} min</span></span></button>)}
      {!ideas.length && <p className="text-sm text-slate-400">No recipe fits under the remaining calories with your preferences — a fruit or a yogurt is a good snack.</p>}</div>}
    {plan && <div className="mt-3 space-y-2">{plan.meals.map(m => <button key={m.meal} className="w-full flex items-center gap-3 rounded-xl border border-sky-400/15 bg-void-950/40 p-2.5 text-left hover:shadow-glow" onClick={() => onOpen(m.idea.recipe_id)}>
      <span className="label w-20">{t(m.meal)}</span><span className="flex-1 text-slate-100 truncate">{recipeName(RECIPES.find(r => r.id === m.idea.recipe_id)!, lang())}</span><span className="text-[12px] text-slate-400">{m.idea.kcal} kcal · {m.idea.protein} g</span></button>)}
      <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Total {plan.kcal} kcal · {plan.protein} g protein (of {fmt(remKcal)} kcal left)</span><button className="ghost-btn" onClick={() => setSeed(seed + 1)}>↻ Another plan</button></div></div>}
    <p className="text-[11px] text-slate-500 mt-2">Respects your diet{h.profile.allergies.length ? ` and allergies (${h.profile.allergies.join(', ')})` : ''}. Ask THE SYSTEM for more ideas.</p>
  </Holo>;
}

export function Library() {
  const { uid } = useHunter(); const { h } = useHunter();
  const [cat, setCat] = useState<typeof CATS[number]>('all'); const [cuisine, setCuisine] = useState('all'); const [mealF, setMealF] = useState('all'); const [q, setQ] = useState('');
  const [favs, setFavs] = useState<Set<string>>(new Set()); const [open, setOpen] = useState<string | null>(null); const [limit, setLimit] = useState(24);
  const infos = useMemo(INFOS, []);
  useEffect(() => { if (uid) supabase.from('sf_favorite_recipes').select('recipe_id').eq('user_id', uid).then(({ data }) => setFavs(new Set((data ?? []).map(x => x.recipe_id)))); }, [uid]);
  const prefs = h ? { diet: h.profile.diet, allergies: h.profile.allergies } : {};
  const list = useMemo(() => infos.filter(i => { const k = i.perServing.totals.kcal;
    if (!allowed(i, prefs)) return false;
    if (q && ![i.recipe.name.en, i.recipe.name.fr, i.recipe.name.ar].join(' ').toLowerCase().includes(q.toLowerCase())) return false;
    if (cuisine !== 'all' && cuisineOf(i.recipe) !== cuisine) return false;
    if (mealF !== 'all' && !i.recipe.meals.includes(mealF as Meal)) return false;
    return cat === 'all' || (cat === 'u200' && k < 200) || (cat === 'u300' && k < 300) || (cat === 'u400' && k < 400) || (cat === 'u500' && k < 500) || (cat === 'protein' && i.highProtein)
      || (cat === 'budget' && (i.recipe.budget || (i.costPerServing ?? 99) <= 12)) || (cat === 'quick' && i.quick) || (cat === 'veg' && i.vegetarian) || (cat === 'fav' && favs.has(i.recipe.id)); })
    .sort((a, b) => Number(cuisineOf(b.recipe) === 'moroccan') - Number(cuisineOf(a.recipe) === 'moroccan')), [infos, cat, cuisine, mealF, q, favs, h]);
  const toggleFav = async (id: string) => {
    const on = favs.has(id); const n = new Set(favs); on ? n.delete(id) : n.add(id); setFavs(n);
    const r = on ? await supabase.from('sf_favorite_recipes').delete().eq('user_id', uid).eq('recipe_id', id) : await supabase.from('sf_favorite_recipes').insert({ user_id: uid, recipe_id: id });
    if (r.error) setFavs(favs);
  };
  const cuisinesPresent = CUISINES.filter(c => infos.some(i => cuisineOf(i.recipe) === c));
  const openInfo = open ? infos.find(i => i.recipe.id === open) : null;
  if (!h) return <Spinner />;
  return <div className="space-y-5 animate-rise">
    <div><div className="label text-neon-cyan">World cuisine · Moroccan first</div><h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">{t('library').toUpperCase()}</h1></div>
    <Planner onOpen={setOpen} />
    <div className="holo !p-2 flex items-center gap-2"><Icon n="search" s={18} className="ml-2 text-slate-400" /><input className="field !border-0 !bg-transparent" placeholder={`${t('search')} ${infos.length} recipes — tagine, harira, salad…`} value={q} onChange={e => setQ(e.target.value)} /></div>
    <Seg value={cat} onChange={setCat} options={CATS.map(c => ({ id: c, label: CAT_LABEL[c] }))} />
    <div className="flex flex-wrap gap-2"><Seg value={cuisine} onChange={setCuisine} options={[{ id: 'all', label: '🌍 All cuisines' }, ...cuisinesPresent.map(c => ({ id: c, label: `${FLAG[c]} ${c.replace('_', ' ')}` }))]} />
      <Seg value={mealF} onChange={setMealF} options={[{ id: 'all', label: 'Any meal' }, ...(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => ({ id: m, label: t(m) }))]} /></div>
    <div className="text-[12px] text-slate-500">{list.length} recipes{h.profile.diet !== 'none' || h.profile.allergies.length ? ' · filtered for your diet/allergies' : ''}</div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.slice(0, limit).map((i, k) => <div key={i.recipe.id} className="holo !p-0 group hover:shadow-glow transition cursor-pointer" onClick={() => setOpen(i.recipe.id)}>
      <div className={`relative h-32 bg-gradient-to-br ${ART[k % ART.length]} grid place-items-center overflow-hidden rounded-t-[18px]`}><span className="text-6xl drop-shadow-[0_0_18px_rgba(56,189,248,.6)] group-hover:scale-110 transition">{recipeEmoji(i.recipe)}</span>
        <span className="absolute top-2 left-2 chip !py-0.5 !text-[11px]">{FLAG[cuisineOf(i.recipe)]} {cuisineOf(i.recipe).replace('_', ' ')}</span>
        <button className={`absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-full bg-black/40 ${favs.has(i.recipe.id) ? 'text-amber-300' : 'text-slate-200'}`} aria-label="Favorite" onClick={e => { e.stopPropagation(); toggleFav(i.recipe.id); }}><Icon n="star" s={16} /></button></div>
      <div className="p-4"><div className="font-ui font-bold text-lg text-slate-50 leading-tight" dir="auto">{recipeName(i.recipe, lang())}</div>
        <div className="grid grid-cols-4 gap-1 mt-3 text-center">{[['kcal', fmt(i.perServing.totals.kcal)], ['prot', `${fmt(i.perServing.totals.protein)}g`], ['carb', `${fmt(i.perServing.totals.carbs)}g`], ['fat', `${fmt(i.perServing.totals.fat)}g`]].map(([l, v]) =>
          <div key={l} className="rounded-md bg-void-950/50 border border-sky-400/10 py-1"><div className="display text-sm text-sky-100">{v}</div><div className="label !text-[9px]">{l}</div></div>)}</div>
        <div className="flex items-center justify-between mt-3 text-[12px] text-slate-400"><span><Icon n="clock" s={13} className="inline -mt-0.5" /> {i.totalMin} min</span>
          <span>{i.costPerServing !== null ? `≈ ${fmt(i.costPerServing)} MAD` : i.recipe.budget ? '💰 Budget' : ''}</span>{i.highProtein && <span className="text-sky-300">⚡ protein</span>}</div></div>
    </div>)}</div>
    {list.length > limit && <button className="ghost-btn w-full" onClick={() => setLimit(limit + 24)}>Show more ({list.length - limit})</button>}
    {openInfo && <RecipeDetail info={openInfo} onClose={() => setOpen(null)} fav={favs.has(openInfo.recipe.id)} toggleFav={() => toggleFav(openInfo.recipe.id)} />}
  </div>;
}
