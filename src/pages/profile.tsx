import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, type Profile } from '../lib/app';
import { LANGS, setLang, useI18n, type Lang } from '../lib/i18n';
import { backend, TABLES } from '../lib/store';
import { computeTargets, isoDate } from '../lib/nutrition';
import { ESTIMATE_NOTE, REMINDER_TEXT, t4 } from '../data/content';
import { ProfileFields, validateProfile } from '../components/ProfileFields';
import { Icon, Modal, Page, Seg, errMsg, useFmt } from '../components/ui';
import { notify, requestNotificationPermission } from '../components/Notifier';
import { disablePush, enablePush, isIos, isStandalone, pushSupported } from '../lib/push';

export function ProfileHub() {
  const { t } = useI18n(); const { profile, user, mode } = useApp(); const nav = useNavigate();
  const links = [['/profile/edit', 'user', 'personal'], ['/profile/goals', 'flame', 'goals'], ['/profile/language', 'globe', 'language'], ['/profile/notifications', 'bell', 'notifications'],
    ['/profile/privacy', 'lock', 'privacy'], ['/profile/settings', 'settings', 'settings']];
  return <Page title={t('nav.profile')}>
    <section className="card hero row"><span className="iconbtn" style={{ width: 54, height: 54, borderRadius: 18, background: 'var(--green-dark)', color: '#fff', fontWeight: 800, fontSize: '1.3rem' }}>{(profile?.name ?? '?').slice(0, 1).toUpperCase()}</span>
      <div className="grow"><h2>{profile?.name}</h2><p className="small muted ellipsis">{user?.email}</p><p className="tiny muted">{mode === 'local' ? t('settings.modeLocal') : t('settings.modeCloud')}</p></div></section>
    <section className="card"><div className="list">{links.map(([to, i, k]) => <Link key={to} to={to} className="li"><Icon n={i} /><span className="grow">{t('nav.' + k)}</span><Icon n="next" className="flip" s={16} /></Link>)}</div></section>
    <button className="btn" onClick={async () => { await backend.signOut(); nav('/login'); }}><Icon n="logout" s={18} />{t('auth.logout')}</button>
  </Page>;
}

export function EditProfile() {
  const { t } = useI18n(); const { profile, saveProfile, toast } = useApp(); const nav = useNavigate();
  const [p, setP] = useState<Partial<Profile>>(profile ?? {}); const [err, setErr] = useState('');
  const save = async () => {
    const e = validateProfile(p, 'all', t); if (e) return setErr(e);
    try { await saveProfile({ ...p, consent_at: p.consent_sensitive ? (profile?.consent_at ?? new Date().toISOString()) : null }); toast(t('common.saved'), 'ok'); nav('/profile'); } catch (x) { setErr(errMsg(x)); }
  };
  return <Page title={t('nav.personal')} back>
    {(['personal', 'goals', 'food', 'health'] as const).map(s => <section className="card stack" key={s}><h2>{t('onb.' + s)}</h2><ProfileFields p={p} set={v => setP(x => ({ ...x, ...v }))} section={s} /></section>)}
    {err && <p className="err" role="alert">{err}</p>}<button className="btn primary" onClick={save}>{t('common.save')}</button>
  </Page>;
}

