// Service worker: la app y el motor funcionan sin conexión una vez abiertos
const CACHE = 'entrenador-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './engine/stockfish-19-lite-single.js', './engine/stockfish-19-lite-single.wasm'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Datos en vivo: siempre a la red
  if (url.hostname.endsWith('chess.com') || url.hostname.endsWith('supabase.co') || url.hostname.endsWith('lichess.org')) return;
  const isPage = e.request.mode === 'navigate';
  if (isPage) {
    // red primero para recibir actualizaciones; caché si no hay conexión
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./', cp)); return r; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok && (url.origin === location.origin || url.hostname.includes('fonts.g'))) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
    return r;
  })));
});
