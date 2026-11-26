// POST /api/report — weekly AI evaluation. Body: { date: 'YYYY-MM-DD' (today, local), apply?: { delta: number } }
// Computes the week's real statistics, a safe target review, and asks THE SYSTEM for a short evaluation text.
import type { ServerResponse } from 'node:http';
import { send, readBody, userClient, groqClient, isDate, type Req } from './_lib/server.js';
import { complete, replyLanguage } from './_lib/agent.js';
import { weeklyStats, getProfile, applyTargetChange, DbError } from '../src/core/engine.js';
import { reviewTargets } from '../src/core/review.js';
import { startOfWeek, addDays } from '../src/lib/nutrition.js';

export const config = { maxDuration: 30 };
export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const auth = await userClient(req); if ('error' in auth) return send(res, auth.status, { error: auth.error });
  let body: any; try { body = await readBody(req); } catch { return send(res, 400, { error: 'bad_json' }); }
  const today = isDate(body?.date) ? body.date : new Date().toISOString().slice(0, 10);
  const { sb, uid } = auth;
  try {
    const profile = await getProfile(sb, uid); if (!profile) return send(res, 409, { error: 'not_awakened' });
    // the evaluated week = the last complete week (Mon–Sun); on Sunday the current one
    const ws = new Date(today + 'T12:00:00').getDay() === 0 ? startOfWeek(today) : addDays(startOfWeek(today), -7);
    const stats = await weeklyStats(sb, uid, ws);
    const review = reviewTargets({ weights: stats.weights_28d, goal: profile.goal, kcal: stats.target_kcal ?? 2000, bmr: null, sex: profile.sex, weightKg: profile.weight_kg, avgIntake: stats.avg_kcal, daysLogged: stats.days_logged });
    if (body?.apply && review.suggestion !== 'keep') {
      const t = await applyTargetChange(sb, uid, today, review.deltaKcal, `Weekly review: ${review.reason}`);
      return send(res, 200, { applied: true, target: t });
    }
    const { weights_28d, ...pub } = stats;
    let text: string | null = null;
    const groq = groqClient();
    if (groq) {
      try {
        const r = await complete(groq, { temperature: 0.5, max_tokens: 450, messages: [
          { role: 'system', content: `You are THE SYSTEM of SHADOW FIT (fitness RPG). Write the hunter's weekly evaluation in ${replyLanguage('', profile.language)}: 4-6 short lines — what went well, one honest weak point (never shaming), the plan for next week, and the target review. Use ONLY the numbers given. No markdown tables.` },
          { role: 'user', content: JSON.stringify({ name: profile.name, goal: profile.goal, stats: pub, review }) }] });
        text = r.choices[0]?.message?.content ?? null;
      } catch (e) { console.error('report ai', e); }
    }
    const row = { user_id: uid, week_start: ws, stats: { ...pub, review }, text };
    const up = await sb.from('sf_weekly_reports').upsert(row, { onConflict: 'user_id,week_start' }).select().single();
    if (up.error) throw new DbError(up.error.message);
    return send(res, 200, { report: up.data });
  } catch (e) { console.error('report', e); return send(res, e instanceof DbError ? 400 : 500, { error: e instanceof DbError ? e.message : 'report_error' }); }
}
