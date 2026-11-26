import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Holo, Icon, NeonLine, NeonRing, Radar, RankBadge, RANK_COLORS, StatBar, XPBar } from '../design';
import { ExerciseFigure } from '../design/ExerciseFigure';
import { PREVIEW } from '../app/preview';
import { QuestRow } from './home';
import { RECIPES, recipeName } from '../data/recipes';
import { recipeInfo } from '../lib/recipes';
import { recipeEmoji } from '../lib/emoji';

// ================= QUESTS =================
export function Quests() {
  const { quests, weekly, achievements, hunter } = PREVIEW; const done = quests.filter(q => q.done).length; const xpLeft = quests.filter(q => !q.done).reduce((a, q) => a + q.xp, 0);
  return <div className="space-y-5 animate-rise">
    <div className="text-center pt-2"><div className="label text-neon-cyan animate-flicker">[ Quest info ]</div><h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text mt-1">DAILY QUEST</h1>
      <p className="text-slate-400 text-sm mt-1">Training to become a stronger hunter has arrived.</p></div>
    <Holo scan className="max-w-2xl mx-auto w-full" title="Goals" right={<span className="display text-xs text-sky-200">{done}/{quests.length} · {xpLeft} XP left</span>}>
      {quests.map(q => <QuestRow key={q.id} q={q} />)}
      <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/[.07] px-4 py-3 text-sm"><span className="label !text-violet-300">Reward</span> · Complete all quests: <b className="text-violet-200">+60 XP bonus</b> and your streak continues ({hunter.streak} 🔥).
        <div className="text-[12px] text-slate-400 mt-1">No penalty for missing a quest — rest and recovery are part of growing stronger.</div></div>
    </Holo>
    <div className="grid lg:grid-cols-2 gap-5">
      <Holo violet title="Weekly challenges">{weekly.map(w => <div key={w.title} className="py-3 border-b border-violet-400/10 last:border-0"><div className="flex justify-between font-ui font-bold text-slate-100"><span>{w.title}</span><span className="display text-[11px] text-violet-300">+{w.xp} XP</span></div>
        <div className="mt-2"><XPBar value={w.progress} max={w.target} sub={`${w.progress.toLocaleString()} / ${w.target.toLocaleString()}`} /></div></div>)}</Holo>
      <Holo title="Achievements"><div className="grid grid-cols-3 gap-3">{achievements.map(a => <div key={a.name} className={`text-center rounded-xl border p-3 ${a.got ? 'border-sky-300/40 bg-sky-400/[.07] shadow-glow' : 'border-slate-700 opacity-40 grayscale'}`}>
        <div className={`mx-auto grid place-items-center w-11 h-11 rounded-full ${a.got ? 'bg-gradient-to-br from-sky-400/30 to-violet-500/30 text-sky-100' : 'bg-slate-800 text-slate-500'}`}><Icon n={a.icon} s={20} /></div>
        <div className="mt-2 text-[11px] font-ui font-bold tracking-wider uppercase">{a.name}</div></div>)}</div></Holo>
    </div>
  </div>;
}

