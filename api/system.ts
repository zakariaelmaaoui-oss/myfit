// POST /api/system — THE SYSTEM: AI agent with tool calling over the hunter's real data.
// Body: { message: string, date: 'YYYY-MM-DD' (user's local day), image?: dataURL (food photo) }
// Header: Authorization: Bearer <Supabase access token>. Every tool runs AS the user (RLS).
import type { ServerResponse } from 'node:http';
import Groq from 'groq-sdk';
import { send, readBody, userClient, groqClient, isDate, type Req } from './_lib/server.js';
import type { Ctx } from './_lib/tools.js';
import { runAgent, NotAwakened } from './_lib/agent.js';

export const config = { maxDuration: 60 };
const DAILY_LIMIT = 80;

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const auth = await userClient(req); if ('error' in auth) return send(res, auth.status, { error: auth.error });
  const groq = groqClient(); if (!groq) return send(res, 503, { error: 'ai_not_configured' });
  let body: any; try { body = await readBody(req); } catch { return send(res, 400, { error: 'bad_json' }); }
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  const image = typeof body?.image === 'string' && body.image.startsWith('data:image/') && body.image.length < 4_500_000 ? body.image : null;
  if (!message && !image) return send(res, 400, { error: 'empty_message' });
  const date = isDate(body?.date) ? body.date : new Date().toISOString().slice(0, 10);
  const { sb, uid } = auth; const ctx: Ctx = { sb, uid, date };

  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await sb.from('sf_ai_messages').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) return send(res, 429, { error: 'daily_limit', limit: DAILY_LIMIT });

  try {
    return send(res, 200, await runAgent(groq, ctx, { message, image, time: typeof body?.time === 'string' ? body.time : undefined }));
  } catch (e) {
    if (e instanceof NotAwakened) return send(res, 409, { error: 'not_awakened' });
    console.error('system', e instanceof Groq.APIError ? `${e.status} ${e.message}` : e);
    if (e instanceof Groq.RateLimitError) return send(res, 429, { error: 'ai_busy' });
    if (e instanceof Groq.AuthenticationError) return send(res, 503, { error: 'ai_key_invalid' });
    return send(res, 500, { error: 'system_error' });
  }
}
