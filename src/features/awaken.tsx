// Awakening (onboarding) and the same form reused for editing the profile.
import { useMemo, useState } from 'react';
import { Holo, Icon, ShadowEmblem, RankBadge } from '../design';
import { EQUIPMENT } from '../data/exercises';
import { CUISINES } from '../core/meals';
import { targetsFor, saveProfile, type Profile } from '../core/engine';
import { supabase } from '../lib/supabase';
import { isoDate } from '../lib/nutrition';
import { useHunter } from '../app/store';
import { Backdrop } from '../app/Layout';
import { Field, Multi, Num, Seg } from '../app/ui';
import { LANGS, setLang, t, type Lang } from '../app/i18n';

export type ProfileDraft = Omit<Profile, 'id' | 'onboarded'>;
export const EMPTY: ProfileDraft = { name: '', age: 25, sex: 'male', height_cm: 175, weight_kg: 75, target_weight_kg: null, goal: 'lose', activity: 'light',
  experience: 'beginner', location: 'home', equipment: [], training_days: 3, session_minutes: 30, limitations: '', diet: 'none', allergies: [], budget: 'medium',
  cuisines: ['moroccan'], language: 'dar', title: 'Shadow Initiate' };
const L = (x: { en: string; fr: string; ar: string }) => { const l = document.documentElement.lang; return l.startsWith('fr') ? x.fr : l === 'ar' ? x.ar : x.en; };
const CUISINE_LABEL: Record<string, string> = { moroccan: 'Moroccan 🇲🇦', mediterranean: 'Mediterranean', middle_eastern: 'Middle Eastern', french: 'French', italian: 'Italian', spanish: 'Spanish', turkish: 'Turkish', indian: 'Indian', asian: 'Asian', mexican: 'Mexican', american: 'American' };

