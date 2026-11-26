import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Holo, Icon, NeonRing, StatBar } from '../design';
import { supabase } from '../lib/supabase';
import { searchFoods, foodName, setCustomFoods, getFood } from '../lib/foods';
import { foodEmoji, recipeEmoji } from '../lib/emoji';
import { scaleNutrients, isoDate, addDays } from '../lib/nutrition';
import { RECIPES, recipeName } from '../data/recipes';
import { recipeInfo } from '../lib/recipes';
import * as E from '../core/engine';
import { useHunter } from '../app/store';
import { Modal, Num, Seg, Field, Busy, useBusy, fmt, Spinner } from '../app/ui';
import { t, lang } from '../app/i18n';

const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
type Meal = typeof MEALS[number];
export const SRC_LABEL: Record<string, string> = { database: 'USDA', recipe: 'Recipe', custom: 'Yours', ai_estimate: 'AI estimate', manual: 'Manual', photo_estimate: 'Photo estimate' };

export function AddFood({ meal: m0, date, onClose }: { meal: Meal; date: string; onClose: () => void }) {
  const { act, uid } = useHunter(); const [tab, setTab] = useState<'search' | 'recipes' | 'custom' | 'manual'>('search'); const [meal, setMeal] = useState<Meal>(m0);
  const [q, setQ] = useState(''); const [pick, setPick] = useState<{ id: string; grams: number } | null>(null); const [busy, run] = useBusy();
  const [custom, setCustom] = useState<any[]>([]);
  useEffect(() => { if (uid) supabase.from('sf_custom_foods').select('*').eq('user_id', uid).then(({ data }) => { setCustomFoods(data ?? []); setCustom(data ?? []); }); }, [uid]);
  const results = useMemo(() => q.trim().length < 2 ? [] : searchFoods(q).slice(0, 30), [q, custom]);
  const recipes = useMemo(() => RECIPES.filter(r => !q || [r.name.en, r.name.fr, r.name.ar].join(' ').toLowerCase().includes(q.toLowerCase())).slice(0, 40).map(r => recipeInfo(r)), [q]);
  const save = (items: E.FoodItemInput[]) => run(async () => { await act(async (sb, u) => { await E.logFood(sb, u, date, meal, items); if (date !== isoDate()) await E.syncDay(sb, u, date); }, { title: 'FOOD LOGGED', lines: items.map(i => i.name ?? '') .filter(Boolean) }); onClose(); });
  const f = pick ? getFood(pick.id) : null; const n = f ? scaleNutrients(f.per100g, pick!.grams) : null;
  const [cf, setCf] = useState({ name: '', kcal: '' as number | '', protein: '' as number | '', carbs: '' as number | '', fat: '' as number | '', serving_g: 100 as number | '' });
  const [man, setMan] = useState({ name: '', kcal: '' as number | '', protein: '' as number | '' });
  return <Modal title={t('addFood')} onClose={onClose} wide>
    <div className="space-y-3">
      <Seg value={meal} onChange={setMeal} options={MEALS.map(x => ({ id: x, label: t(x) }))} />
      <Seg value={tab} onChange={v => { setTab(v); setPick(null); }} options={[{ id: 'search', label: `🔎 ${t('searchFood')}` }, { id: 'recipes', label: '📖 Recipes' }, { id: 'custom', label: `🏷️ ${t('customFood')}` }, { id: 'manual', label: '✍️ Manual / estimate' }]} />
      {(tab === 'search' || tab === 'recipes') && <input className="field" autoFocus placeholder={tab === 'search' ? 'egg, khobz, lentils, poulet, سردين…' : 'tagine, harira, salad…'} value={q} onChange={e => { setQ(e.target.value); setPick(null); }} />}
      {tab === 'search' && !pick && <div className="max-h-[50vh] overflow-y-auto divide-y divide-sky-400/10">
        {q.trim().length < 2 && <p className="text-sm text-slate-400 py-3">Verified USDA database (211 foods) + your custom foods. Not found? Use “Manual” or tell THE SYSTEM — it estimates and labels it.</p>}
        {results.map(x => <button key={x.id} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-sky-400/5 px-1" onClick={() => setPick({ id: x.id, grams: x.portions[0]?.grams ?? 100 })}>
          <span className="text-2xl">{foodEmoji(x)}</span><span className="flex-1 min-w-0"><span className="block text-slate-100 truncate">{foodName(x, lang())}</span><span className="text-[11px] text-slate-500">{x.verified ? 'USDA' : 'Yours'} · {fmt(x.per100g.kcal)} kcal / 100 g · {fmt(x.per100g.protein, 1)} g protein</span></span><Icon n="plus" s={16} className="text-sky-300" /></button>)}
        {q.trim().length >= 2 && !results.length && <p className="text-sm text-slate-400 py-3">No match. Try English/French words, or use Manual.</p>}
      </div>}
      {tab === 'search' && pick && f && n && <div className="space-y-3">
        <div className="flex items-center gap-3"><span className="text-4xl">{foodEmoji(f)}</span><div><div className="font-ui font-bold text-lg text-slate-50">{foodName(f, lang())}</div><div className="text-[11px] text-slate-500">{f.source}</div></div></div>
        <div className="flex flex-wrap gap-2">{f.portions.map(p => <button key={p.label} className={`chip ${pick.grams === p.grams ? 'on' : ''}`} onClick={() => setPick({ ...pick, grams: p.grams })}>{p.label} · {p.grams} g</button>)}</div>
        <Field label={t('grams')}><Num value={pick.grams} min={1} max={3000} onChange={v => setPick({ ...pick, grams: Number(v) || 0 })} /></Field>
        <div className="grid grid-cols-4 gap-2 text-center">{[['kcal', n.kcal], [t('protein'), n.protein], [t('carbs'), n.carbs], [t('fat'), n.fat]].map(([l, v]) => <div key={String(l)} className="rounded-lg bg-void-950/60 border border-sky-400/15 py-2"><div className="display text-sky-100">{fmt(v as number)}</div><div className="label !text-[9px]">{l}</div></div>)}</div>
        <div className="flex gap-2"><button className="ghost-btn" onClick={() => setPick(null)}><Icon n="back" s={16} /></button>
          <Busy busy={busy} className="neon-btn flex-1" disabled={!pick.grams} onClick={() => save([{ food_id: f.id, grams: pick.grams, name: foodName(f, lang()) }])}>{t('add')} · {fmt(n.kcal)} kcal</Busy></div>
      </div>}
      {tab === 'recipes' && <div className="max-h-[55vh] overflow-y-auto divide-y divide-sky-400/10">{recipes.map(i => <RecipeQuickAdd key={i.recipe.id} info={i} busy={busy} onAdd={s => save([{ recipe_id: i.recipe.id, servings: s, name: recipeName(i.recipe, lang()) }])} />)}</div>}
      {tab === 'custom' && <div className="space-y-3">
        <p className="text-[13px] text-slate-400">Create a food from its label (values per 100 g). It’s saved to your private list and searchable.</p>
        <Field label="Name"><input className="field" value={cf.name} maxLength={120} onChange={e => setCf({ ...cf, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{(['kcal', 'protein', 'carbs', 'fat', 'serving_g'] as const).map(k => <Field key={k} label={k === 'serving_g' ? 'Eaten (g)' : `${k} /100g`}><Num value={cf[k]} min={0} max={k === 'kcal' ? 900 : k === 'serving_g' ? 2000 : 100} onChange={v => setCf({ ...cf, [k]: v })} /></Field>)}</div>
        <Busy busy={busy} className="neon-btn w-full" disabled={!cf.name.trim() || cf.kcal === '' || !cf.serving_g} onClick={() => run(async () => {
          const { data, error } = await supabase.from('sf_custom_foods').insert({ user_id: uid, name: cf.name.trim(), kcal: cf.kcal, protein: cf.protein || 0, carbs: cf.carbs || 0, fat: cf.fat || 0, serving_g: cf.serving_g }).select().single();
          if (error) throw error; await act(async (sb, u) => { await E.logFood(sb, u, date, meal, [{ food_id: `custom:${data.id}`, grams: Number(cf.serving_g) }]); }, { title: 'FOOD LOGGED', lines: [cf.name] }); onClose(); })}>{t('save')} + {t('add')}</Busy>
      </div>}
      {tab === 'manual' && <div className="space-y-3">
        <p className="text-[13px] text-slate-400">For a dish you can’t find. It is stored and shown as an <b className="text-amber-200">estimate</b>. Tip: THE SYSTEM can estimate it for you from a description or a photo.</p>
        <Field label="What did you eat?"><input className="field" value={man.name} maxLength={160} onChange={e => setMan({ ...man, name: e.target.value })} placeholder="e.g. Tajine kefta, 1 plate" /></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="kcal (estimate)"><Num value={man.kcal} min={0} max={5000} onChange={v => setMan({ ...man, kcal: v })} /></Field><Field label={`${t('protein')} g`}><Num value={man.protein} min={0} max={300} onChange={v => setMan({ ...man, protein: v })} /></Field></div>
        <div className="flex gap-2"><Link to="/system" className="ghost-btn" onClick={onClose}><Icon n="system" s={16} />Ask THE SYSTEM</Link>
          <Busy busy={busy} className="neon-btn flex-1" disabled={!man.name.trim() || man.kcal === ''} onClick={() => save([{ name: man.name.trim(), kcal: Number(man.kcal), protein: man.protein === '' ? null : Number(man.protein), source: 'manual', estimate: true }])}>{t('add')}</Busy></div>
      </div>}
    </div>
  </Modal>;
}
function RecipeQuickAdd({ info, onAdd, busy }: { info: ReturnType<typeof recipeInfo>; onAdd: (s: number) => void; busy: boolean }) {
  const [s, setS] = useState(1); const k = info.perServing.totals;
  return <div className="flex items-center gap-3 py-2.5 px-1"><span className="text-2xl">{recipeEmoji(info.recipe)}</span>
    <div className="flex-1 min-w-0"><div className="text-slate-100 truncate">{recipeName(info.recipe, lang())}</div><div className="text-[11px] text-slate-500">{Math.round(k.kcal * s)} kcal · {Math.round(k.protein * s)} g protein · {info.recipe.serving.en}</div></div>
    <select className="field !min-h-9 !w-20 !py-1" value={s} onChange={e => setS(Number(e.target.value))}>{[0.5, 1, 1.5, 2].map(x => <option key={x} value={x}>×{x}</option>)}</select>
    <button className="ghost-btn !min-h-9 !px-2.5" disabled={busy} onClick={() => onAdd(s)}><Icon n="plus" s={16} /></button></div>;
}

export function Nutrition() {
  const { h, act, uid } = useHunter(); const [date, setDate] = useState(isoDate()); const [add, setAdd] = useState<Meal | null>(null);
  const [other, setOther] = useState<Awaited<ReturnType<typeof E.loadDay>> | null>(null); const [busy, run] = useBusy();
  const isToday = date === isoDate();
  useEffect(() => { if (!isToday && uid) E.loadDay(supabase, uid, date).then(setOther); }, [date, isToday, uid, h]);
  if (!h) return <Spinner />;
  const day = isToday ? h.day : other; const tg = h.target;
  const water = (ml: number) => run(() => act((sb, u) => E.logWater(sb, u, date, ml)));
  return <div className="space-y-5 animate-rise">
    <div className="flex items-center justify-between gap-3"><div><div className="label text-neon-cyan">Fuel the hunter</div><h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">{t('nutrition').toUpperCase()}</h1></div>
      <div className="flex items-center gap-1"><button className="ghost-btn !px-2.5" onClick={() => setDate(addDays(date, -1))}><Icon n="back" s={16} /></button>
        <span className="font-ui font-bold text-sky-100 w-24 text-center">{isToday ? 'TODAY' : date.slice(5)}</span>
        <button className="ghost-btn !px-2.5" disabled={isToday} onClick={() => setDate(addDays(date, 1))}><Icon n="next" s={16} /></button></div></div>
    {!day ? <Spinner /> : <>
      <div className="grid lg:grid-cols-3 gap-5">
        <Holo violet scan title="Energy core" className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <NeonRing value={day.totals.kcal} max={tg?.kcal ?? 2000} size={170} stroke={12}><div><div className="display text-3xl text-sky-50 glow-text">{fmt(day.totals.kcal)}</div><div className="label">/ {tg?.kcal ?? '–'} kcal</div>
              {tg?.kcal && <div className={`text-[11px] mt-1 ${day.totals.kcal > tg.kcal ? 'text-amber-300' : 'text-emerald-300'}`}>{day.totals.kcal > tg.kcal ? `+${fmt(day.totals.kcal - tg.kcal)} over` : `${fmt(tg.kcal - day.totals.kcal)} left`}</div>}</div></NeonRing>
            <div className="flex-1 w-full space-y-3">
              {([['protein', '#38bdf8', 'bolt'], ['carbs', '#a855f7', 'flame'], ['fat', '#e879f9', 'drop'], ['fiber', '#5eead4', 'heart']] as const).map(([k, c, i]) =>
                <div key={k}><StatBar label={`${t(k)} · ${fmt(day.totals[k])} / ${fmt((tg as any)?.[k])} g`} value={Math.min(100, Math.round(day.totals[k] / ((tg as any)?.[k] || 1) * 100))} color={c} icon={i} /></div>)}
            </div>
          </div>
          {tg?.kcal && day.totals.kcal > tg.kcal * 1.15 && <p className="mt-3 text-[13px] text-amber-200">Above target today — no problem. One day changes nothing; just get back on track tomorrow. Never compensate by skipping meals.</p>}
        </Holo>
        <Holo title={t('water')}>
          <div className="flex items-center gap-4"><NeonRing value={day.waterMl} max={tg?.water_ml ?? 2000} size={110} stroke={9} color="#38bdf8"><div><div className="display text-lg text-sky-50">{(day.waterMl / 1000).toFixed(1)}</div><div className="label">/ {((tg?.water_ml ?? 2000) / 1000).toFixed(1)} L</div></div></NeonRing>
            <div className="grid grid-cols-2 gap-2 flex-1">{[250, 330, 500, 750].map(ml => <button key={ml} className="ghost-btn !px-2" disabled={busy} onClick={() => water(ml)}>+{ml} ml</button>)}</div></div>
        </Holo>
      </div>
      <div className="grid md:grid-cols-2 gap-5">{MEALS.map(m => { const items = day.foods.filter(f => f.meal === m); const sum = items.reduce((a, f) => a + Number(f.kcal), 0);
        return <Holo key={m} title={t(m)} right={<span className="display text-xs text-sky-200">{fmt(sum)} kcal</span>}>
          {!items.length && <p className="text-sm text-slate-500 py-1">Nothing logged.</p>}
          {items.map(f => <div key={f.id} className="flex items-center gap-3 py-2 border-b border-sky-400/10 last:border-0">
            <span className="text-xl">{f.recipe_id ? '📖' : f.food_id ? foodEmoji(getFood(f.food_id)) : f.estimate ? '🤖' : '✍️'}</span>
            <div className="flex-1 min-w-0"><div className="text-slate-100 truncate" dir="auto">{f.name}{f.grams ? <span className="text-slate-500"> · {fmt(f.grams)} g</span> : f.servings ? <span className="text-slate-500"> · ×{f.servings}</span> : null}</div>
              <div className="text-[11px] text-slate-500">{fmt(f.protein)} g P · {fmt(f.carbs)} g C · {fmt(f.fat)} g F {f.estimate && <span className="ml-1 px-1.5 rounded bg-amber-400/15 text-amber-200">{SRC_LABEL[f.source] ?? t('estimate')}</span>}</div></div>
            <span className="display text-sm text-sky-100">{fmt(f.kcal)}</span>
            <button className="text-slate-500 hover:text-rose-300 px-1" aria-label={t('delete')} disabled={busy} onClick={() => run(() => act((sb, u) => E.deleteFood(sb, u, f.id)))}>✕</button></div>)}
          <button className="ghost-btn w-full mt-2" onClick={() => setAdd(m)}><Icon n="plus" s={16} />{t('add')}</button>
        </Holo>; })}</div>
      <Holo title="Smart logging">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <button className="rounded-xl border border-sky-400/20 bg-void-950/40 p-3 text-left hover:shadow-glow" onClick={() => setAdd('lunch')}><Icon n="search" className="text-sky-300" /><div className="font-ui font-bold mt-1">Search database</div><div className="text-slate-500 text-[12px]">Verified USDA values</div></button>
          <Link to="/system" className="rounded-xl border border-violet-400/25 bg-void-950/40 p-3 hover:shadow-glow-violet"><Icon n="system" className="text-violet-300" /><div className="font-ui font-bold mt-1">Tell THE SYSTEM</div><div className="text-slate-500 text-[12px]">“klit tajine w khobz” — logged for you</div></Link>
          <Link to="/system" className="rounded-xl border border-violet-400/25 bg-void-950/40 p-3 hover:shadow-glow-violet"><Icon n="camera" className="text-violet-300" /><div className="font-ui font-bold mt-1">Photo of your plate</div><div className="text-slate-500 text-[12px]">AI estimate, clearly labelled</div></Link>
        </div>
      </Holo>
    </>}
    {add && <AddFood meal={add} date={date} onClose={() => setAdd(null)} />}
  </div>;
}
