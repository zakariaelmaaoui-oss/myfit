import { useEffect, useMemo, useState } from 'react';
import { Holo, Icon, NeonLine, NeonRing, Radar, RankBadge, XPBar, RANK_COLORS } from '../design';
import { supabase } from '../lib/supabase';
import { addDays, isoDate } from '../lib/nutrition';
import { ACHIEVEMENTS } from '../core/game';
import * as E from '../core/engine';
import { api, ApiError, today } from '../app/api';
import { useHunter } from '../app/store';
import { Modal, Num, Busy, useBusy, fmt, Spinner, Field } from '../app/ui';
import { QuestRow, attrs } from './home';
import { ProfileFields, TargetsPreview, type ProfileDraft } from './awaken';
import { t, setLang, type Lang } from '../app/i18n';
import { enablePush, disablePush, pushSupported, VAPID_PUBLIC } from '../app/push';

// ================= QUESTS =================
export function Quests() {
  const { h, act } = useHunter(); const [busy, run] = useBusy(); const [title, setTitle] = useState(''); const [xp, setXp] = useState<number | ''>(15);
  if (!h) return <Spinner />;
  const done = h.quests.filter(q => q.status === 'done').length;
  return <div className="space-y-5 animate-rise">
    <div><div className="label text-neon-cyan">[ System · Quest log ]</div><h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">{t('quests').toUpperCase()}</h1></div>
    <Holo violet scan title={t('dailyQuest')} right={<span className="display text-xs text-sky-200">{done}/{h.quests.length}</span>}>
      <div className="mb-3"><XPBar value={done} max={h.quests.length} label="Completion" sub={done / Math.max(1, h.quests.length) >= 0.6 ? 'Streak secured 🔥' : `${Math.ceil(h.quests.length * 0.6) - done} more for the streak`} /></div>
      {h.quests.map(q => <div key={q.id}><QuestRow q={q} onDone={q.kind === 'custom' ? () => run(() => act((sb, u) => E.completeCustomQuest(sb, u, q.id))) : undefined} />
        {q.instructions && q.status !== 'done' && <div className="text-[11px] text-slate-500 -mt-1.5 mb-1.5 ps-9">{q.instructions}</div>}</div>)}
      <p className="text-[11px] text-slate-500 mt-2">System quests complete automatically from your real logs (food, water, sets, check-in). Only custom quests can be ticked by hand.</p>
    </Holo>
    <Holo title={t('newQuest')}>
      <div className="flex flex-wrap items-end gap-2"><Field label="Quest"><input className="field" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Cook dinner at home, read 10 pages…" /></Field>
        <Field label="XP (5–30)"><Num value={xp} min={5} max={30} onChange={setXp} className="!w-24" /></Field>
        <Busy busy={busy} className="neon-btn" disabled={!title.trim()} onClick={() => run(async () => { await act((sb, u, d) => E.createCustomQuest(sb, u, d, { title: title.trim(), xp: Number(xp) || 15 }, 'user')); setTitle(''); })}><Icon n="plus" s={16} />{t('add')}</Busy></div>
      <p className="text-[11px] text-slate-500 mt-2">Max 3 custom quests per day. THE SYSTEM can also issue them.</p>
    </Holo>
    <Holo title={t('weekly')}>{h.challenges.map(c => <div key={c.id} className="py-2.5 border-b border-sky-400/10 last:border-0">
      <div className="flex justify-between"><span className={`font-ui font-bold ${c.status === 'done' ? 'text-emerald-300' : 'text-slate-100'}`}>{c.status === 'done' ? '✔ ' : ''}{c.title}</span><span className="display text-[11px] text-violet-300">+{c.xp} XP</span></div>
      <div className="flex items-center gap-2 mt-1"><div className="bar h-2 flex-1"><i style={{ width: `${Math.min(100, (Number(c.progress) / Number(c.target)) * 100)}%` }} /></div><span className="text-[11px] text-slate-400">{fmt(c.progress)} / {fmt(c.target)}</span></div></div>)}</Holo>
    <Holo violet title={t('achievements')} right={<span className="display text-xs text-violet-200">{h.achievements.length}/{ACHIEVEMENTS.length}</span>}>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">{ACHIEVEMENTS.map(a => { const got = h.achievements.includes(a.key);
        return <div key={a.key} className={`rounded-xl border p-3 text-center ${got ? 'border-violet-400/50 bg-violet-500/10 shadow-glow-violet' : 'border-slate-700 opacity-45'}`} title={a.desc}>
          <Icon n={a.icon} s={26} className={got ? 'text-violet-200 mx-auto' : 'text-slate-500 mx-auto'} /><div className="font-ui font-bold text-[12px] mt-1 leading-tight">{a.name}</div><div className="text-[10px] text-slate-500 leading-tight">{a.desc}</div></div>; })}</div>
    </Holo>
  </div>;
}

