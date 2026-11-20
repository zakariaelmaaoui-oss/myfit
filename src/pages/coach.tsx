import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { backend } from '../lib/store';
import { addDays, isoDate, lastNDays, round, sumNutrients } from '../lib/nutrition';
import { Icon, Page, errMsg } from '../components/ui';

const SUGGEST: Record<string, string[]> = {
  en: ['What should I eat for dinner tonight?', 'Is harira good for weight loss?', 'A cheap high-protein breakfast?', 'How can I drink less sugar in my tea?'],
  fr: ['Que manger ce soir ?', 'La harira est-elle bonne pour perdre du poids ?', 'Un petit-déjeuner protéiné pas cher ?', 'Comment réduire le sucre dans mon thé ?'],
  ar: ['ماذا آكل في العشاء الليلة؟', 'هل الحريرة مناسبة لإنقاص الوزن؟', 'فطور غني بالبروتين وبثمن قليل؟', 'كيف أقلل السكر في الشاي؟'],
  dar: ['شنو ناكل فالعشا اليوم؟', 'واش الحريرة مزيانة باش ننقص الوزن؟', 'فطور فيه البروتين وما غاليش؟', 'كيفاش ننقص السكر فأتاي؟'],
};

/** Summary of the user's own data sent with each question (no free-text health notes). */
function useCoachContext() {
  const { profile, targets, data, dayTotals } = useApp(); const { lang } = useI18n();
  return useMemo(() => {
    const today = isoDate(); const tot = dayTotals(today);
    const acts = data.activity_logs.filter(a => a.date === today);
    const week = lastNDays(7).map(d => data.diary_entries.filter(e => e.date === d));
    const logged = week.filter(w => w.length);
    const avgKcal = logged.length ? round(logged.map(w => sumNutrients(w.map(r => ({ kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: r.sugar, addedSugar: r.added_sugar }))).totals.kcal).reduce((a, b) => a + b, 0) / logged.length) : null;
    return {
      profile: profile ? { name: profile.name, age: profile.age, sex: profile.sex, height_cm: profile.height_cm, weight_kg: profile.weight_kg, target_weight_kg: profile.target_weight_kg,
        goal: profile.goal, activity: profile.activity, diet: profile.diet_prefs, allergies: profile.allergies, restrictions: profile.restrictions, country: profile.country,
        budget_mad: profile.budget_mad, budget_period: profile.budget_period } : null,
      needs_individual_guidance: targets?.restrictions ?? [],
      targets: targets ? { kcal: targets.kcal, protein_g: targets.protein, carbs_g: targets.carbs, fat_g: targets.fat, fiber_g: targets.fiber, water_ml: targets.waterMl, added_sugar_max_g: targets.addedSugarMaxG } : null,
      today: { kcal: tot.totals.kcal, protein_g: tot.totals.protein, carbs_g: tot.totals.carbs, fat_g: tot.totals.fat, sugar_g: tot.totals.sugar, added_sugar_g: tot.totals.addedSugar,
        meals: data.diary_entries.filter(e => e.date === today).slice(0, 20).map(e => ({ meal: e.meal, name: e.name, kcal: e.kcal })),
        water_ml: data.water_logs.filter(w => w.date === today).reduce((a, w) => a + Number(w.ml), 0),
        walk_min: acts.reduce((a, x) => a + Number(x.minutes), 0), steps: acts.reduce((a, x) => a + (Number(x.steps) || 0), 0), kcal_burned_walking: acts.reduce((a, x) => a + (Number(x.kcal_burned) || 0), 0) },
      last7_days: { days_with_meals: logged.length, avg_kcal_logged_days: avgKcal },
      yesterday_logged: data.diary_entries.some(e => e.date === addDays(today, -1)),
      app_language: lang,
    };
  }, [profile, targets, data, lang]); // eslint-disable-line
}

