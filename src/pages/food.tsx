import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { addDays, isoDate, sumNutrients } from '../lib/nutrition';
import { foodName, getFood, isHighAddedSugar, type Food } from '../lib/foods';
import { AddFoodFlow, AddFoodSheet, FoodSearch, MEALS, type MealSlot } from '../components/FoodPicker';
import { Confirm, Empty, Icon, MacroBars, Modal, NutrientTable, Page, errMsg, useFmt } from '../components/ui';

export function FoodHub() {
  const { t } = useI18n();
  const tiles = [
    { to: '/food/database', i: 'search', c: 't-green', k: 'database' }, { to: '/food/diary', i: 'book', c: 't-peach', k: 'diary' },
    { to: '/food/fridge', i: 'fridge', c: 't-sky', k: 'fridge' }, { to: '/food/recipes', i: 'pot', c: 't-butter', k: 'recipes' },
    { to: '/food/moroccan', i: 'star', c: 't-rose', k: 'moroccan' }, { to: '/food/planner', i: 'calendar', c: 't-lav', k: 'planner' },
    { to: '/food/sugar', i: 'candy', c: 't-peach', k: 'sugar' }, { to: '/food/shopping', i: 'cart', c: 't-green', k: 'shopping' },
    { to: '/food/budget', i: 'wallet', c: 't-beige', k: 'budget' }, { to: '/food/custom', i: 'barcode', c: 't-sky', k: 'custom' },
  ];
  return <Page title={t('nav.food')}><div className="grid2">{tiles.map(x => <Link key={x.to} to={x.to} className={`tile ${x.c}`}>
    <span className="ti"><Icon n={x.i} /></span><b>{t('nav.' + x.k)}</b><span>{t('hub.' + x.k)}</span></Link>)}</div></Page>;
}

export function FoodDetail({ food, onClose }: { food: Food | null; onClose: () => void }) {
  const { t, lang } = useI18n(); const nav = useNavigate(); const [adding, setAdding] = useState(false);
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
    <div className="row"><button className="btn grow" onClick={() => nav(`/food/custom?from=${encodeURIComponent(food.id)}`)}>{t('food.correct')}</button>
      <button className="btn primary grow" onClick={() => setAdding(true)}>{t('diary.add')}</button></div>
  </Modal>;
}

