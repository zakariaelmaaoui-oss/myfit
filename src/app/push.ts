// Web Push subscription for SHADOW FIT reminders. Only the PUBLIC VAPID key is in the browser.
import { supabase } from '../lib/supabase';
export const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '';
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64 = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
export async function enablePush(uid: string): Promise<'ok' | 'denied' | 'unsupported' | 'not_configured'> {
  if (!pushSupported()) return 'unsupported'; if (!VAPID_PUBLIC) return 'not_configured';
  if (await Notification.requestPermission() !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready);
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) });
  const j = sub.toJSON();
  const r = await supabase.from('sf_push_subscriptions').upsert({ user_id: uid, endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }, { onConflict: 'endpoint' });
  if (r.error) throw r.error; return 'ok';
}
export async function disablePush() {
  if (!pushSupported()) return; const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supabase.from('sf_push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
}
