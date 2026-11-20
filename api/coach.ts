// POST /api/coach — MyFit Coach chat (Claude), streamed as Server-Sent Events.
// Requires: ANTHROPIC_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (Vercel env vars).
// The caller must send its Supabase access token; all reads/writes run as that user (RLS applies).
import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const MODEL = 'claude-opus-5-5';
const DAILY_LIMIT = 40;
const LANG_NAME: Record<string, string> = { en: 'English', fr: 'French', ar: 'Modern Standard Arabic', dar: 'Moroccan Darija (write it the way the user writes it: Arabic script or Latin letters/numbers like "3" and "7")' };

const SYSTEM = `You are MyFit Coach, the friendly nutrition and healthy-lifestyle coach inside the MyFit app (users are mostly in Morocco; many prefer Moroccan dishes, local markets and a modest budget).

What you do:
- Answer questions about food, meals, recipes, portions, calories, sugar, hydration, walking and simple home exercise, sleep, and building healthy habits.
- Use the user's own data from the app (given below as JSON) when it helps: today's intake, targets, water, steps and walking. Those numbers are estimates; say so when it matters.
- Prefer practical, affordable suggestions with familiar foods (e.g. lentils, eggs, sardines, seasonal vegetables, harira, tagine with more vegetables, bread portions, mint tea with less sugar).
- Keep answers short: usually 3–8 short lines or bullets, plain text, no tables, no markdown headings. Ask one clarifying question if you really need it.

Safety rules (always):
- You are not a doctor. Do not diagnose, do not prescribe or adjust medication, and do not give treatment plans for diabetes, kidney disease, pregnancy complications or other conditions — suggest talking to a doctor or registered dietitian.
- Never suggest starving, skipping meals, very-low-calorie diets (below about 1200 kcal/day for women or 1500 for men), fasting to compensate, laxatives, "detox" products, diet pills, or exercising to "burn off" or punish eating.
- No guilt, shame or moralising about food or body weight. Be warm and encouraging.
- If the user is under 18, pregnant or breastfeeding, do not give weight-loss advice; focus on balanced eating and suggest a professional.
- If the user mentions binge eating, purging, loss of control around food, self-harm or severe distress, respond with care, avoid numbers and calorie talk, and encourage them to reach a doctor, psychologist or someone they trust; in an emergency, local emergency services.
- Do not invent facts. If you are not sure of a nutrition value, give a range and say it is approximate.`;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body));
}
async function readBody(req: IncomingMessage & { body?: unknown }): Promise<any> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function supabaseUrl() { return (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, ''); }

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const url = supabaseUrl(); const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return send(res, 503, { error: 'database_not_configured' });
  if (!token) return send(res, 401, { error: 'not_signed_in' });
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: auth } = await sb.auth.getUser(token);
  const user = auth?.user; if (!user) return send(res, 401, { error: 'not_signed_in' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'coach_not_configured' });

  let body: any; try { body = await readBody(req); } catch { return send(res, 400, { error: 'bad_json' }); }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) return send(res, 400, { error: 'bad_message' });
  const lang = ['en', 'fr', 'ar', 'dar'].includes(body?.lang) ? body.lang : 'en';
  const context = JSON.stringify(body?.context ?? {}).slice(0, 6000);

  const { data: prefs } = await sb.from('user_preferences').select('coach_consent').eq('id', user.id).maybeSingle();
  if (!prefs?.coach_consent) return send(res, 403, { error: 'consent_required' });

  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await sb.from('ai_messages').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) return send(res, 429, { error: 'daily_limit', limit: DAILY_LIMIT });

  const { data: hist } = await sb.from('ai_messages').select('role,content').order('created_at', { ascending: false }).limit(20);
  const history: Anthropic.Beta.BetaMessageParam[] = (hist ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  while (history.length && history[0].role !== 'user') history.shift(); // the API needs a user turn first
  const { error: insErr } = await sb.from('ai_messages').insert({ user_id: user.id, role: 'user', content: message });
  if (insErr) return send(res, 500, { error: 'save_failed' });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('X-Accel-Buffering', 'no');
  const emit = (o: unknown) => res.write(`data: ${JSON.stringify(o)}\n\n`);

  const client = new Anthropic();
  let text = '';
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Reply in ${LANG_NAME[lang]} unless the user clearly writes in another language; then reply in that language.\nToday: ${new Date().toISOString().slice(0, 10)}.\nUser data from the app (JSON):\n${context}` },
      ],
      messages: [...history, { role: 'user', content: message }],
    });
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { text += ev.delta.text; emit({ t: ev.delta.text }); }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal' && !text.trim()) {
      text = lang === 'fr' ? 'Je ne peux pas répondre à cette question. Pour un avis médical, parlez à un professionnel de santé.'
        : lang === 'ar' || lang === 'dar' ? 'ما نقدرش نجاوب على هاد السؤال. للاستشارة الطبية، تواصلي مع مختص صحي.'
        : 'I can’t help with that question. For medical advice, please talk to a healthcare professional.';
      emit({ t: text });
    }
    if (text.trim()) await sb.from('ai_messages').insert({ user_id: user.id, role: 'assistant', content: text.slice(0, 8000) });
    emit({ done: true });
  } catch (e) {
    console.error('coach error', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    const code = e instanceof Anthropic.RateLimitError ? 'busy' : e instanceof Anthropic.AuthenticationError ? 'coach_not_configured' : 'coach_error';
    emit({ error: code });
  }
  res.end();
}