export function ProfileFields({ p, set, step }: { p: ProfileDraft; set: (x: Partial<ProfileDraft>) => void; step: number | 'all' }) {
  const show = (n: number) => step === 'all' || step === n;
  return <div className="space-y-4">
    {show(0) && <>
      <Field label="Hunter name"><input className="field" maxLength={40} value={p.name} onChange={e => set({ name: e.target.value })} placeholder="Zakaria" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Age"><Num value={p.age} min={13} max={100} onChange={v => set({ age: Number(v) || 0 })} /></Field>
        <Field label="Sex"><Seg value={p.sex} onChange={v => set({ sex: v })} options={[{ id: 'male', label: '♂ Male' }, { id: 'female', label: '♀ Female' }, { id: 'other', label: 'Other' }]} wrap /></Field></div>
      <Field label={t('language')}><Seg value={p.language as Lang} options={LANGS} onChange={v => { set({ language: v }); setLang(v); }} wrap /></Field>
    </>}
    {show(1) && <>
      <div className="grid grid-cols-3 gap-3"><Field label="Height (cm)"><Num value={p.height_cm} min={120} max={230} onChange={v => set({ height_cm: Number(v) || 0 })} /></Field>
        <Field label="Weight (kg)"><Num value={p.weight_kg} min={30} max={300} step={0.1} onChange={v => set({ weight_kg: Number(v) || 0 })} /></Field>
        <Field label="Target (kg)"><Num value={p.target_weight_kg ?? ''} min={30} max={300} step={0.1} onChange={v => set({ target_weight_kg: v === '' ? null : v })} /></Field></div>
      <Field label="Main goal"><Seg wrap value={p.goal} onChange={v => set({ goal: v })} options={[{ id: 'lose', label: '🔥 Lose fat' }, { id: 'muscle', label: '💪 Build muscle' }, { id: 'maintain', label: '⚖️ Maintain' }, { id: 'healthy', label: '🌱 Get healthy' }]} /></Field>
      <Field label="Daily activity (outside training)"><Seg wrap value={p.activity} onChange={v => set({ activity: v })} options={[{ id: 'sedentary', label: 'Desk / sitting' }, { id: 'light', label: 'Light' }, { id: 'moderate', label: 'Moderate' }, { id: 'active', label: 'Active job' }, { id: 'very_active', label: 'Very active' }]} /></Field>
    </>}
    {show(2) && <>
      <Field label="Experience"><Seg wrap value={p.experience} onChange={v => set({ experience: v })} options={[{ id: 'beginner', label: 'Beginner' }, { id: 'intermediate', label: 'Intermediate' }, { id: 'advanced', label: 'Advanced' }]} /></Field>
      <Field label="Where do you train?"><Seg wrap value={p.location} onChange={v => set({ location: v })} options={[{ id: 'home', label: '🏠 Home' }, { id: 'gym', label: '🏋️ Gym' }, { id: 'outdoor', label: '🌳 Outdoor' }]} /></Field>
      {p.location !== 'gym' && <Field label="Equipment you have" hint="Nothing selected = bodyweight only."><Multi value={p.equipment} onChange={v => set({ equipment: v })} options={EQUIPMENT.map(e => ({ id: e.id, label: L(e.label) }))} /></Field>}
      <div className="grid grid-cols-2 gap-3"><Field label="Training days / week"><Seg value={String(p.training_days)} onChange={v => set({ training_days: Number(v) })} options={['2', '3', '4', '5', '6'].map(x => ({ id: x, label: x }))} /></Field>
        <Field label="Minutes / session"><Seg value={String(p.session_minutes)} onChange={v => set({ session_minutes: Number(v) })} options={['20', '30', '45', '60'].map(x => ({ id: x, label: x }))} /></Field></div>
      <Field label="Injuries or limitations (optional)" hint="e.g. knee pain, back pain — the plan avoids risky moves."><input className="field" maxLength={300} value={p.limitations ?? ''} onChange={e => set({ limitations: e.target.value })} /></Field>
    </>}
    {show(3) && <>
      <Field label="Diet"><Seg wrap value={p.diet} onChange={v => set({ diet: v })} options={[{ id: 'none', label: 'No restriction' }, { id: 'halal', label: 'Halal' }, { id: 'vegetarian', label: 'Vegetarian' }, { id: 'pescatarian', label: 'Pescatarian' }, { id: 'vegan', label: 'Vegan' }]} /></Field>
      <Field label="Allergies / intolerances"><Multi value={p.allergies} onChange={v => set({ allergies: v })} options={['gluten', 'lactose', 'eggs', 'nuts', 'peanuts', 'fish', 'shellfish', 'sesame', 'soy'].map(a => ({ id: a, label: a }))} /></Field>
      <Field label="Food budget"><Seg wrap value={p.budget} onChange={v => set({ budget: v })} options={[{ id: 'low', label: '💰 Low' }, { id: 'medium', label: '💰💰 Medium' }, { id: 'high', label: '💰💰💰 High' }]} /></Field>
      <Field label="Favourite cuisines"><Multi value={p.cuisines} onChange={v => set({ cuisines: v })} options={CUISINES.map(c => ({ id: c, label: CUISINE_LABEL[c] }))} /></Field>
    </>}
  </div>;
}

export function TargetsPreview({ p }: { p: ProfileDraft }) {
  const tg = useMemo(() => targetsFor(p), [p]);
  return <div className="space-y-3">
    {tg.kcal ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{[['Calories', `${tg.kcal}`, 'kcal'], ['Protein', `${tg.protein}`, 'g'], ['Carbs', `${tg.carbs}`, 'g'], ['Water', `${(tg.water_ml / 1000).toFixed(1)}`, 'L']].map(([a, b, c]) =>
      <div key={a} className="rounded-xl border border-sky-400/20 bg-void-950/50 p-3 text-center"><div className="label">{a}</div><div className="display text-xl text-sky-50 glow-text">{b}</div><div className="text-[11px] text-slate-500">{c}</div></div>)}</div>
      : <p className="text-sm text-amber-200">Under 18: no calorie target is set — SHADOW FIT focuses on training, balanced meals and habits.</p>}
    <ul className="text-[13px] text-slate-400 space-y-1">
      {tg.bmr && <li>› BMR {tg.bmr} kcal · daily burn ≈ {tg.tdee} kcal (Mifflin-St Jeor).</li>}
      {tg.deficit > 0 && <li>› Moderate deficit of {tg.deficit} kcal — never an extreme diet.</li>}
      {tg.floorApplied && <li className="text-amber-200">› Safety floor applied: your target never goes below a safe minimum.</li>}
      {tg.restrictions.filter(r => r !== 'minor').length > 0 && <li className="text-amber-200">› No weight-loss deficit for your situation ({tg.restrictions.join(', ')}). Talk to a doctor for a personal plan.</li>}
      <li>› Targets only change from your weekly trend — never from one unusual day.</li>
    </ul>
  </div>;
}