// ================= WORKOUT =================
export function Workout() {
  const w = PREVIEW.workout; const [open, setOpen] = useState<string | null>(w.exercises[0].id);
  return <div className="space-y-5 animate-rise">
    <Holo violet scan className="!p-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4"><div><div className="label text-neon-cyan">Dungeon · {w.day}</div><h1 className="display font-black text-3xl text-sky-50 glow-text">{w.name}</h1>
        <div className="text-slate-400 text-sm mt-1">{w.minutes} min · {w.exercises.length} exercises · Home · No equipment</div></div>
        <button className="neon-btn sm:ml-auto"><Icon n="play" s={18} />Start session</button></div>
      <div className="mt-5 grid grid-cols-7 gap-1.5">{w.week.map(d => <div key={d.d} className={`rounded-lg border text-center py-2 ${d.today ? 'border-sky-300 bg-sky-400/15 shadow-glow' : d.done ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-slate-700/70'}`}>
        <div className="label !text-[10px]">{d.d}</div><div className={`font-ui font-bold text-xs mt-0.5 ${d.t === 'Rest' ? 'text-slate-500' : 'text-slate-100'}`}>{d.done ? '✔' : d.t}</div></div>)}</div>
    </Holo>
    <div className="grid lg:grid-cols-2 gap-4">{w.exercises.map((e, i) => <Holo key={e.id} className="!p-4">
      <button className="w-full text-left flex items-center gap-4" onClick={() => setOpen(open === e.id ? null : e.id)}>
        <div className="shrink-0 rounded-xl bg-void-950/60 border border-sky-400/20"><ExerciseFigure id={e.id} size={96} /></div>
        <div className="flex-1 min-w-0"><div className="label">#{i + 1} · {e.muscles}</div><div className="display text-lg text-sky-50 mt-0.5">{e.name}</div>
          <div className="flex flex-wrap gap-2 mt-2 text-[12px]"><span className="chip !py-1">{e.sets} × {e.reps}</span><span className="chip !py-1"><Icon n="clock" s={13} />{e.rest}s rest</span><span className="chip !py-1">{'◆'.repeat(e.diff)}{'◇'.repeat(3 - e.diff)}</span></div></div>
      </button>
      {open === e.id && <div className="mt-4 animate-rise">
        <div className="rounded-lg border border-sky-400/20 bg-sky-400/[.05] px-3 py-2 text-[13px] text-sky-100"><span className="label !text-neon-cyan">Evolving hunter</span> · {e.trend}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">{Array.from({ length: e.sets }, (_, s) => <div key={s} className="rounded-lg border border-slate-700 p-2 text-center"><div className="label">Set {s + 1}</div>
          <input className="field !min-h-9 !py-1 text-center mt-1" defaultValue={e.reps.replace(/\D/g, '')} aria-label={`Set ${s + 1} reps`} /></div>)}</div>
        <button className="ghost-btn w-full mt-3"><Icon n="check" s={16} />Complete exercise</button>
      </div>}
    </Holo>)}</div>
    <Holo title="Recovery protocol"><p className="text-sm text-slate-300">Tomorrow is a <b className="text-sky-200">rest day</b>. Muscles grow when you recover: sleep 7–9 h, walk lightly, drink water. Difficulty only increases after 2 strong sessions with good form and recovery.</p></Holo>
  </div>;
}

// ================= NUTRITION =================
export function Nutrition() {
  const { today, meals } = PREVIEW;
  return <div className="space-y-5 animate-rise">
    <div className="grid lg:grid-cols-3 gap-5">
      <Holo violet scan className="lg:col-span-1 !p-5" title="Energy core">
        <div className="flex justify-center"><NeonRing value={today.kcal} max={today.target} size={190} stroke={12}><div><div className="display text-4xl text-sky-50 glow-text">{today.target - today.kcal}</div><div className="label">kcal remaining</div><div className="text-xs text-slate-400 mt-1">{today.kcal} eaten · {today.target} target</div></div></NeonRing></div>
        <div className="mt-5 space-y-3"><StatBar label={`Protein ${today.protein}/${today.proteinTarget} g`} value={Math.round(today.protein / today.proteinTarget * 100)} color="#38bdf8" icon="bolt" />
          <StatBar label={`Carbs ${today.carbs}/${today.carbsTarget} g`} value={Math.round(today.carbs / today.carbsTarget * 100)} color="#a855f7" icon="flame" />
          <StatBar label={`Fat ${today.fat}/${today.fatTarget} g`} value={Math.round(today.fat / today.fatTarget * 100)} color="#e879f9" icon="drop" /></div>
      </Holo>
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">{[{ i: 'search', l: 'Search food' }, { i: 'camera', l: 'Photo' }, { i: 'system', l: 'Tell the System' }].map(a => <button key={a.l} className="holo !p-3 flex flex-col items-center gap-2 hover:shadow-glow transition"><div className="corners"><i /><i /><i /><i /></div><Icon n={a.i} s={22} className="text-sky-300" /><span className="label !text-slate-200">{a.l}</span></button>)}</div>
        {meals.map(m => { const total = m.items.reduce((a, x) => a + x.kcal, 0);
          return <Holo key={m.meal} title={m.meal} right={<span className="display text-sm text-sky-100">{total} kcal</span>}>
            {m.items.length ? m.items.map(x => <div key={x.name} className="flex items-center gap-3 py-2 border-b border-sky-400/10 last:border-0"><span className="text-xl">{x.name.includes('egg') ? '🥚' : x.name.includes('Sardine') ? '🐟' : x.name.includes('tagine') ? '🥘' : x.name.includes('salad') ? '🥗' : '🥣'}</span>
              <div className="flex-1 min-w-0"><div className="text-slate-100 truncate">{x.name}</div><div className="text-[11px] text-slate-500">{x.p} g protein{x.estimate && <span className="ml-2 text-amber-300">· AI estimate</span>}</div></div><span className="display text-sm text-slate-200">{x.kcal}</span></div>)
              : <div className="flex items-center justify-between text-sm text-slate-400"><span>Not logged yet. Remaining budget fits ≈ 700 kcal.</span><Link to="/library" className="ghost-btn !min-h-9">Ideas</Link></div>}
          </Holo>; })}
      </div>
    </div>
  </div>;
}

