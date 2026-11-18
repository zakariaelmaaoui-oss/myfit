// Data access layer. Two interchangeable backends:
//  * SupabaseBackend — production (PostgreSQL + Row Level Security + private Storage bucket).
//  * LocalBackend    — "device mode" used when Supabase env vars are not configured (data stays in this browser).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TABLES = ['profiles', 'user_preferences', 'nutrition_goals', 'custom_foods', 'diary_entries', 'favorites', 'meal_plan_items',
  'fridge_items', 'water_logs', 'activity_logs', 'weight_logs', 'mood_journal', 'craving_journal', 'habit_logs', 'sleep_logs',
  'period_logs', 'shopping_items', 'food_prices', 'notifications'] as const;
export type Table = typeof TABLES[number];
/** Tables whose primary key is the user id itself. */
export const SINGLETON: Table[] = ['profiles', 'user_preferences'];

export interface AuthUser { id: string; email: string }
export interface Backend {
  mode: 'supabase' | 'local';
  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (u: AuthUser | null) => void): () => void;
  signUp(email: string, password: string): Promise<{ user: AuthUser | null; needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  list(table: Table, uid: string): Promise<any[]>;
  insert(table: Table, row: any): Promise<any>;
  update(table: Table, id: string, patch: any): Promise<any>;
  upsert(table: Table, row: any): Promise<any>;
  remove(table: Table, id: string): Promise<void>;
  removeWhere(table: Table, uid: string, field: string, value: any): Promise<void>;
  uploadPhoto(uid: string, file: Blob): Promise<string>;
  photoUrl(path: string): Promise<string | null>;
  removePhoto(path: string): Promise<void>;
  deleteAccount(uid: string): Promise<void>;
}

export class ValidationError extends Error {}

// ---------------- validation (shared by both backends) ----------------
const rng = (v: any, min: number, max: number, name: string, nullable = true) => {
  if (v === null || v === undefined || v === '') { if (nullable) return; throw new ValidationError(`${name} is required`); }
  const n = Number(v);
  if (!isFinite(n) || n < min || n > max) throw new ValidationError(`${name} must be between ${min} and ${max}`);
};
export function validate(table: Table, r: any) {
  switch (table) {
    case 'profiles':
      rng(r.age, 13, 120, 'age'); rng(r.height_cm, 100, 250, 'height'); rng(r.weight_kg, 25, 350, 'weight');
      rng(r.target_weight_kg, 25, 350, 'target weight'); rng(r.budget_mad, 0, 1000000, 'budget'); break;
    case 'diary_entries': rng(r.grams, 0.1, 5000, 'quantity', false); rng(r.kcal, 0, 20000, 'kcal'); break;
    case 'custom_foods':
      if (!r.name || String(r.name).trim().length < 1) throw new ValidationError('name is required');
      rng(r.kcal, 0, 900, 'kcal'); for (const k of ['protein', 'carbs', 'fat', 'fiber', 'sugar', 'added_sugar']) rng(r[k], 0, 100, k);
      if (r.sugar != null && r.added_sugar != null && Number(r.added_sugar) > Number(r.sugar)) throw new ValidationError('added sugar cannot exceed total sugar');
      break;
    case 'water_logs': rng(r.ml, 1, 5000, 'water', false); break;
    case 'activity_logs': rng(r.minutes, 0, 1440, 'minutes', false); rng(r.steps, 0, 200000, 'steps'); break;
    case 'weight_logs': rng(r.weight_kg, 25, 350, 'weight'); rng(r.waist_cm, 30, 250, 'waist'); break;
    case 'sleep_logs': rng(r.hours, 0, 24, 'hours', false); rng(r.quality, 1, 5, 'quality'); break;
    case 'fridge_items': rng(r.grams, 0, 100000, 'quantity'); break;
    case 'food_prices': rng(r.price_mad_per_kg, 0, 100000, 'price', false); break;
    case 'craving_journal': rng(r.hunger, 0, 10, 'hunger'); rng(r.stress, 0, 10, 'stress'); break;
    case 'meal_plan_items': rng(r.portions, 0.25, 10, 'portions', false); break;
  }
}

