// GET /api/notify — sends due motivation pushes (morning / pre-workout / evening) in each hunter's local time.
// Call it hourly (GitHub Actions workflow .github/workflows/notify.yml) and/or daily (Vercel cron).
// Requires: SUPABASE_SERVICE_ROLE_KEY, VITE_VAPID_PUBLIC_KEY (or VAPID_PUBLIC_KEY), VAPID_PRIVATE_KEY, CRON_SECRET.
import type { ServerResponse } from 'node:http';
import webpush from 'web-push';
import { send, serviceClient, type Req } from './_lib/server.js';
import { motivation, PUSH_TITLE, type Slot } from '../src/core/motivation.js';
import { planDayFor, type Plan } from '../src/core/engine.js';

export const config = { maxDuration: 60 };
const hourOf = (hhmm: string) => Number(hhmm.split(':')[0]);
export default async function handler(req: Req, res: ServerResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'unauthorized' });
  const db = serviceClient(); const pub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY; const priv = process.env.VAPID_PRIVATE_KEY;
  if (!db || !pub || !priv) return send(res, 503, { error: 'not_configured' });
  webpush.setVapidDetails('mailto:noreply@shadowfit.app', pub, priv);
  const { data: prefs, error } = await db.from('sf_notification_prefs').select('*').eq('enabled', true);
  if (error) return send(res, 500, { error: error.message });
  let sent = 0, removed = 0;
  for (const p of prefs ?? []) {
    const local = new Date(Date.now() + p.tz_offset_min * 60000); const hour = local.getUTCHours(); const date = local.toISOString().slice(0, 10);
    const due: Slot[] = [];
    if (p.morning && hour === hourOf(p.morning_time)) due.push('morning');
    if (p.pre_workout && hour === (hourOf(p.workout_time) + 23) % 24) due.push('pre_workout');
    if (p.evening && hour === hourOf(p.evening_time)) due.push('evening');
    const last = (p.last_sent ?? {}) as Record<string, string>;
    const slots = due.filter(s => last[s] !== date); if (!slots.length) continue;
    const [{ data: prof }, { data: quests }, { data: plan }, { data: sessions }, { data: subs }] = await Promise.all([
      db.from('sf_profiles').select('name,language').eq('id', p.user_id).maybeSingle(),
      db.from('sf_quests').select('status').eq('user_id', p.user_id).eq('date', date),
      db.from('sf_training_plans').select('*').eq('user_id', p.user_id).eq('active', true).maybeSingle(),
      db.from('sf_workout_sessions').select('status').eq('user_id', p.user_id).eq('date', date),
      db.from('sf_push_subscriptions').select('*').eq('user_id', p.user_id),
    ]);
    if (!prof || !subs?.length) continue;
    const trainingDay = !!planDayFor(plan as Plan | null, date);
    for (const slot of slots) {
      if (slot === 'pre_workout' && !trainingDay) continue;
      const body = motivation(slot, prof.language, { name: prof.name, questsLeft: (quests ?? []).filter(q => q.status !== 'done').length || 0, trainingDay,
        workoutDone: (sessions ?? []).some(s => s.status === 'completed'), proteinLeft: null, kcalLeft: null, streak: 0, waterLeftMl: 0 });
      for (const s of subs) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: PUSH_TITLE[prof.language] ?? 'THE SYSTEM', body, url: slot === 'evening' ? '/system' : slot === 'pre_workout' ? '/workout' : '/' })); sent++; }
        catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from('sf_push_subscriptions').delete().eq('id', s.id); removed++; } }
      }
      last[slot] = date;
    }
    await db.from('sf_notification_prefs').update({ last_sent: last }).eq('user_id', p.user_id);
  }
  return send(res, 200, { ok: true, sent, removed });
}