// ================= FOOD LIBRARY =================
const CATS = ['All', 'Under 300 kcal', 'Under 500 kcal', 'High protein', 'Budget', 'Quick', 'Vegetarian', 'Breakfast', 'Dinner'];
const ART = ['from-sky-500/40 to-violet-700/40', 'from-violet-500/40 to-fuchsia-700/40', 'from-cyan-500/40 to-sky-800/40', 'from-indigo-500/40 to-violet-800/40'];
export function Library() {
  const [cat, setCat] = useState('All');
  const list = useMemo(() => RECIPES.map(r => recipeInfo(r)).filter(i => { const k = i.perServing.totals.kcal;
    return cat === 'All' || (cat === 'Under 300 kcal' && k < 300) || (cat === 'Under 500 kcal' && k < 500) || (cat === 'High protein' && i.highProtein) || (cat === 'Budget' && i.recipe.budget) || (cat === 'Quick' && i.quick) || (cat === 'Vegetarian' && i.vegetarian) || (cat === 'Breakfast' && i.recipe.meals.includes('breakfast')) || (cat === 'Dinner' && i.recipe.meals.includes('dinner')); }).slice(0, 12), [cat]);
  return <div className="space-y-5 animate-rise">
    <div><div className="label text-neon-cyan">World cuisine · prioritised for Morocco</div><h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">FOOD LIBRARY</h1></div>
    <div className="holo !p-2 flex items-center gap-2"><Icon n="search" s={18} className="ml-2 text-slate-400" /><input className="field !border-0 !bg-transparent" placeholder="Search 80+ recipes — tagine, ramen, tacos…" /></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{CATS.map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map((i, k) => <div key={i.recipe.id} className="holo !p-0 group hover:shadow-glow transition">
      <div className={`relative h-36 bg-gradient-to-br ${ART[k % ART.length]} grid place-items-center overflow-hidden`}><span className="text-6xl drop-shadow-[0_0_18px_rgba(56,189,248,.6)] group-hover:scale-110 transition">{recipeEmoji(i.recipe)}</span>
        <span className="absolute top-2 left-2 chip !py-0.5 !text-[11px]">{i.recipe.moroccan ? '🇲🇦 Moroccan' : '🌍 International'}</span>
        <button className="absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-full bg-black/40 text-slate-200" aria-label="Favorite"><Icon n="star" s={16} /></button></div>
      <div className="p-4"><div className="font-ui font-bold text-lg text-slate-50 leading-tight">{recipeName(i.recipe, 'en')}</div>
        <div className="grid grid-cols-4 gap-1 mt-3 text-center">{[['kcal', i.perServing.totals.kcal], ['prot', `${Math.round(i.perServing.totals.protein)}g`], ['carb', `${Math.round(i.perServing.totals.carbs)}g`], ['fat', `${Math.round(i.perServing.totals.fat)}g`]].map(([l, v]) =>
          <div key={l} className="rounded-md bg-void-950/50 border border-sky-400/10 py-1"><div className="display text-sm text-sky-100">{v}</div><div className="label !text-[9px]">{l}</div></div>)}</div>
        <div className="flex items-center justify-between mt-3 text-[12px] text-slate-400"><span><Icon n="clock" s={13} className="inline -mt-0.5" /> {i.totalMin} min</span><span>{i.recipe.budget ? '💰 Budget' : '💰💰'}</span><button className="ghost-btn !min-h-8 !px-2.5 !text-[11px]"><Icon n="plus" s={14} />Diary</button></div></div>
    </div>)}</div>
  </div>;
}

