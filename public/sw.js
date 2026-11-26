// SHADOW FIT service worker: app-shell cache + push reminders. Personal data is never cached (API calls go to the network).
const CACHE = 'shadowfit-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/icon.svg', '/manifest.webmanifest'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('/', c)); return r; }).catch(() => caches.match('/'))); return; }
  if (url.pathname.startsWith('/assets/')) e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'THE SYSTEM', { body: d.body || '', icon: '/icon.svg', badge: '/icon.svg', data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } return self.clients.openWindow(target); }));
});