export function Goals() {
  const { t, lang, nf } = useI18n(); const { profile, targets, saveProfile, insert, data, toast } = useApp(); const fmt = useFmt();
  if (!profile || !targets) return <Page title={t('nav.goals')} back><p>{t('home.noTargets')}</p></Page>;
  const recalc = async () => {
    const tg = computeTargets({ age: profile.age, sex: profile.sex, heightCm: profile.height_cm, weightKg: profile.weight_kg, activity: profile.activity, goal: profile.goal,
      pregnant: profile.pregnant, breastfeeding: profile.breastfeeding, medicalSupervision: profile.medical_supervision, eatingDisorderHistory: profile.eating_disorder_history,
      sugarGuidancePct: profile.sugar_guidance_pct, customAddedSugarG: profile.custom_added_sugar_g, waterGoalMl: profile.water_goal_ml });
    await insert('nutrition_goals', { computed_on: isoDate(), goal: tg.effectiveGoal, bmr: tg.bmr, tdee: tg.tdee, kcal: tg.kcal, protein_g: tg.protein, carbs_g: tg.carbs, fat_g: tg.fat, fiber_g: tg.fiber,
      water_ml: tg.waterMl, added_sugar_max_g: tg.addedSugarMaxG, inputs: { age: profile.age, sex: profile.sex, height_cm: profile.height_cm, weight_kg: profile.weight_kg, activity: profile.activity, goal: profile.goal } });
    toast(t('calc.saved'), 'ok');
  };
  const last = [...data.nutrition_goals].sort((a, b) => (b.computed_on ?? '').localeCompare(a.computed_on ?? ''))[0];
  return <Page title={t('nav.goals')} back>
    <section className="card stack"><h2>{t('p.goal')}</h2><div className="chips">{['lose', 'maintain', 'healthy', 'muscle'].map(g => <button key={g} className={`chip ${profile.goal === g ? 'on' : ''}`} onClick={() => saveProfile({ goal: g })}>{t('goal.' + g)}</button>)}</div>
      <label className="field">{t('p.activity')}<select value={profile.activity} onChange={e => saveProfile({ activity: e.target.value })}>{['sedentary', 'light', 'moderate', 'active', 'very_active'].map(a => <option key={a} value={a}>{t('act.' + a)}</option>)}</select></label>
      {targets.restrictions.length > 0 && <div className="card warn small stack tight">{targets.restrictions.map(r => <p key={r}>{t('calc.restricted.' + r)}</p>)}</div>}
      {targets.floorApplied && <p className="small muted">{t('calc.floor')}</p>}</section>
    {targets.kcal !== null ? <section className="card"><h2>{t('calc.results')}</h2><dl className="kv" data-testid="calc-results" style={{ marginTop: 10 }}>
      <dt>{t('calc.bmr')}</dt><dd>{fmt(targets.bmr, 'kcal')}</dd><dt>{t('calc.tdee')}</dt><dd>{fmt(targets.tdee, 'kcal')}</dd>
      {targets.deficit > 0 && <><dt>{t('calc.deficit')}</dt><dd>−{fmt(targets.deficit, 'kcal')}</dd></>}
      <dt><b>{t('calc.target')}</b></dt><dd data-testid="calc-target">{fmt(targets.kcal, 'kcal')}</dd>
      <dt>{t('n.protein')}</dt><dd>{fmt(targets.protein, 'g', false, 0)}</dd><dt>{t('n.carbs')}</dt><dd>{fmt(targets.carbs, 'g', false, 0)}</dd><dt>{t('n.fat')}</dt><dd>{fmt(targets.fat, 'g', false, 0)}</dd>
      <dt>{t('n.fiber')}</dt><dd>{fmt(targets.fiber, 'g', false, 0)}</dd><dt>{t('calc.water')}</dt><dd>{nf(targets.waterMl / 1000, 2)} L</dd>
      <dt>{t('calc.addedMax')}</dt><dd>{fmt(targets.addedSugarMaxG, 'g', false, 0)}</dd><dt>BMI</dt><dd>{nf(targets.bmi, 1)}</dd>
    </dl></section> : <section className="card warn small">{t('calc.restricted.minor')}</section>}
    <section className="card stack"><h3>{t('calc.how')}</h3><ul className="small stack tight" style={{ margin: 0, paddingInlineStart: 18 }}>{['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'].map(k => <li key={k}>{t('calc.' + k)}</li>)}</ul>
      <p className="small muted">{t4(ESTIMATE_NOTE, lang)}</p>
      <button className="btn" onClick={recalc}>{t('calc.recalc')}</button>{last && <p className="tiny muted">{t('calc.lastSaved', { d: last.computed_on, k: nf(last.kcal) })}</p>}</section>
  </Page>;
}