// ---------------- Supabase ----------------
class SupabaseBackend implements Backend {
  mode = 'supabase' as const;
  sb: SupabaseClient;
  constructor(url: string, key: string) { this.sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }); }
  private u(x: any): AuthUser | null { return x ? { id: x.id, email: x.email ?? '' } : null; }
  async getUser() { const { data } = await this.sb.auth.getSession(); return this.u(data.session?.user); }
  onAuthChange(cb: (u: AuthUser | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_e, s) => cb(this.u(s?.user)));
    return () => data.subscription.unsubscribe();
  }
  async signUp(email: string, password: string) {
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
    return { user: this.u(data.session?.user ?? null), needsConfirmation: !data.session };
  }
  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error; return this.u(data.user)!;
  }
  async signOut() { await this.sb.auth.signOut(); }
  async requestPasswordReset(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
  }
  async updatePassword(p: string) { const { error } = await this.sb.auth.updateUser({ password: p }); if (error) throw error; }
  async list(table: Table, uid: string) {
    const col = SINGLETON.includes(table) ? 'id' : 'user_id';
    const out: any[] = []; let from = 0; const page = 1000;
    for (;;) {
      const { data, error } = await this.sb.from(table).select('*').eq(col, uid).range(from, from + page - 1);
      if (error) throw error; out.push(...(data ?? [])); if (!data || data.length < page) break; from += page;
    }
    return out;
  }
  async insert(table: Table, row: any) { validate(table, row); const { data, error } = await this.sb.from(table).insert(row).select().single(); if (error) throw error; return data; }
  async update(table: Table, id: string, patch: any) { validate(table, patch); const { data, error } = await this.sb.from(table).update(patch).eq('id', id).select().single(); if (error) throw error; return data; }
  async upsert(table: Table, row: any) { validate(table, row); const { data, error } = await this.sb.from(table).upsert(row).select().single(); if (error) throw error; return data; }
  async remove(table: Table, id: string) { const { error } = await this.sb.from(table).delete().eq('id', id); if (error) throw error; }
  async removeWhere(table: Table, uid: string, field: string, value: any) { const { error } = await this.sb.from(table).delete().eq('user_id', uid).eq(field, value); if (error) throw error; }
  async uploadPhoto(uid: string, file: Blob) {
    const path = `${uid}/${crypto.randomUUID()}.jpg`;
    const { error } = await this.sb.storage.from('progress-photos').upload(path, file, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error; return path;
  }
  async photoUrl(path: string) { const { data } = await this.sb.storage.from('progress-photos').createSignedUrl(path, 600); return data?.signedUrl ?? null; }
  async removePhoto(path: string) { await this.sb.storage.from('progress-photos').remove([path]); }
  async deleteAccount(uid: string) {
    const { data: files } = await this.sb.storage.from('progress-photos').list(uid);
    if (files?.length) await this.sb.storage.from('progress-photos').remove(files.map(f => `${uid}/${f.name}`));
    const { error } = await this.sb.rpc('delete_my_account'); // deletes auth user; all rows cascade
    if (error) throw error;
    await this.sb.auth.signOut();
  }
}