export function Coach() {
  const { t, lang } = useI18n(); const { mode, prefs, savePrefs, data, reload, removeWhere, toast } = useApp();
  const ctx = useCoachContext();
  const [input, setInput] = useState(''); const [busy, setBusy] = useState(false); const [pending, setPending] = useState<{ q: string; a: string } | null>(null); const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const history = [...data.ai_messages].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [history.length, pending?.a]);

  const ask = async (q: string) => {
    q = q.trim(); if (!q || busy) return;
    setErr(''); setBusy(true); setInput(''); setPending({ q, a: '' });
    try {
      const token = await backend.accessToken();
      const res = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ message: q, lang, context: ctx }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({})); throw new Error(t('coach.err.' + (j.error ?? 'coach_error')));
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let answer = '';
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).replace(/^data: /, ''); buf = buf.slice(i + 2);
          try { const ev = JSON.parse(line); if (ev.t) { answer += ev.t; setPending({ q, a: answer }); } if (ev.error) throw new Error(t('coach.err.' + ev.error) + (ev.detail ? ` (${ev.detail})` : '')); } catch (e) { if (e instanceof Error && !(e instanceof SyntaxError)) throw e; }
        }
      }
      await reload();
    } catch (e) { setErr(errMsg(e)); await reload().catch(() => {}); }
    finally { setPending(null); setBusy(false); }
  };

  if (mode === 'local') return <Page title={t('coach.title')} back><section className="card stack"><p>{t('coach.needOnline')}</p></section></Page>;
  if (!prefs.coach_consent) return <Page title={t('coach.title')} back>
    <section className="card coachhero stack"><span className="coachavatar">✨</span><h2>{t('coach.introTitle')}</h2><p className="small">{t('coach.introText')}</p></section>
    <section className="card stack small"><h3>{t('coach.privacyTitle')}</h3>
      <ul className="stack tight" style={{ margin: 0, paddingInlineStart: 18 }}><li>{t('coach.p1')}</li><li>{t('coach.p2')}</li><li>{t('coach.p3')}</li><li>{t('coach.p4')}</li></ul>
      <button className="btn primary" onClick={() => savePrefs({ coach_consent: true, coach_consent_at: new Date().toISOString() } as any)}>{t('coach.agree')}</button></section>
  </Page>;

  return <Page title={t('coach.title')} back actions={history.length ? <button className="iconbtn" aria-label={t('coach.clear')} onClick={async () => { await removeWhere('ai_messages', 'role', 'user'); await removeWhere('ai_messages', 'role', 'assistant'); toast(t('coach.cleared'), 'ok'); }}><Icon n="trash" s={18} /></button> : undefined}>
    <div className="chat" data-testid="chat">
      {!history.length && !pending && <section className="card coachhero stack"><span className="coachavatar">✨</span><h2>{t('coach.hello', { name: ctx.profile?.name ?? '' })}</h2><p className="small">{t('coach.helloText')}</p></section>}
      {history.map(m => <div key={m.id} dir="auto" className={`bubble ${m.role === 'user' ? 'me' : 'bot'}`}>{m.content}</div>)}
      {pending && <><div className="bubble me" dir="auto">{pending.q}</div><div className="bubble bot" dir="auto" aria-live="polite">{pending.a || <span className="typing"><i /><i /><i /></span>}</div></>}
      <div ref={end} />
    </div>
    {err && <p className="err" role="alert">{err}</p>}
    {!busy && <div className="chips scroll-x" style={{ flexWrap: 'nowrap', paddingBottom: 4 }}>{(SUGGEST[lang] ?? SUGGEST.en).map(s => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>}
    <form className="chatbar" onSubmit={e => { e.preventDefault(); ask(input); }}>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('coach.placeholder')} aria-label={t('coach.placeholder')} maxLength={2000} disabled={busy} />
      <button className="sendbtn" disabled={busy || !input.trim()} aria-label={t('coach.send')}><Icon n="next" s={20} className="flip" sw={2.4} /></button>
    </form>
    <p className="tiny muted center">{t('coach.disclaimer')} <Link to="/profile/notifications">{t('coach.pushLink')}</Link></p>
  </Page>;
}