// ================= PROGRESS =================
export function Progress() {
  const { weights, weightLabels, kcalWeek, attributes, hunter } = PREVIEW;
  return <div className="space-y-5 animate-rise">
    <h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">PROGRESS</h1>
    <div className="grid lg:grid-cols-3 gap-5">
      <Holo className="lg:col-span-2" title="Weight evolution" right={<span className="display text-xs text-emerald-300">−2.0 kg · 8 weeks</span>}><NeonLine values={weights} labels={weightLabels} unit=" kg" height={180} /></Holo>
      <Holo violet title="Rank path"><div className="flex items-center justify-between">{(['E', 'D', 'C', 'B', 'A', 'S'] as const).map(r => <div key={r} className={`flex flex-col items-center ${r === hunter.rank ? '' : 'opacity-40'}`}><RankBadge rank={r} s={r === hunter.rank ? 50 : 34} /></div>)}</div>
        <div className="mt-4"><XPBar value={hunter.into} max={hunter.need} label={`Level ${hunter.level}`} sub={`${hunter.need - hunter.into} XP to level ${hunter.level + 1}`} /></div></Holo>
    </div>
    <div className="grid lg:grid-cols-3 gap-5">
      <Holo title="Calories · this week"><div className="flex items-end gap-2 h-40">{kcalWeek.map((v, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t-md bg-gradient-to-t from-sky-500/70 to-violet-500/80 shadow-glow" style={{ height: `${(v / 2200) * 100}%` }} /><span className="label !text-[9px]">{'MTWTFSS'[i]}</span></div>)}</div><div className="text-sm text-slate-400 mt-2">Average 1,779 kcal · target 1,950</div></Holo>
      <Holo violet title="Attributes"><div className="flex justify-center"><Radar stats={attributes} size={200} /></div></Holo>
      <Holo title="Weekly report · AI"><div className="flex items-center gap-4"><NeonRing value={82} max={100} size={96} stroke={8}><span className="display text-xl text-sky-50">82</span></NeonRing><div className="text-sm"><div className="text-emerald-300">▲ Push-ups +4 reps</div><div className="text-emerald-300">▲ 5/7 days logged</div><div className="text-amber-300">▼ Water under target 3 days</div></div></div>
        <p className="text-[13px] text-slate-400 mt-3">Next week: add 1 cardio session, keep calories at 1,950. Targets never change from one unusual day.</p></Holo>
    </div>
  </div>;
}

// ================= PROFILE =================
export function Profile() {
  const h = PREVIEW.hunter;
  return <div className="space-y-5 animate-rise max-w-3xl">
    <Holo violet scan className="!p-5"><div className="flex items-center gap-4"><RankBadge rank={h.rank} s={72} /><div><h1 className="display font-black text-2xl text-sky-50 glow-text">{h.name.toUpperCase()}</h1><div className="text-slate-400 text-sm">Level {h.level} · {h.title}</div></div></div></Holo>
    <Holo title="Hunter data"><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">{[['Age', '27'], ['Height', '178 cm'], ['Weight', '82.2 kg'], ['Target', '76 kg'], ['Location', 'Home'], ['Equipment', 'Dumbbells, band'], ['Training days', 'Mon · Wed · Fri · Sat'], ['Session', '35 min'], ['Allergies', 'None'], ['Budget', '600 MAD / week'], ['Cuisines', 'Moroccan, Japanese, Turkish'], ['Language', 'Darija']].map(([k, v]) =>
      <div key={k} className="rounded-lg border border-sky-400/15 bg-void-950/40 p-3"><div className="label">{k}</div><div className="text-slate-100 mt-0.5">{v}</div></div>)}</div></Holo>
    <Holo title="Daily targets (Mifflin-St Jeor)"><div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">{[['Calories', '1,950'], ['Protein', '140 g'], ['Carbs', '210 g'], ['Fat', '65 g'], ['Water', '2.6 L']].map(([k, v]) =>
      <div key={k} className="rounded-lg border border-violet-400/20 bg-violet-500/[.05] p-3"><div className="display text-lg text-sky-50">{v}</div><div className="label">{k}</div></div>)}</div>
      <p className="text-[12px] text-slate-500 mt-3">Moderate deficit (−400 kcal). Never below safe minimums. Estimates, not medical advice.</p></Holo>
    <div className="grid sm:grid-cols-2 gap-3">{['Notifications & motivation', 'Language', 'Privacy & data export', 'Log out'].map(x => <button key={x} className="holo !p-4 flex items-center justify-between text-left hover:shadow-glow"><div className="corners"><i /><i /><i /><i /></div><span className="font-ui font-bold tracking-wider uppercase text-slate-200">{x}</span><Icon n="next" s={18} className="text-sky-300" /></button>)}</div>
  </div>;
}

