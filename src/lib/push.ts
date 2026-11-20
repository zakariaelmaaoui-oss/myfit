// Web Push subscription for the daily MyFit Coach message on the phone.
import type { Table } from './store';

export const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '';
export function pushSupported() { return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
export function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
export function isStandalone() { return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true; }

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4); const s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

export async function enablePush(insert: (t: Table, row: any) => Promise<any>): Promise<'ok' | 'denied' | 'unsupported' | 'not_configured'> {
  if (!pushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC) return 'not_configured';
  const perm = await Notification.requestPermission(); if (perm !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready);
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
  const j = sub.toJSON();
  try { await insert('push_subscriptions', { endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_agent: navigator.userAgent.slice(0, 200) }); }
  catch (e: any) { if (!/duplicate|unique|23505/i.test(String(e?.message ?? e?.code))) throw e; }
  return 'ok';
}

export async function disablePush(removeWhere: (t: Table, f: string, v: any) => Promise<void>) {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription();
  if (sub) { await removeWhere('push_subscriptions', 'endpoint', sub.endpoint); await sub.unsubscribe(); }
}
