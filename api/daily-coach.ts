// GET /api/daily-coach — run once a day by Vercel Cron (see vercel.json).
// Sends each opted-in user a short personalised push message written by the AI (Groq) from yesterday's data.
// Requires: GROQ_API_KEY (optional GROQ_MODEL), SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VAPID_PUBLIC_KEY (or VITE_VAPID_PUBLIC_KEY),
// VAPID_PRIVATE_KEY, CRON_SECRET (Vercel sends it as "Authorization: Bearer <CRON_SECRET>").
import type { IncomingMessage, ServerResponse } from 'node:http';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const config = { maxDuration: 60 };
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const BACKUP = ['openai/gpt-oss-120b', 'llama-3.1-8b-instant'];

function send(res: ServerResponse, status: number, body: unknown) { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); }
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const FALLBACK: Record<string, string> = {
  en: 'Good morning! A glass of water, a balanced breakfast and a short walk are a great start today.',
  fr: 'Bonjour ! Un verre d’eau, un petit-déjeuner équilibré et une courte marche : un bon début de journée.',
  ar: 'صباح الخير! كوب ماء وفطور متوازن ومشي قصير بداية رائعة لليوم.',
  dar: 'صباح الخير! كاس د الما، فطور متوازن وتمشية صغيرة، بداية زوينة لهاد النهار.',
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'unauthorized' });
  const url = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '');
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY; const priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !service || !pub || !priv) return send(res, 503, { error: 'not_configured' });
  webpush.setVapidDetails('mailto:noreply@myfit.app', pub, priv);
  const db = createClient(url, service, { auth: { persistSession: false } });
  const ai = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

  const { data: prefs } = await db.from('user_preferences').select('id,coach_consent').eq('coach_push_enabled', true);
  const users = (prefs ?? []).map(p => ({ id: p.id as string, consent: !!p.coach_consent }));
  const yesterday = isoDay(new Date(Date.now() - 86400000));
  let sent = 0, removed = 0;

  async function forUser(u: { id: string; consent: boolean }) {
    const { data: subs } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', u.id);
    if (!subs?.length) return;
    const { data: profile } = await db.from('profiles').select('name,language,goal,age,pregnant,breastfeeding,medical_supervision,eating_disorder_history,walk_goal_min').eq('id', u.id).maybeSingle();
    let body = FALLBACK.ar;
    if (ai && u.consent) {
      const [{ data: diary }, { data: water }, { data: acts }, { data: goal }] = await Promise.all([
        db.from('diary_entries').select('meal,kcal,added_sugar').eq('user_id', u.id).eq('date', yesterday),
        db.from('water_logs').select('ml').eq('user_id', u.id).eq('date', yesterday),
        db.from('activity_logs').select('minutes,steps,kcal_burned').eq('user_id', u.id).eq('date', yesterday),
        db.from('nutrition_goals').select('kcal,water_ml').eq('user_id', u.id).order('computed_on', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const sum = (rows: any[] | null, k: string) => Math.round((rows ?? []).reduce((a, r) => a + (Number(r[k]) || 0), 0));
      const facts = {
        name: profile?.name, goal: profile?.goal,
        individual_guidance_needed: !!(profile?.pregnant || profile?.breastfeeding || profile?.medical_supervision || profile?.eating_disorder_history || (profile?.age ?? 30) < 18),
        yesterday: { meals_logged: (diary ?? []).length, kcal: sum(diary, 'kcal'), added_sugar_g: sum(diary, 'added_sugar'), water_ml: sum(water, 'ml'), walk_min: sum(acts, 'minutes'), steps: sum(acts, 'steps') },
        targets: { kcal: goal?.kcal ?? null, water_ml: goal?.water_ml ?? null, walk_min: profile?.walk_goal_min ?? 30 },
      };
      try {
        const req = (model: string) => ai.chat.completions.create({
          model, max_completion_tokens: 200, temperature: 0.6,
          messages: [
            { role: 'system', content: `You write one short morning push notification for the MyFit nutrition app. Language: Arabic (simple Modern Standard Arabic, Arabic script). Max 160 characters, warm, specific to the data, one concrete tip for today (food, water or walking). No guilt, no shaming, never suggest eating less to compensate, skipping meals or burning calories off. If individual_guidance_needed is true, do not mention weight loss or calorie targets. If no meals were logged, just encourage gently. Output only the message text, without quotes.` },
            { role: 'user', content: JSON.stringify(facts) },
          ],
        });
        let msg; try { msg = await req(MODEL); } catch (e) { if (e instanceof Groq.NotFoundError || e instanceof Groq.BadRequestError) msg = await req(BACKUP[0]).catch(() => req(BACKUP[1])); else throw e; }
        const t = (msg.choices[0]?.message?.content ?? '').trim().replace(/^["“]|["”]$/g, '');
        if (t) body = t.slice(0, 220);
      } catch (e) { console.error('daily-coach ai', e instanceof Groq.APIError ? e.status : e); }
    }
    const payload = JSON.stringify({ title: 'MyFit', body, url: '/coach' });
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 }); sent++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from('push_subscriptions').delete().eq('id', s.id); removed++; } else console.error('push', e?.statusCode); }
    }
    await db.from('notifications').insert({ user_id: u.id, type: 'coach', title: 'MyFit', body, read: false });
  }

  for (let i = 0; i < users.length; i += 5) await Promise.all(users.slice(i, i + 5).map(u => forUser(u).catch(e => console.error('user', e))));
  send(res, 200, { users: users.length, sent, removed });
}