export function FoodDatabase() {
  const { t } = useI18n(); const [sel, setSel] = useState<Food | null>(null);
  return <Page title={t('nav.database')} back actions={<Link className="btn sm soft" to="/food/custom">{t('custom.new')}</Link>}>
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

// ---------------- Custom foods, corrections and barcode lookup ----------------
const OFF_ENABLED = (import.meta.env.VITE_ENABLE_OPENFOODFACTS ?? 'true') !== 'false';
const blank = { name: '', brand: '', barcode: '', category: 'packaged', kcal: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', added_sugar: '', sodium: '', serving_g: '', serving_label: '', source: 'manual' };

export async function lookupOpenFoodFacts(code: string) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity,serving_size`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json(); if (j.status !== 1 || !j.product) return null;
  const n = j.product.nutriments || {}; const v = (k: string) => (n[k] === undefined || n[k] === null || n[k] === '' ? '' : String(Math.round(Number(n[k]) * 10) / 10));
  return { name: j.product.product_name || '', brand: j.product.brands || '', kcal: v('energy-kcal_100g'), protein: v('proteins_100g'), carbs: v('carbohydrates_100g'),
    fat: v('fat_100g'), fiber: v('fiber_100g'), sugar: v('sugars_100g'), added_sugar: v('added-sugars_100g'), sodium: n['sodium_100g'] !== undefined ? String(Math.round(Number(n['sodium_100g']) * 1000)) : '',
    serving_g: j.product.serving_quantity ? String(j.product.serving_quantity) : '', serving_label: j.product.serving_size || '' };
}

export function CustomFoods() {
  const { t, lang } = useI18n(); const { data, insert, update, remove, toast } = useApp(); const fmt = useFmt();
  const [params] = useSearchParams();
  const [form, setForm] = useState<any>(blank); const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [scan, setScan] = useState(false);
  useEffect(() => {
    const from = params.get('from'); if (!from) return; const f = getFood(from); if (!f) return;
    const s = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
    setForm({ ...blank, name: `${foodName(f, lang)} (${t('custom.corrected')})`, category: f.category, kcal: s(f.per100g.kcal), protein: s(f.per100g.protein), carbs: s(f.per100g.carbs),
      fat: s(f.per100g.fat), fiber: s(f.per100g.fiber), sugar: s(f.per100g.sugar), added_sugar: s(f.per100g.addedSugar), sodium: s(f.per100g.sodium) });
  }, [params]); // eslint-disable-line
  const setF = (k: string, v: string) => setForm((x: any) => ({ ...x, [k]: v }));
  const lookup = async (code = form.barcode) => {
    setErr(''); setMsg(''); if (!/^\d{6,14}$/.test(code)) return setErr(t('custom.badBarcode'));
    const existing = data.custom_foods.find(c => c.barcode === code); if (existing) { setMsg(t('custom.alreadySaved')); return; }
    setBusy(true);
    try { const r = await lookupOpenFoodFacts(code); if (!r) setMsg(t('custom.notFound')); else { setForm((x: any) => ({ ...x, ...r, barcode: code, source: 'openfoodfacts' })); setMsg(t('custom.found')); } }
    catch { setErr(t('custom.lookupFailed')); } finally { setBusy(false); }
  };
  const save = async () => {
    setErr('');
    const nOrNull = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));
    const row = { name: String(form.name).trim(), brand: form.brand || null, barcode: form.barcode || null, category: form.category, source: form.source,
      kcal: nOrNull(form.kcal), protein: nOrNull(form.protein), carbs: nOrNull(form.carbs), fat: nOrNull(form.fat), fiber: nOrNull(form.fiber),
      sugar: nOrNull(form.sugar), added_sugar: nOrNull(form.added_sugar), sodium: nOrNull(form.sodium), serving_g: nOrNull(form.serving_g), serving_label: form.serving_label || null };
    if (row.kcal === null) return setErr(t('custom.needKcal'));
    try { if (editId) await update('custom_foods', editId, row); else await insert('custom_foods', row); toast(t('common.saved'), 'ok'); setForm(blank); setEditId(null); }
    catch (e) { setErr(errMsg(e)); }
  };
  const fields: [string, string][] = [['kcal', 'n.kcal'], ['protein', 'n.protein'], ['carbs', 'n.carbs'], ['fat', 'n.fat'], ['fiber', 'n.fiber'], ['sugar', 'n.sugar'], ['added_sugar', 'n.addedSugar'], ['sodium', 'n.sodiumMg']];
  return <Page title={t('nav.custom')} back>
    <section className="card stack">
      <h2>{editId ? t('common.edit') : t('custom.new')}</h2>
      {OFF_ENABLED ? <div className="stack tight"><label className="field">{t('custom.barcode')}<div className="row"><input inputMode="numeric" value={form.barcode} onChange={e => setF('barcode', e.target.value.replace(/\D/g, ''))} />
        <button className="btn" disabled={busy} onClick={() => lookup()}>{t('custom.lookup')}</button>
        <button className="iconbtn" aria-label={t('custom.scan')} onClick={() => setScan(true)}><Icon n="camera" /></button></div></label>
        <p className="tiny muted">{t('custom.offNote')}</p></div> : <p className="tiny muted">{t('custom.offDisabled')}</p>}
      {msg && <p className="ok">{msg}</p>}
      <label className="field">{t('custom.name')}<input value={form.name} onChange={e => setF('name', e.target.value)} /></label>
      <div className="grid2"><label className="field">{t('custom.brand')}<input value={form.brand} onChange={e => setF('brand', e.target.value)} /></label>
        <label className="field">{t('custom.category')}<select value={form.category} onChange={e => setF('category', e.target.value)}>{['packaged', 'drinks', 'bread', 'cereals', 'dairy', 'fruits', 'vegetables', 'meat', 'chicken', 'fish', 'eggs', 'legumes', 'nuts', 'oils', 'custom'].map(c => <option key={c} value={c}>{t('cat.' + c)}</option>)}</select></label></div>
      <p className="small muted">{t('custom.per100')}</p>
      <div className="grid2">{fields.map(([k, l]) => <label className="field" key={k}>{t(l)}<input type="number" inputMode="decimal" step="0.1" min={0} value={form[k]} placeholder={t('common.unknown')} onChange={e => setF(k, e.target.value)} /></label>)}</div>
      <div className="grid2"><label className="field">{t('custom.servingG')}<input type="number" value={form.serving_g} onChange={e => setF('serving_g', e.target.value)} /></label>
        <label className="field">{t('custom.servingLabel')}<input value={form.serving_label} onChange={e => setF('serving_label', e.target.value)} /></label></div>
      <p className="tiny muted">{t('custom.unknownNote')}</p>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">{editId && <button className="btn grow" onClick={() => { setForm(blank); setEditId(null); }}>{t('common.cancel')}</button>}<button className="btn primary grow" onClick={save}>{t('common.save')}</button></div>
    </section>
    <section className="card"><h2>{t('custom.mine')}</h2>{data.custom_foods.length ? <div className="list">{data.custom_foods.map(c => <div className="li" key={c.id}>
      <div className="grow"><b>{c.name}</b><div className="tiny muted">{c.brand ? `${c.brand} · ` : ''}{fmt(c.kcal, 'kcal')} / 100 g · {c.source === 'openfoodfacts' ? 'Open Food Facts' : t('custom.manual')}{c.barcode ? ` · ${c.barcode}` : ''}</div></div>
      <button className="iconbtn" aria-label={t('common.edit')} onClick={() => { setEditId(c.id); setForm(Object.fromEntries(Object.keys(blank).map(k => [k, c[k] ?? '']))); window.scrollTo(0, 0); }}><Icon n="edit" s={16} /></button>
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('custom_foods', c.id)}><Icon n="trash" s={16} /></button></div>)}</div> : <Empty>{t('custom.none')}</Empty>}</section>
    {scan && <Scanner onClose={() => setScan(false)} onCode={c => { setScan(false); setF('barcode', c); lookup(c); }} />}
  </Page>;
}

/** Camera barcode scanning with the browser's built-in BarcodeDetector (standard decoding, no image analysis service). */
function Scanner({ onClose, onCode }: { onClose: () => void; onCode: (c: string) => void }) {
  const { t } = useI18n(); const video = useRef<HTMLVideoElement>(null); const [err, setErr] = useState('');
  useEffect(() => {
    const BD = (window as any).BarcodeDetector;
    if (!BD) { setErr(t('custom.scanUnsupported')); return; }
    let stream: MediaStream | null = null; let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return; video.current.srcObject = stream; await video.current.play();
        const det = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const tick = async () => {
          if (stop || !video.current) return;
          try { const r = await det.detect(video.current); if (r[0]?.rawValue) { onCode(r[0].rawValue); return; } } catch { /* keep trying */ }
          setTimeout(tick, 300);
        }; tick();
      } catch { setErr(t('custom.cameraDenied')); }
    })();
    return () => { stop = true; stream?.getTracks().forEach(tr => tr.stop()); };
  }, []); // eslint-disable-line
  return <Modal open onClose={onClose} title={t('custom.scan')}>{err ? <p className="err">{err}</p> : <video ref={video} className="scan" muted playsInline />}</Modal>;
}