export function Language() {
  const { t, lang } = useI18n(); const { saveProfile } = useApp();
  return <Page title={t('nav.language')} back><section className="card"><div className="list">{LANGS.map(l => <button key={l.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', width: '100%', textAlign: 'start' }}
    onClick={async () => { setLang(l.id); await saveProfile({ language: l.id as Lang }); }}><span className="grow">{l.label}</span>{lang === l.id && <Icon n="check" />}</button>)}</div></section>
    <p className="small muted">{t('lang.darijaNote')}</p></Page>;
}

export function Notifications() {
  const { t, lang, df } = useI18n(); const { prefs, savePrefs, data, update, remove, toast } = useApp();
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const setR = (i: number, patch: any) => savePrefs({ reminders: prefs.reminders.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const inbox = [...data.notifications].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 30);
  return <Page title={t('nav.notifications')} back>
    <section className="card stack">
      <label className="check"><input type="checkbox" checked={prefs.notifications_enabled} onChange={async e => { if (e.target.checked) setPerm(await requestNotificationPermission()); await savePrefs({ notifications_enabled: e.target.checked }); }} />{t('notif.enable')}</label>
      <p className="tiny muted">{perm === 'granted' ? t('notif.permGranted') : perm === 'denied' ? t('notif.permDenied') : perm === 'unsupported' ? t('notif.unsupported') : t('notif.permAsk')}</p>
      <p className="tiny muted">{t('notif.openNote')}</p>
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => { notify(t('notif.testTitle'), t4(REMINDER_TEXT.water, lang)); toast(t4(REMINDER_TEXT.water, lang)); }}>{t('notif.test')}</button>
    </section>
    <CoachPush />
    <section className="card stack"><h2>{t('notif.reminders')}</h2>{prefs.reminders.map((r, i) => <div className="row" key={i}>
      <input type="checkbox" checked={r.enabled} onChange={e => setR(i, { enabled: e.target.checked })} aria-label={t('notif.type.' + r.type)} />
      <span className="grow small">{t('notif.type.' + r.type)}</span>
      <input type="time" value={r.time} onChange={e => setR(i, { time: e.target.value })} style={{ maxWidth: 120 }} aria-label={t('notif.time')} />
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => savePrefs({ reminders: prefs.reminders.filter((_, k) => k !== i) })}><Icon n="trash" s={15} /></button></div>)}
      <div className="row wrap">{['water', 'walk', 'meals', 'mealprep', 'habits', 'report'].map(ty => <button key={ty} className="btn sm soft" onClick={() => savePrefs({ reminders: [...prefs.reminders, { type: ty, time: '12:00', enabled: true }] })}>+ {t('notif.type.' + ty)}</button>)}</div>
      <label className="field">{t('notif.reportDay')}<select value={prefs.weekly_report_day} onChange={e => savePrefs({ weekly_report_day: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{df(`2026-11-${15 + d}`, { weekday: 'long' }) /* 15 Nov 2026 is a Sunday (d = 0) */}</option>)}</select></label></section>
    <section className="card stack"><h2>{t('notif.alerts')}</h2>
      <label className="check"><input type="checkbox" checked={prefs.calorie_excess_alert} onChange={e => savePrefs({ calorie_excess_alert: e.target.checked })} />{t('notif.calorie')}</label>
      <label className="check"><input type="checkbox" checked={prefs.sugar_alert} onChange={e => savePrefs({ sugar_alert: e.target.checked })} />{t('notif.sugar')}</label></section>
    <section className="card stack"><h2>{t('notif.quiet')}</h2><div className="grid2"><label className="field">{t('notif.from')}<input type="time" value={prefs.quiet_start} onChange={e => savePrefs({ quiet_start: e.target.value })} /></label>
      <label className="field">{t('notif.to')}<input type="time" value={prefs.quiet_end} onChange={e => savePrefs({ quiet_end: e.target.value })} /></label></div></section>
    <section className="card"><h2>{t('notif.inbox')}</h2>{inbox.length ? <div className="list">{inbox.map(n => <div className="li" key={n.id} style={{ opacity: n.read ? .6 : 1 }}>
      <div className="grow"><div className="small">{n.body}</div><div className="tiny muted">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div></div>
      {!n.read && <button className="iconbtn" aria-label={t('notif.markRead')} onClick={() => update('notifications', n.id, { read: true })}><Icon n="check" s={15} /></button>}
      <button className="iconbtn" aria-label={t('common.delete')} onClick={() => remove('notifications', n.id)}><Icon n="trash" s={15} /></button></div>)}</div> : <p className="small muted">{t('notif.none')}</p>}</section>
  </Page>;
}

export function Privacy() {
  const { t } = useI18n(); const { data, user, profile, saveProfile, mode, prefs, savePrefs, removeWhere } = useApp(); const nav = useNavigate();
  const [del, setDel] = useState(false); const [confirm, setConfirm] = useState(''); const [err, setErr] = useState('');
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), app: 'MyFit', user: { id: user?.id, email: user?.email }, data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `myfit-export-${isoDate()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const count = TABLES.reduce((a, tb) => a + data[tb].length, 0);
  return <Page title={t('nav.privacy')} back>
    <section className="card stack"><h2>{t('privacy.where')}</h2><p className="small">{mode === 'local' ? t('privacy.local') : t('privacy.cloud')}</p></section>
    <section className="card stack"><h2>{t('privacy.consents')}</h2>
      <label className="check"><input type="checkbox" checked={!!profile?.consent_sensitive} onChange={e => saveProfile({ consent_sensitive: e.target.checked, consent_at: e.target.checked ? new Date().toISOString() : null, ...(e.target.checked ? {} : { enable_period: false, enable_sleep: false, pregnant: false, breastfeeding: false, medical_supervision: false, eating_disorder_history: false, health_notes: '' }) })} /><span className="small">{t('p.consent')}</span></label>
      <label className="check"><input type="checkbox" checked={profile?.track_weight !== false} onChange={e => saveProfile({ track_weight: e.target.checked })} />{t('p.trackWeight')}</label>
      <p className="tiny muted">{t('privacy.withdraw')}</p>{profile?.consent_at && <p className="tiny muted">{t('privacy.consentAt', { d: new Date(profile.consent_at).toLocaleDateString() })}</p>}</section>
    <section className="card stack"><h2>{t('coach.title')}</h2><p className="small muted">{t('coach.privacyShort')}</p>
      {prefs.coach_consent ? <button className="btn" onClick={async () => { await removeWhere('ai_messages', 'role', 'user'); await removeWhere('ai_messages', 'role', 'assistant'); await savePrefs({ coach_consent: false, coach_consent_at: null, coach_push_enabled: false } as any); }}>{t('coach.revoke')}</button>
        : <p className="small">{t('coach.notEnabled')}</p>}</section>
    <section className="card stack"><h2>{t('privacy.export')}</h2><p className="small muted">{t('privacy.exportInfo', { n: count })}</p><button className="btn" onClick={exportData}><Icon n="download" s={18} />{t('privacy.exportBtn')}</button></section>
    <section className="card stack"><h2>{t('privacy.delete')}</h2><p className="small muted">{t('privacy.deleteInfo')}</p><button className="btn danger" onClick={() => setDel(true)}><Icon n="trash" s={18} />{t('privacy.deleteBtn')}</button></section>
    <Modal open={del} onClose={() => setDel(false)} title={t('privacy.delete')}><p className="small">{t('privacy.deleteConfirm')}</p>
      <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="DELETE" aria-label="DELETE" />{err && <p className="err">{err}</p>}
      <button className="btn danger" disabled={confirm !== 'DELETE'} onClick={async () => { try { await backend.deleteAccount(user!.id); nav('/login'); } catch (e) { setErr(errMsg(e)); } }}>{t('privacy.deleteBtn')}</button></Modal>
  </Page>;
}

export function Settings() {
  const { t } = useI18n(); const { prefs, savePrefs, mode, toast } = useApp(); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const theme = prefs.theme ?? 'system';
  const setTheme = (v: 'system' | 'light' | 'dark') => { savePrefs({ theme: v }); applyTheme(v); };
  return <Page title={t('nav.settings')} back>
    <section className="card stack"><h2>{t('settings.theme')}</h2><Seg value={theme} onChange={setTheme} options={[{ id: 'system', label: t('settings.system') }, { id: 'light', label: t('settings.light') }, { id: 'dark', label: t('settings.dark') }]} /></section>
    <section className="card stack"><h2>{t('settings.password')}</h2><input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder={t('auth.newPassword')} aria-label={t('auth.newPassword')} />
      {err && <p className="err">{err}</p>}<button className="btn" onClick={async () => { setErr(''); if (pw.length < 8) return setErr(t('auth.pwShort')); try { await backend.updatePassword(pw); setPw(''); toast(t('common.saved'), 'ok'); } catch (e) { setErr(errMsg(e)); } }}>{t('common.save')}</button></section>
    <section className="card stack"><h2>{t('settings.about')}</h2><p className="small">{t('settings.aboutText')}</p>
      <ul className="small stack tight" style={{ margin: 0, paddingInlineStart: 18 }}><li>{t('settings.src1')}</li><li>{t('settings.src2')}</li><li>{t('settings.src3')}</li><li>{t('settings.src4')}</li></ul>
      <p className="tiny muted">{t('settings.noAI')}</p><p className="tiny muted">MyFit 1.0.0 · {mode === 'local' ? t('settings.modeLocal') : t('settings.modeCloud')}</p></section>
    <section className="card stack small"><h2>{t('settings.disclaimer')}</h2><p>{t('settings.disclaimerText')}</p></section>
  </Page>;
}
export function applyTheme(v?: string) { const r = document.documentElement; if (!v || v === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', v); }

function CoachPush() {
  const { t } = useI18n(); const { prefs, savePrefs, insert, removeWhere, mode, toast } = useApp(); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const toggle = async (on: boolean) => {
    setBusy(true); setMsg('');
    try {
      if (on) {
        const r = await enablePush(insert);
        if (r !== 'ok') { setMsg(t('push.' + r)); return; }
        await savePrefs({ coach_push_enabled: true }); toast(t('push.enabled'), 'ok');
      } else { await disablePush(removeWhere); await savePrefs({ coach_push_enabled: false }); }
    } catch (e) { setMsg(errMsg(e)); } finally { setBusy(false); }
  };
  return <section className="card stack" data-testid="coach-push"><h2>✨ {t('push.title')}</h2>
    <p className="small muted">{t('push.text')}</p>
    {mode === 'local' ? <p className="small">{t('coach.needOnline')}</p> : <>
      <label className="check"><input type="checkbox" disabled={busy} checked={!!prefs.coach_push_enabled} onChange={e => toggle(e.target.checked)} />{t('push.toggle')}</label>
      {!prefs.coach_consent && <p className="tiny muted">{t('push.noConsent')} <Link to="/coach">{t('coach.title')}</Link></p>}
      {pushSupported() || <p className="tiny muted">{t('push.unsupported')}</p>}
      {isIos() && !isStandalone() && <p className="tiny muted">{t('push.ios')}</p>}
      {msg && <p className="err">{msg}</p>}</>}
  </section>;
}