// ================= PROGRESS =================
export function Progress() {
  const { h, act, uid } = useHunter(); const [busy, run] = useBusy();
  const [hist, setHist] = useState<Awaited<ReturnType<typeof E.history>> | null>(null); const [kg, setKg] = useState<number | ''>(''); const [reports, setReports] = useState<any[]>([]);
  const [photos, setPhotos] = useState<{ id: string; date: string; url: string; path: string }[]>([]); const [meas, setMeas] = useState<any>({}); const [rbusy, setRbusy] = useState(false); const [rerr, setRerr] = useState('');
  const load = async () => { if (!uid) return; const d = isoDate();
    setHist(await E.history(supabase, uid, addDays(d, -119), d));
    const r = await supabase.from('sf_weekly_reports').select('*').eq('user_id', uid).order('week_start', { ascending: false }).limit(6); setReports(r.data ?? []);
    const p = await supabase.from('sf_progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(12);
    const signed = await Promise.all((p.data ?? []).map(async x => ({ ...x, url: (await supabase.storage.from('sf-progress').createSignedUrl(x.path, 3600)).data?.signedUrl ?? '' }))); setPhotos(signed);
    const m = await supabase.from('sf_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(1); setMeas(m.data?.[0] ?? {}); };
  useEffect(() => { load(); }, [uid, h?.stats.xp]);
  const week7 = useMemo(() => { const d = isoDate(); return Array.from({ length: 7 }, (_, i) => addDays(d, i - 6)).map(x => ({ d: x, kcal: hist?.nutrition.find(n => n.date === x)?.kcal ?? 0 })); }, [hist]);
  if (!h || !hist) return <Spinner />;
  const w = hist.weights; const tk = h.target?.kcal ?? 2000; const maxK = Math.max(tk * 1.2, ...week7.map(x => x.kcal));
  const logged = week7.filter(x => x.kcal > 0); const avg = logged.length ? Math.round(logged.reduce((a, x) => a + x.kcal, 0) / logged.length) : null;
  const gen = async (apply = false) => { setRbusy(true); setRerr(''); try { await api('/api/report', { date: today(), apply }); await load(); if (apply) await act(async () => null, { title: 'TARGET UPDATED', lines: ['From your weekly trend'] }); } catch (e) { setRerr(e instanceof ApiError ? e.code : 'error'); } finally { setRbusy(false); } };
  const upload = (f: File) => run(async () => {
    const path = `${uid}/${today()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const up = await supabase.storage.from('sf-progress').upload(path, f, { contentType: f.type || 'image/jpeg' }); if (up.error) throw up.error;
    const ins = await supabase.from('sf_progress_photos').insert({ user_id: uid, date: today(), path }); if (ins.error) throw ins.error; await load(); });
  return <div className="space-y-5 animate-rise">
    <h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">{t('progress').toUpperCase()}</h1>
    <div className="grid lg:grid-cols-3 gap-5">
      <Holo className="lg:col-span-2" title="Weight evolution" right={w.length > 1 && <span className={`display text-xs ${w[w.length - 1].kg <= w[0].kg ? 'text-emerald-300' : 'text-amber-300'}`}>{(w[w.length - 1].kg - w[0].kg).toFixed(1)} kg</span>}>
        {w.length > 1 ? <NeonLine values={w.slice(-16).map(x => x.kg)} labels={w.slice(-16).map(x => x.date.slice(5))} unit=" kg" height={180} /> : <p className="text-sm text-slate-400 py-6 text-center">Log your weight 2+ times to see the curve. Weigh in the morning, 1–3× per week.</p>}
        <div className="flex items-end gap-2 mt-3"><Field label={`${t('logWeight')} (kg)`}><Num value={kg} min={30} max={300} step={0.1} onChange={setKg} className="!w-32" /></Field>
          <Busy busy={busy} className="neon-btn" disabled={!kg} onClick={() => run(async () => { await act((sb, u, d) => E.logWeight(sb, u, d, Number(kg))); setKg(''); await load(); })}>{t('save')}</Busy></div>
      </Holo>
      <Holo violet title="Rank path"><div className="flex items-center justify-between">{(['E', 'D', 'C', 'B', 'A', 'S'] as const).map(r => <div key={r} className={r === h.stats.rank ? '' : 'opacity-35'}><RankBadge rank={r} s={r === h.stats.rank ? 50 : 32} /></div>)}</div>
        <div className="mt-4"><XPBar value={h.stats.into} max={h.stats.need} label={`${t('level')} ${h.stats.level}`} sub={`${h.stats.need - h.stats.into} XP → ${h.stats.level + 1}`} /></div>
        <p className="text-[12px] mt-3" style={{ color: RANK_COLORS[h.stats.rank] }}>Ranks: E 1–9 · D 10–19 · C 20–34 · B 35–49 · A 50–69 · S 70+</p></Holo>
    </div>
    <div className="grid lg:grid-cols-3 gap-5">
      <Holo title="Calories · last 7 days"><div className="relative flex items-end gap-2 h-40">
        <div className="absolute inset-x-0 border-t border-dashed border-emerald-400/50" style={{ bottom: `${(tk / maxK) * 100}%` }}><span className="absolute -top-4 right-0 text-[10px] text-emerald-300">target {tk}</span></div>
        {week7.map(x => <div key={x.d} className="flex-1 flex flex-col items-center gap-1 h-full justify-end"><div className="w-full rounded-t-md bg-gradient-to-t from-sky-500/70 to-violet-500/80 shadow-glow" style={{ height: `${(x.kcal / maxK) * 100}%` }} /><span className="label !text-[9px]">{'SMTWTFS'[new Date(x.d + 'T12:00').getDay()]}</span></div>)}</div>
        <div className="text-sm text-slate-400 mt-2">{avg ? `Average ${avg} kcal on ${logged.length} logged days` : 'No meals logged this week yet.'}</div></Holo>
      <Holo violet title="Attributes"><div className="flex justify-center"><Radar stats={attrs(h.stats.attrs, h.streak)} size={200} /></div></Holo>
      <Holo title={t('report')} right={<button className="ghost-btn !min-h-8 !px-2.5 !text-[11px]" disabled={rbusy} onClick={() => gen()}>{rbusy ? '…' : t('generate')}</button>}>
        {rerr && <p className="text-sm text-rose-300 mb-2">{rerr === 'ai_busy' ? 'AI busy — retry in 30 s.' : `Error: ${rerr}`}</p>}
        {!reports.length ? <p className="text-sm text-slate-400">Your first evaluation analyses last week: training, calories, protein, weight trend and quests.</p> : (() => { const r = reports[0]; const s = r.stats;
          return <div className="space-y-2 text-sm"><div className="flex items-center gap-3"><NeonRing value={s.quests_done} max={Math.max(1, s.quests_total)} size={84} stroke={7}><span className="display text-base text-sky-50">{s.quests_total ? Math.round(s.quests_done / s.quests_total * 100) : 0}%</span></NeonRing>
            <div className="text-[13px] space-y-0.5"><div>⚔️ {s.workouts_done}/{s.workouts_planned} workouts</div><div>🍽️ {s.days_logged} days logged · avg {fmt(s.avg_kcal)} kcal</div><div>⚡ protein target {s.protein_days} days</div><div>✨ +{fmt(s.xp)} XP</div></div></div>
            {r.text && <p className="text-slate-200 whitespace-pre-wrap" dir="auto">{r.text}</p>}
            <div className="rounded-lg border border-sky-400/20 p-2 text-[13px]"><b>Target review:</b> {s.review.reason}{s.review.suggestion !== 'keep' && <button className="neon-btn !min-h-8 !text-[12px] mt-2 w-full" disabled={rbusy} onClick={() => gen(true)}>{t('apply')} ({s.review.deltaKcal > 0 ? '+' : ''}{s.review.deltaKcal} kcal)</button>}</div>
            <div className="text-[11px] text-slate-500">Week of {r.week_start}</div></div>; })()}
      </Holo>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Holo title={t('measurements')}>
        <div className="grid grid-cols-3 gap-2">{(['waist_cm', 'chest_cm', 'hips_cm', 'arm_cm', 'thigh_cm'] as const).map(k => <Field key={k} label={k.replace('_cm', ' (cm)')}><Num value={meas[k] ?? ''} min={10} max={250} step={0.5} onChange={v => setMeas({ ...meas, [k]: v === '' ? null : v })} /></Field>)}</div>
        <Busy busy={busy} className="neon-btn w-full mt-3" onClick={() => run(async () => { const { waist_cm, chest_cm, hips_cm, arm_cm, thigh_cm } = meas; const r = await supabase.from('sf_measurements').upsert({ user_id: uid, date: today(), waist_cm, chest_cm, hips_cm, arm_cm, thigh_cm }, { onConflict: 'user_id,date' }); if (r.error) throw r.error; })}>{t('save')}</Busy>
      </Holo>
      <Holo violet title={t('photos')}>
        <label className="ghost-btn w-full cursor-pointer"><Icon n="camera" s={16} />Add photo<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} /></label>
        <div className="grid grid-cols-3 gap-2 mt-3">{photos.map(p => <div key={p.id} className="relative"><img src={p.url} alt={p.date} className="rounded-lg aspect-[3/4] object-cover w-full" /><span className="absolute bottom-1 left-1 text-[10px] bg-black/60 rounded px-1">{p.date}</span></div>)}</div>
        <p className="text-[11px] text-slate-500 mt-2">Stored in a private bucket — only you can open them (links expire after 1 hour).</p>
      </Holo>
    </div>
  </div>;
}

// ================= PROFILE =================
export function Profile() {
  const { h, refresh, uid, session, toast } = useHunter(); const [edit, setEdit] = useState(false); const [p, setP] = useState<ProfileDraft | null>(null); const [busy, run] = useBusy();
  const [prefs, setPrefs] = useState<any>(null); const [pushMsg, setPushMsg] = useState(''); const [del, setDel] = useState(false); const [pw, setPw] = useState('');
  useEffect(() => { if (uid) supabase.from('sf_notification_prefs').select('*').eq('user_id', uid).maybeSingle().then(({ data }) => setPrefs(data ?? { enabled: false, morning: true, pre_workout: true, post_workout: true, evening: true, morning_time: '08:00', workout_time: '18:00', evening_time: '21:30' })); }, [uid]);
  if (!h) return <Spinner />;
  const pr = h.profile;
  const startEdit = () => { const { id, onboarded, ...rest } = pr; setP({ ...rest, limitations: rest.limitations ?? '' }); setEdit(true); };
  const save = () => run(async () => { if (!p || !uid) return;
    const training = (['experience', 'location', 'equipment', 'training_days', 'session_minutes', 'limitations'] as const).some(k => JSON.stringify(p[k]) !== JSON.stringify((pr as any)[k]));
    await E.saveProfile(supabase, uid, { ...p, limitations: p.limitations?.trim() || null }, isoDate(), { regeneratePlan: training, reason: 'Profile updated' });
    setLang(p.language as Lang); setEdit(false); await refresh(); toast({ ok: true, title: 'PROFILE SAVED', lines: training ? ['Training plan rebuilt'] : ['Targets recalculated'] }); });
  const savePrefs = (next: any) => run(async () => { setPrefs(next); const r = await supabase.from('sf_notification_prefs').upsert({ ...next, user_id: uid, tz_offset_min: -new Date().getTimezoneOffset(), updated_at: new Date().toISOString() }); if (r.error) throw r.error; });
  return <div className="space-y-5 animate-rise">
    <h1 className="display font-black text-2xl sm:text-3xl text-sky-50 glow-text">{t('profile').toUpperCase()}</h1>
    <div className="grid lg:grid-cols-2 gap-5">
      <Holo violet title="Hunter data" right={<button className="ghost-btn !min-h-8 !px-2.5 !text-[11px]" onClick={startEdit}><Icon n="gear" s={14} />{t('edit')}</button>}>
        <div className="flex items-center gap-4 mb-4"><RankBadge rank={h.stats.rank} s={64} /><div><div className="display text-xl text-sky-50">{pr.name.toUpperCase()}</div><div className="text-[12px] text-slate-400">{session?.user.email}</div></div></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">{[['Age', pr.age], ['Height', `${pr.height_cm} cm`], ['Weight', `${pr.weight_kg} kg`], ['Target', pr.target_weight_kg ? `${pr.target_weight_kg} kg` : '–'], ['Goal', pr.goal], ['Activity', pr.activity],
          ['Experience', pr.experience], ['Training', `${pr.training_days}×/week · ${pr.session_minutes} min · ${pr.location}`], ['Equipment', pr.equipment.join(', ') || 'bodyweight'], ['Diet', pr.diet], ['Allergies', pr.allergies.join(', ') || '–'], ['Budget', pr.budget]].map(([a, b]) =>
          <div key={String(a)} className="contents"><span className="label">{a}</span><span className="text-slate-200 truncate">{b}</span></div>)}</div>
      </Holo>
      <Holo title="Targets">
        {h.target ? <div className="grid grid-cols-2 gap-2">{[['Calories', `${h.target.kcal ?? '–'} kcal`], [t('protein'), `${h.target.protein ?? '–'} g`], [t('carbs'), `${h.target.carbs ?? '–'} g`], [t('fat'), `${h.target.fat ?? '–'} g`], [t('fiber'), `${h.target.fiber ?? '–'} g`], [t('water'), `${(h.target.water_ml / 1000).toFixed(1)} L`]].map(([a, b]) =>
          <div key={a} className="rounded-xl border border-sky-400/15 bg-void-950/40 p-2.5"><div className="label">{a}</div><div className="display text-sky-50">{b}</div></div>)}</div> : <p className="text-sm text-slate-400">No target.</p>}
        <p className="text-[11px] text-slate-500 mt-2">Since {h.target?.effective_from} · {h.target?.reason}. Changes only via the weekly evaluation — never from one day.</p>
      </Holo>
    </div>
    <Holo title={t('notifications')}>
      {!prefs ? <Spinner /> : <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3"><button className={`chip ${prefs.enabled ? 'on' : ''}`} disabled={busy} onClick={async () => {
          if (!prefs.enabled) { const r = await enablePush(uid!); setPushMsg(r === 'ok' ? 'Push enabled on this device.' : r === 'not_configured' ? 'Push needs the VAPID key on the server (VITE_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in Vercel).' : r === 'denied' ? 'Notifications blocked in the browser settings.' : 'This browser does not support push (on iPhone: add the app to the Home Screen first).'); if (r === 'ok') savePrefs({ ...prefs, enabled: true }); }
          else { await disablePush(); savePrefs({ ...prefs, enabled: false }); setPushMsg('Push disabled.'); } }}>{prefs.enabled ? '🔔 ON' : '🔕 OFF'}</button>
          {!pushSupported() && <span className="text-[12px] text-slate-500">Push not supported in this browser.</span>}{!VAPID_PUBLIC && <span className="text-[12px] text-amber-200">Server push key not configured yet.</span>}</div>
        {pushMsg && <p className="text-[13px] text-sky-200">{pushMsg}</p>}
        <div className="grid sm:grid-cols-3 gap-3">{([['morning', 'morning_time', 'Morning'], ['pre_workout', 'workout_time', 'Workout time'], ['evening', 'evening_time', 'Evening review']] as const).map(([k, tk, l]) =>
          <div key={k} className="rounded-xl border border-sky-400/15 p-3"><label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs[k]} onChange={e => savePrefs({ ...prefs, [k]: e.target.checked })} /><span className="font-ui font-bold">{l}</span></label>
            <input type="time" className="field !min-h-9 mt-2" value={prefs[tk]} onChange={e => savePrefs({ ...prefs, [tk]: e.target.value })} /></div>)}</div>
        <p className="text-[11px] text-slate-500">Reminders are encouraging, never shaming. The pre-workout reminder comes 1 hour before your workout time, on training days only.</p>
      </div>}
    </Holo>
    <Holo title="Account">
      <div className="flex flex-wrap gap-2"><button className="ghost-btn" onClick={() => supabase.auth.signOut()}>{t('signOut')}</button>
        <div className="flex gap-2"><input className="field !min-h-10 !w-48" type="password" minLength={8} placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} />
          <Busy busy={busy} className="ghost-btn" disabled={pw.length < 8} onClick={() => run(async () => { const r = await supabase.auth.updateUser({ password: pw }); if (r.error) throw r.error; setPw(''); toast({ ok: true, title: 'PASSWORD CHANGED', lines: [] }); })}>Change</Busy></div>
        <button className="ghost-btn !text-rose-300 !border-rose-400/30" onClick={() => setDel(true)}>Delete my SHADOW FIT data</button></div>
    </Holo>
    {edit && p && <Modal title={t('edit')} onClose={() => setEdit(false)} wide><ProfileFields p={p} set={x => setP({ ...p, ...x })} step="all" /><div className="mt-4"><TargetsPreview p={p} /></div>
      <Busy busy={busy} className="neon-btn w-full mt-4" disabled={!p.name.trim()} onClick={save}>{t('save')}</Busy></Modal>}
    {del && <Modal title="Delete all data" onClose={() => setDel(false)}><p className="text-sm text-slate-300">This permanently deletes your SHADOW FIT profile, logs, workouts, XP, chat and photos (your login stays, so you can awaken again). It cannot be undone.</p>
      <Busy busy={busy} className="neon-btn w-full mt-4 !from-rose-500 !to-rose-700" onClick={() => run(async () => {
        const list = await supabase.storage.from('sf-progress').list(uid!); if (list.data?.length) await supabase.storage.from('sf-progress').remove(list.data.map(f => `${uid}/${f.name}`));
        for (const tb of ['sf_xp_events', 'sf_exercise_sets', 'sf_workout_sessions', 'sf_food_logs', 'sf_water_logs', 'sf_quests', 'sf_challenges', 'sf_achievements', 'sf_custom_foods', 'sf_favorite_recipes', 'sf_exercise_progress', 'sf_training_plans', 'sf_personal_records', 'sf_checkins', 'sf_weights', 'sf_measurements', 'sf_progress_photos', 'sf_weekly_reports', 'sf_ai_messages', 'sf_ai_memory', 'sf_notification_prefs', 'sf_push_subscriptions', 'sf_targets']) {
          const r = await supabase.from(tb).delete().eq('user_id', uid); if (r.error) throw r.error; }
        const r = await supabase.from('sf_profiles').delete().eq('id', uid); if (r.error) throw r.error; setDel(false); await refresh(); })}>Delete permanently</Busy></Modal>}
  </div>;
}
