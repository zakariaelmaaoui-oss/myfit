// Calls to the server functions (the AI key stays on the server).
import { token } from '../lib/supabase';
import { isoDate } from '../lib/nutrition';
export class ApiError extends Error { constructor(public code: string, public status: number) { super(code); } }
export async function api<T = any>(path: string, body: unknown): Promise<T> {
  const t = await token(); if (!t) throw new ApiError('not_signed_in', 401);
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(j.error ?? 'error', r.status);
  return j as T;
}
export const localTime = () => new Date().toTimeString().slice(0, 5);
export const today = () => isoDate();
