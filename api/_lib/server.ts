// Shared server helpers (files under api/_lib are not deployed as endpoints).
// Secrets live ONLY in Vercel environment variables: GROQ_API_KEY, (optional) GROQ_MODEL, GROQ_VISION_MODEL,
// SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, CRON_SECRET. The browser never sees them.
import type { IncomingMessage, ServerResponse } from 'node:http';
import Groq from 'groq-sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Req = IncomingMessage & { body?: unknown; query?: Record<string, string> };
export function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body));
}
export async function readBody(req: Req): Promise<any> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export const supabaseUrl = () => (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '');
const anonKey = () => process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

/** Supabase client acting AS the signed-in user (RLS applies), from the bearer token the browser sends. */
export async function userClient(req: Req): Promise<{ sb: SupabaseClient; uid: string } | { error: string; status: number }> {
  const url = supabaseUrl(); const anon = anonKey();
  if (!url || !anon) return { error: 'database_not_configured', status: 503 };
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'not_signed_in', status: 401 };
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.auth.getUser(token);
  if (!data?.user) return { error: 'not_signed_in', status: 401 };
  return { sb, uid: data.user.id };
}
export function serviceClient(): SupabaseClient | null {
  const url = supabaseUrl(); const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

const PREFERRED = [process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter(Boolean) as string[];
let cached: string | null = null;
/** Groq renames/retires models; pick the first preferred one this key can use. */
export async function chatModel(groq: Groq): Promise<string> {
  if (cached) return cached;
  try {
    const ids = new Set((await groq.models.list()).data.map(m => m.id));
    cached = PREFERRED.find(id => ids.has(id)) ?? [...ids].find(id => /gpt-oss|llama|qwen/i.test(id) && !/guard|whisper|orpheus/i.test(id)) ?? PREFERRED[0];
  } catch { cached = PREFERRED[0]; }
  return cached;
}
export const visionModel = () => process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
export const groqClient = () => (process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null);
export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
