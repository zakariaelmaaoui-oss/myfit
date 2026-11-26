import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Holo, Icon, NeonRing, Radar, RankBadge, StatBar, XPBar } from '../design';
import { ExerciseFigure } from '../design/ExerciseFigure';
import { levelsToNextRank } from '../lib/rpg';
import { attributeScore, TITLES, type QuestRow as Q } from '../core/game';
import { motivation, slotFor } from '../core/motivation';
import { saveCheckin } from '../core/engine';
import { getEx } from '../data/exercises';
import { useHunter } from '../app/store';
import { questTitle, t, lang } from '../app/i18n';
import { Spinner, fmt, useBusy } from '../app/ui';

export function QuestRow({ q, onDone }: { q: Q; onDone?: () => void }) {
  const done = q.status === 'done'; const pct = Math.min(100, (Number(q.progress) / Math.max(1, Number(q.target))) * 100);
  const unit = q.unit === 'ml' ? `${(Number(q.progress) / 1000).toFixed(1)} / ${(Number(q.target) / 1000).toFixed(1)} L` : q.kind === 'custom' || q.kind === 'workout' || q.kind === 'evaluation' ? (q.detail ?? '') : `${fmt(q.progress)} / ${fmt(q.target)} ${q.unit ?? ''}`;
  return <div className={`flex items-center gap-3 py-2.5 border-b border-sky-400/10 last:border-0 ${done ? 'opacity-70' : ''}`}>
    <button disabled={done || q.kind !== 'custom' || !onDone} onClick={onDone} aria-label="complete"
      className={`grid place-items-center w-6 h-6 shrink-0 rounded-md border ${done ? 'bg-sky-400/25 border-sky-300 text-sky-100 shadow-glow' : 'border-slate-500/60'} ${q.kind === 'custom' && !done ? 'hover:border-sky-300 cursor-pointer' : ''}`}>{done && <Icon n="check" s={14} sw={3} />}</button>
    <div className="flex-1 min-w-0">
      <div className={`font-ui font-bold tracking-wide truncate ${done ? 'line-through text-slate-400' : 'text-slate-100'}`}>{questTitle(q)}</div>
      <div className="flex items-center gap-2"><div className="h-1 flex-1 max-w-[140px] rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        <span className="text-[11px] text-slate-400 truncate">{unit}</span></div>
    </div>
    <span className="display text-[10px] px-1.5 py-0.5 rounded border border-slate-600 text-slate-400">{q.difficulty}</span>
    <span className="display text-[11px] text-violet-300 glow-violet whitespace-nowrap">+{q.xp} XP</span>
  </div>;
}

export function attrs(a: Record<string, number>, streak: number) {
  return [{ label: 'Strength', value: attributeScore(a.strength) }, { label: 'Endurance', value: attributeScore(a.endurance) }, { label: 'Discipline', value: attributeScore(a.discipline) },
    { label: 'Consistency', value: Math.min(99, attributeScore(a.consistency) + Math.min(15, streak)) }, { label: 'Fitness', value: attributeScore(a.fitness + (a.strength + a.endurance) / 4) }];
}

function Checkin() {
  const { h, act } = useHunter(); const [busy, run] = useBusy();
  const [v, setV] = useState({ energy: 3, soreness: 2, mood: 3, sleep_hours: 7 });
  if (!h || h.day.checkin) return null;
  const scale = (k: 'energy' | 'soreness' | 'mood') => <div className="flex items-center gap-2"><span className="label w-24">{t(k === 'energy' ? 'energyLvl' : k)}</span>
    {[1, 2, 3, 4, 5].map(n => <button key={n} className={`w-9 h-9 rounded-lg border font-ui font-bold ${v[k] === n ? 'border-sky-300 bg-sky-400/20 text-sky-50 shadow-glow' : 'border-slate-600 text-slate-400'}`} onClick={() => setV({ ...v, [k]: n })}>{n}</button>)}</div>;
  return <Holo title={t('checkin')} right={<span className="display text-[11px] text-violet-300">+10 XP</span>}>
    <div className="space-y-2">{scale('energy')}{scale('soreness')}{scale('mood')}
      <div className="flex items-center gap-2"><span className="label w-24">{t('sleep')}</span><input className="field !min-h-9 w-24" type="number" min={0} max={16} step={0.5} value={v.sleep_hours} onChange={e => setV({ ...v, sleep_hours: Number(e.target.value) })} /></div></div>
    <button className="neon-btn w-full mt-3" disabled={busy} onClick={() => run(() => act((sb, uid, d) => saveCheckin(sb, uid, d, v)))}>{t('save')}</button>
    <p className="text-[11px] text-slate-500 mt-2">High soreness or low energy → THE SYSTEM holds tomorrow’s progression.</p>
  </Holo>;
}