const STEPS = ['Identity', 'Body', 'Training', 'Nutrition', 'Awakening'];
export function Awaken() {
  const { uid, refresh, session } = useHunter();
  const [p, setP] = useState<ProfileDraft>({ ...EMPTY, language: (document.documentElement.lang === 'ar' ? 'ar' : localStorage.getItem('sf_lang') as Lang) || 'dar' });
  const [step, setStep] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (x: Partial<ProfileDraft>) => setP(v => ({ ...v, ...x }));
  const valid = [p.name.trim().length > 0 && p.age >= 13 && p.age <= 100, p.height_cm >= 120 && p.height_cm <= 230 && p.weight_kg >= 30 && p.weight_kg <= 300, true, true, true][step];
  const finish = async () => {
    if (!uid) return; setBusy(true); setErr('');
    try { await saveProfile(supabase, uid, { ...p, name: p.name.trim(), limitations: p.limitations?.trim() || null }, isoDate()); await refresh(); }
    catch (e: any) { setErr(/relation .* does not exist|schema cache/i.test(e?.message ?? '') ? 'The SHADOW FIT database tables are not installed yet (run supabase/shadow_fit.sql in Supabase).' : e?.message ?? String(e)); }
    finally { setBusy(false); }
  };
  return <div className="relative min-h-screen font-body text-slate-200 px-4 py-8">
    <Backdrop />
    <div className="relative z-10 mx-auto max-w-xl">
      <div className="text-center mb-5"><ShadowEmblem s={56} className="mx-auto" /><div className="label text-neon-cyan mt-2 animate-flicker">[ System · Player registration ]</div>
        <h1 className="display font-black text-2xl text-sky-50 glow-text mt-1">AWAKENING</h1>
        <div className="flex justify-center gap-1.5 mt-3">{STEPS.map((s, i) => <span key={s} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-8 bg-gradient-to-r from-sky-400 to-violet-500 shadow-glow' : 'w-4 bg-slate-700'}`} />)}</div></div>
      <Holo violet scan title={`${step + 1}/5 · ${STEPS[step]}`}>
        {step < 4 ? <ProfileFields p={p} set={set} step={step} /> : <div className="space-y-4">
          <div className="flex items-center gap-4"><RankBadge rank="E" s={70} /><div><div className="display text-xl text-sky-50">{p.name.toUpperCase()}</div><div className="text-sm text-violet-300 font-ui font-bold tracking-widest uppercase">Rank E · Level 1 · Shadow Initiate</div></div></div>
          <TargetsPreview p={p} />
          <p className="text-sm text-slate-300">THE SYSTEM will build your {p.training_days}-day training plan, daily quests and meal targets. Everything adapts to your real performance.</p>
          {err && <p className="text-sm text-rose-300">{err}</p>}
        </div>}
        <div className="flex gap-3 mt-6">
          {step > 0 && <button className="ghost-btn" onClick={() => setStep(step - 1)}><Icon n="back" s={16} /></button>}
          {step < 4 ? <button className="neon-btn flex-1" disabled={!valid} onClick={() => setStep(step + 1)}>Next <Icon n="next" s={16} /></button>
            : <button className="neon-btn flex-1" disabled={busy} onClick={finish}>{busy ? '…' : 'ARISE'}</button>}
        </div>
      </Holo>
      <button className="block mx-auto mt-4 text-xs text-slate-500 hover:text-slate-300" onClick={() => supabase.auth.signOut()}>{session?.user.email} · {t('signOut')}</button>
    </div>
  </div>;
}
