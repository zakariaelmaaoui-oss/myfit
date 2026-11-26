import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Holo, Icon, LevelUpOverlay, NeonRing, Radar, RankBadge, StatBar, XPBar } from '../design';
import { ExerciseFigure } from '../design/ExerciseFigure';
import { PREVIEW } from '../app/preview';
import { levelsToNextRank } from '../lib/rpg';

export function QuestRow({ q }: { q: typeof PREVIEW.quests[number] }) {
  const pct = Math.min(100, (q.progress / q.target) * 100);
  return <div className={`group flex items-center gap-3 py-2.5 border-b border-sky-400/10 last:border-0 ${q.done ? 'opacity-70' : ''}`}>
    <span className={`grid place-items-center w-6 h-6 rounded-md border ${q.done ? 'bg-sky-400/25 border-sky-300 text-sky-100 shadow-glow' : 'border-slate-500/60'}`}>{q.done && <Icon n="check" s={14} sw={3} />}</span>
    <div className="flex-1 min-w-0">
      <div className={`font-ui font-bold tracking-wide ${q.done ? 'line-through text-slate-400' : 'text-slate-100'}`}>{q.title}</div>
      <div className="flex items-center gap-2"><div className="h-1 flex-1 max-w-[140px] rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-400 to-violet-500" style={{ width: `${pct}%` }} /></div><span className="text-[11px] text-slate-400">{q.detail}</span></div>
    </div>
    <span className="display text-[11px] text-violet-300 glow-violet whitespace-nowrap">+{q.xp} XP</span>
  </div>;
}

export function Home() {
  const { hunter: h, attributes, today, quests, workout } = PREVIEW; const [lvl, setLvl] = useState(false);
  const done = quests.filter(q => q.done).length; const toRank = levelsToNextRank(h.level);
  return <div className="space-y-5 animate-rise">
    {/* Hero: hunter status */}
    <Holo violet scan className="!p-5 sm:!p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex items-center gap-4">
          <RankBadge rank={h.rank} s={86} />
          <div><div className="label text-neon-cyan animate-flicker">[ System · Player status ]</div>
            <h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text mt-1">{h.name.toUpperCase()}</h1>
            <div className="font-ui font-bold tracking-[.16em] uppercase text-violet-300 text-sm">{h.title} · Rank {h.rank}</div></div>
        </div>
        <div className="sm:ml-auto flex gap-3">
          <div className="text-center px-4 py-2 rounded-xl border border-sky-400/25 bg-sky-400/5"><div className="label">Level</div><div className="display text-3xl text-sky-100 glow-text">{h.level}</div></div>
          <div className="text-center px-4 py-2 rounded-xl border border-orange-400/30 bg-orange-400/5"><div className="label">Streak</div><div className="display text-3xl text-orange-200" style={{ textShadow: '0 0 14px rgba(251,146,60,.9)' }}>{h.streak}<span className="text-base">🔥</span></div></div>
        </div>
      </div>
      <div className="mt-5"><XPBar value={h.into} max={h.need} label={`XP ${h.into.toLocaleString()} / ${h.need.toLocaleString()}`} sub={toRank !== null ? `${toRank} levels to Rank ${'EDCBAS'['EDCBAS'.indexOf(h.rank) + 1]}` : 'Max rank'} /></div>
      <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/[.04] px-4 py-3 text-[15px] text-sky-100/90"><span className="label text-neon-cyan mr-2">The System:</span>One more repetition. One more day. One step closer. Today’s dungeon is <b className="text-sky-200">Push Protocol</b>.</div>
    </Holo>

    <div className="grid lg:grid-cols-5 gap-5">
      {/* Daily quest */}
      <Holo className="lg:col-span-3" title="Daily Quest · Hunter training" right={<span className="display text-xs text-sky-200">{done}/{quests.length}</span>}>
        <div className="text-[13px] text-slate-400 -mt-1 mb-2">Complete all quests before midnight to keep your streak and earn a bonus chest (+60 XP).</div>
        {quests.map(q => <QuestRow key={q.id} q={q} />)}
        <Link to="/quests" className="ghost-btn w-full mt-3">Open quest log <Icon n="next" s={16} /></Link>
      </Holo>
      {/* Status window */}
      <Holo violet className="lg:col-span-2" title="Status">
        <div className="flex justify-center"><Radar stats={attributes} size={240} /></div>
        <button className="ghost-btn w-full mt-2" onClick={() => setLvl(true)}>Preview level-up effect</button>
      </Holo>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      <Holo title="Energy · Today">
        <div className="flex items-center gap-5">
          <NeonRing value={today.kcal} max={today.target} size={140}><div><div className="display text-2xl text-sky-50 glow-text">{today.kcal}</div><div className="label">/ {today.target} kcal</div></div></NeonRing>
          <div className="flex-1 space-y-3">
            <StatBar label="Protein" value={Math.round(today.protein / today.proteinTarget * 100)} color="#38bdf8" />
            <StatBar label="Carbs" value={Math.round(today.carbs / today.carbsTarget * 100)} color="#a855f7" />
            <StatBar label="Fat" value={Math.round(today.fat / today.fatTarget * 100)} color="#e879f9" />
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-300">Remaining <b className="text-sky-200">{today.target - today.kcal} kcal</b> · <b className="text-sky-200">{today.proteinTarget - today.protein} g</b> protein</div>
      </Holo>
      <Holo title="Today’s dungeon" right={<span className="display text-xs text-violet-300">+{workout.xp} XP</span>}>
        <div className="flex items-center gap-3"><div className="shrink-0 rounded-xl bg-violet-500/10 border border-violet-400/25"><ExerciseFigure id="pushup" size={110} /></div>
          <div><div className="display text-lg text-sky-50">{workout.name}</div><div className="text-sm text-slate-400">{workout.day} · {workout.minutes} min · {workout.exercises.length} exercises</div>
            <Link to="/workout" className="neon-btn !min-h-10 mt-3 text-sm"><Icon n="play" s={16} />Enter</Link></div></div>
      </Holo>
      <Holo title="Vitals">
        <div className="grid grid-cols-2 gap-3">
          {[{ i: 'drop', l: 'Water', v: `${(today.waterMl / 1000).toFixed(1)} L`, s: `/ ${(today.waterTarget / 1000).toFixed(1)} L`, c: '#38bdf8' }, { i: 'bolt', l: 'Steps', v: today.steps.toLocaleString(), s: '/ 8,000', c: '#a855f7' },
            { i: 'scale', l: 'Weight', v: '82.2', s: 'kg · −2.0', c: '#5eead4' }, { i: 'flame', l: 'Best streak', v: `${PREVIEW.hunter.bestStreak}`, s: 'days', c: '#fb923c' }].map(x =>
            <div key={x.l} className="rounded-xl border border-sky-400/15 bg-void-950/40 p-3"><div className="flex items-center gap-2" style={{ color: x.c }}><Icon n={x.i} s={16} /><span className="label">{x.l}</span></div>
              <div className="display text-xl mt-1 text-slate-50">{x.v}</div><div className="text-[11px] text-slate-500">{x.s}</div></div>)}
        </div>
      </Holo>
    </div>
    {lvl && <LevelUpOverlay level={h.level + 1} rank={h.rank} onClose={() => setLvl(false)} />}
  </div>;
}