export function Home() {
  const { h, loading, error, refresh } = useHunter();
  if (!h) return loading ? <Spinner /> : <Holo title="Error"><p className="text-rose-300 text-sm">{error ?? 'No data'}</p><button className="ghost-btn mt-3" onClick={refresh}>Retry</button></Holo>;
  const { stats, profile, target, day, quests, workout, streak } = h;
  const done = quests.filter(q => q.status === 'done').length; const toRank = levelsToNextRank(stats.level);
  const kcal = day.totals.kcal; const tk = target?.kcal ?? 0;
  const hour = new Date().getHours(); const slot = slotFor(hour);
  const msg = motivation(workout.day && day.sessions.some(s => s.status === 'completed') && slot === 'pre_workout' ? 'post_workout' : slot, lang(), {
    name: profile.name, questsLeft: quests.length - done, trainingDay: !!workout.day, workoutDone: day.sessions.some(s => s.status === 'completed'),
    proteinLeft: target?.protein ? Math.round(target.protein - day.totals.protein) : null, kcalLeft: tk ? tk - kcal : null, streak, waterLeftMl: (target?.water_ml ?? 0) - day.waterMl });
  const first = workout.items[0]?.exercise_id;
  return <div className="space-y-5 animate-rise">
    <Holo violet scan className="!p-5 sm:!p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex items-center gap-4">
          <RankBadge rank={stats.rank} s={86} />
          <div><div className="label text-neon-cyan animate-flicker">[ System · Player status ]</div>
            <h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text mt-1">{profile.name.toUpperCase()}</h1>
            <div className="font-ui font-bold tracking-[.16em] uppercase text-violet-300 text-sm">{TITLES[stats.rank]} · {t('rank')} {stats.rank}</div></div>
        </div>
        <div className="sm:ml-auto flex gap-3">
          <div className="text-center px-4 py-2 rounded-xl border border-sky-400/25 bg-sky-400/5"><div className="label">{t('level')}</div><div className="display text-3xl text-sky-100 glow-text">{stats.level}</div></div>
          <div className="text-center px-4 py-2 rounded-xl border border-orange-400/30 bg-orange-400/5"><div className="label">{t('streak')}</div><div className="display text-3xl text-orange-200" style={{ textShadow: '0 0 14px rgba(251,146,60,.9)' }}>{streak}<span className="text-base">🔥</span></div></div>
        </div>
      </div>
      <div className="mt-5"><XPBar value={stats.into} max={stats.need} label={`XP ${stats.into.toLocaleString()} / ${stats.need.toLocaleString()}`} sub={toRank !== null ? `${toRank} levels → Rank ${'EDCBAS'['EDCBAS'.indexOf(stats.rank) + 1]}` : 'Max rank'} /></div>
      <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/[.04] px-4 py-3 text-[15px] text-sky-100/90" dir="auto"><span className="label text-neon-cyan mr-2">The System:</span>{msg}</div>
    </Holo>

    <div className="grid lg:grid-cols-5 gap-5">
      <Holo className="lg:col-span-3" title={t('dailyQuest')} right={<span className="display text-xs text-sky-200">{done}/{quests.length}</span>}>
        <div className="text-[13px] text-slate-400 -mt-1 mb-2">Quests complete themselves from what you log. Clear 60% to keep your streak.</div>
        {quests.map(q => <QuestRow key={q.id} q={q} />)}
        <Link to="/quests" className="ghost-btn w-full mt-3">{t('openQuests')} <Icon n="next" s={16} /></Link>
      </Holo>
      <Holo violet className="lg:col-span-2" title={t('status')}>
        <div className="flex justify-center"><Radar stats={attrs(stats.attrs, streak)} size={240} /></div>
        <div className="text-center text-[12px] text-slate-500">Total XP {stats.xp.toLocaleString()}</div>
      </Holo>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      <Holo title={t('energy')}>
        {tk ? <><div className="flex items-center gap-5">
          <NeonRing value={kcal} max={tk} size={140}><div><div className="display text-2xl text-sky-50 glow-text">{fmt(kcal)}</div><div className="label">/ {tk} kcal</div></div></NeonRing>
          <div className="flex-1 space-y-3">
            <StatBar label={t('protein')} value={Math.min(100, Math.round(day.totals.protein / (target?.protein || 1) * 100))} color="#38bdf8" />
            <StatBar label={t('carbs')} value={Math.min(100, Math.round(day.totals.carbs / (target?.carbs || 1) * 100))} color="#a855f7" />
            <StatBar label={t('fat')} value={Math.min(100, Math.round(day.totals.fat / (target?.fat || 1) * 100))} color="#e879f9" />
          </div></div>
          <div className="mt-4 text-sm text-slate-300">{t('remaining')} <b className="text-sky-200">{fmt(Math.max(0, tk - kcal))} kcal</b> · <b className="text-sky-200">{fmt(Math.max(0, (target?.protein ?? 0) - day.totals.protein))} g</b> {t('protein').toLowerCase()}</div></>
          : <p className="text-sm text-slate-400">No calorie target (under 18). Focus on balanced meals.</p>}
        <Link to="/nutrition" className="ghost-btn w-full mt-3"><Icon n="plus" s={16} />{t('addFood')}</Link>
      </Holo>
      <Holo title={t('todaysDungeon')} right={workout.day && <span className="display text-xs text-violet-300">{workout.deload ? 'DELOAD' : `WEEK ${workout.week}`}</span>}>
        {workout.day ? <div className="flex items-center gap-3"><div className="shrink-0 rounded-xl bg-violet-500/10 border border-violet-400/25">{first && getEx(first)?.figure ? <ExerciseFigure id={getEx(first)!.figure!} size={110} /> : <div className="w-[110px] h-[110px] grid place-items-center text-violet-300"><Icon n="sword" s={40} /></div>}</div>
          <div><div className="display text-lg text-sky-50">{workout.day.name}</div><div className="text-sm text-slate-400">{workout.items.length} exercises · ~{profile.session_minutes} min</div>
            {day.sessions.some(s => s.status === 'completed') ? <div className="mt-3 text-emerald-300 font-ui font-bold tracking-wider">✔ CLEARED</div> : <Link to="/workout" className="neon-btn !min-h-10 mt-3 text-sm"><Icon n="play" s={16} />{t('enter')}</Link>}</div></div>
          : <div className="text-sm text-slate-300"><div className="display text-lg text-sky-50 mb-1">{t('restDay')}</div>Recovery is part of the plan. A walk and 5 minutes of mobility keep the streak alive.<Link to="/workout" className="ghost-btn mt-3 w-full">{t('activity')}</Link></div>}
      </Holo>
      <Holo title={t('vitals')}>
        <div className="grid grid-cols-2 gap-3">
          {[{ i: 'drop', l: t('water'), v: `${(day.waterMl / 1000).toFixed(1)} L`, s: `/ ${((target?.water_ml ?? 2000) / 1000).toFixed(1)} L`, c: '#38bdf8' },
            { i: 'sword', l: 'Sets', v: `${day.sets.length}`, s: 'today', c: '#a855f7' },
            { i: 'scale', l: t('weight'), v: `${profile.weight_kg}`, s: profile.target_weight_kg ? `kg · target ${profile.target_weight_kg}` : 'kg', c: '#5eead4' },
            { i: 'trophy', l: t('achievements'), v: `${h.achievements.length}`, s: 'unlocked', c: '#fb923c' }].map(x =>
            <div key={x.l} className="rounded-xl border border-sky-400/15 bg-void-950/40 p-3"><div className="flex items-center gap-2" style={{ color: x.c }}><Icon n={x.i} s={16} /><span className="label">{x.l}</span></div>
              <div className="display text-xl mt-1 text-slate-50">{x.v}</div><div className="text-[11px] text-slate-500">{x.s}</div></div>)}
        </div>
      </Holo>
    </div>
    {hour >= 17 && <Checkin />}
  </div>;
}
