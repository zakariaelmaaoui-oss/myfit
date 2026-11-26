// Browser Supabase client. Only the PUBLIC anon key is used here; Row Level Security protects every row.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from './publicConfig';
import { fakeBrowserClient } from '../core/test/fakeBrowser';
const FAKE = import.meta.env.VITE_FAKE_DB === '1'; // local UI tests only — never set in Vercel
const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || PUBLIC_SUPABASE_URL).trim().replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '');
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || PUBLIC_SUPABASE_KEY;
export const configured = FAKE || (!!url && !!anon);
export const supabase: SupabaseClient = FAKE ? fakeBrowserClient() : configured ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } }) : (null as unknown as SupabaseClient);
export async function token() { return (await supabase.auth.getSession()).data.session?.access_token ?? null; }