// ---------------- Local (device) ----------------
const LS = {
  get(k: string) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k: string, v: any) { localStorage.setItem(k, JSON.stringify(v)); },
  del(k: string) { localStorage.removeItem(k); },
};
async function hashPw(pw: string, salt: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const uuid = () => (crypto as any).randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

class LocalBackend implements Backend {
  mode = 'local' as const;
  private listeners = new Set<(u: AuthUser | null) => void>();
  private key(uid: string, t: Table) { return `myfit:${uid}:${t}`; }
  private emit(u: AuthUser | null) { this.listeners.forEach(l => l(u)); }
  private uidOf(row: any, table: Table) { return SINGLETON.includes(table) ? row.id : row.user_id; }
  async getUser() { return LS.get('myfit:session'); }
  onAuthChange(cb: (u: AuthUser | null) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  async signUp(email: string, password: string) {
    email = email.trim().toLowerCase();
    const users = LS.get('myfit:users') || [];
    if (users.find((u: any) => u.email === email)) throw new Error('An account with this email already exists on this device.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    const salt = uuid(); const id = uuid();
    users.push({ id, email, salt, hash: await hashPw(password, salt) });
    LS.set('myfit:users', users);
    const u = { id, email }; LS.set('myfit:session', u); this.emit(u);
    return { user: u, needsConfirmation: false };
  }
  async signIn(email: string, password: string) {
    email = email.trim().toLowerCase();
    const u = (LS.get('myfit:users') || []).find((x: any) => x.email === email);
    if (!u || (await hashPw(password, u.salt)) !== u.hash) throw new Error('Invalid email or password.');
    const s = { id: u.id, email: u.email }; LS.set('myfit:session', s); this.emit(s); return s;
  }
  async signOut() { LS.del('myfit:session'); this.emit(null); }
  async requestPasswordReset(_email: string) {
    throw new Error('Password recovery by email needs the online (Supabase) mode. In device mode, data is stored only in this browser.');
  }
  async updatePassword(p: string) {
    const s = await this.getUser(); if (!s) throw new Error('Not signed in');
    if (p.length < 8) throw new Error('Password must be at least 8 characters.');
    const users = LS.get('myfit:users') || []; const u = users.find((x: any) => x.id === s.id);
    u.salt = uuid(); u.hash = await hashPw(p, u.salt); LS.set('myfit:users', users);
  }
  async list(table: Table, uid: string) { return LS.get(this.key(uid, table)) || []; }
  private save(table: Table, uid: string, rows: any[]) {
    try { LS.set(this.key(uid, table), rows); }
    catch { throw new Error('Device storage is full. Remove some photos or export and delete old data.'); }
  }
  async insert(table: Table, row: any) {
    validate(table, row);
    const uid = this.uidOf(row, table); if (!uid) throw new Error('missing user');
    const rows = await this.list(table, uid);
    const r = { id: row.id ?? uuid(), created_at: new Date().toISOString(), ...row };
    rows.push(r); this.save(table, uid, rows); return r;
  }
  private findOwner(table: Table, id: string): string | null {
    const s = LS.get('myfit:session'); if (!s) return null;
    const rows = LS.get(this.key(s.id, table)) || [];
    return rows.find((r: any) => r.id === id) ? s.id : null; // a user can only touch their own rows
  }
  async update(table: Table, id: string, patch: any) {
    validate(table, patch);
    const uid = this.findOwner(table, id); if (!uid) throw new Error('Not found');
    const rows = await this.list(table, uid); const i = rows.findIndex((r: any) => r.id === id);
    rows[i] = { ...rows[i], ...patch, updated_at: new Date().toISOString() }; this.save(table, uid, rows); return rows[i];
  }
  async upsert(table: Table, row: any) {
    const uid = this.uidOf(row, table);
    const rows = await this.list(table, uid);
    return rows.find((r: any) => r.id === row.id) ? this.update(table, row.id, row) : this.insert(table, row);
  }
  async remove(table: Table, id: string) {
    const uid = this.findOwner(table, id); if (!uid) return;
    this.save(table, uid, (await this.list(table, uid)).filter((r: any) => r.id !== id));
  }
  async removeWhere(table: Table, uid: string, field: string, value: any) {
    this.save(table, uid, (await this.list(table, uid)).filter((r: any) => r[field] !== value));
  }
  async uploadPhoto(uid: string, file: Blob) {
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file); });
    const path = `local:${uid}:${uuid()}`;
    try { localStorage.setItem(`myfit:photo:${path}`, data); } catch { throw new Error('Device storage is full.'); }
    return path;
  }
  async photoUrl(path: string) { return localStorage.getItem(`myfit:photo:${path}`); }
  async removePhoto(path: string) { localStorage.removeItem(`myfit:photo:${path}`); }
  async deleteAccount(uid: string) {
    for (const t of TABLES) LS.del(this.key(uid, t));
    Object.keys(localStorage).filter(k => k.startsWith(`myfit:photo:local:${uid}:`)).forEach(k => localStorage.removeItem(k));
    LS.set('myfit:users', (LS.get('myfit:users') || []).filter((u: any) => u.id !== uid));
    await this.signOut();
  }
}

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const backend: Backend = URL_ && KEY_ ? new SupabaseBackend(URL_, KEY_) : new LocalBackend();
export const newId = uuid;