// ================= AWAKENING (onboarding preview) =================
export function Awaken() {
  const [step, setStep] = useState(0);
  const steps = [
    { t: 'You have been chosen', d: 'A new System has connected to you. It will track your body, your food and your discipline — and make you stronger every day.' },
    { t: 'Hunter data', d: 'Age · gender · height · weight · target · activity · experience' },
    { t: 'Training grounds', d: 'Home or gym · equipment · days · session length' },
    { t: 'Fuel', d: 'Diet preferences · allergies · budget · favourite cuisines' },
  ];
  return <div className="min-h-[70vh] grid place-items-center animate-rise">
    <div className="max-w-lg w-full text-center">
      <div className="label text-neon-cyan animate-flicker">[ SYSTEM MESSAGE ]</div>
      <div className="display font-black text-3xl sm:text-4xl mt-3 glow-violet text-violet-100">AWAKENING</div>
      <Holo violet scan className="mt-6 text-left !p-6"><div className="flex gap-1.5 mb-5">{steps.map((_, i) => <i key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gradient-to-r from-sky-400 to-violet-500 shadow-glow' : 'bg-slate-700'}`} />)}</div>
        <div className="display text-xl text-sky-50">{steps[step].t}</div><p className="text-slate-300 mt-2">{steps[step].d}</p>
        {step === 1 && <div className="grid grid-cols-2 gap-3 mt-4">{['Age', 'Height (cm)', 'Weight (kg)', 'Target (kg)'].map(x => <input key={x} className="field" placeholder={x} />)}</div>}
        <div className="flex justify-between mt-6"><button className="ghost-btn" disabled={!step} onClick={() => setStep(s => Math.max(0, s - 1))}>Back</button>
          {step < steps.length - 1 ? <button className="neon-btn" onClick={() => setStep(s => s + 1)}>Accept</button> : <Link to="/" className="neon-btn">Arise</Link>}</div></Holo>
      <p className="text-[12px] text-slate-500 mt-4">Rank colours: {Object.entries(RANK_COLORS).map(([r, c]) => <span key={r} style={{ color: c }} className="display mx-1">{r}</span>)}</p>
    </div>
  </div>;
}
