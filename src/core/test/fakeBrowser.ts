// DEV/TEST ONLY (VITE_FAKE_DB=1): in-memory database + fake auth so the UI can be exercised without Supabase.
import { fakeSupabase } from './fakeSupabase';
export function fakeBrowserClient() {
  const { client, db } = fakeSupabase();
  const user = { id: 'demo-user', email: 'hunter@example.com' };
  let session: any = null; const subs: ((e: string, s: any) => void)[] = [];
  const emit = () => subs.forEach(f => f('change', session));
  client.auth = {
    getSession: async () => ({ data: { session } }),
    getUser: async () => ({ data: { user: session ? user : null } }),
    onAuthStateChange: (f: any) => { subs.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async () => { session = { user, access_token: 'fake' }; emit(); return { data: { session }, error: null }; },
    signUp: async () => { session = { user, access_token: 'fake' }; emit(); return { data: { session }, error: null }; },
    signOut: async () => { session = null; emit(); return { error: null }; },
    resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ error: null }),
  };
  const files = new Map<string, string>();
  client.storage = { from: () => ({
    upload: async (path: string, f: Blob) => { files.set(path, URL.createObjectURL(f)); return { error: null }; },
    createSignedUrl: async (path: string) => ({ data: { signedUrl: files.get(path) ?? '' } }),
    list: async () => ({ data: [] }), remove: async () => ({ error: null }) }) };
  (window as any).__fakeDb = db;
  return client;
}
