// Offline support. Network first (so updates show up as soon as you are online), cache as the fallback.
const CACHE = 'ns-london-helper';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('index.html', { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put('index.html', res);
    const urls = new Set(['./', 'bg.svg', 'fredoka-latin.woff2', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']);
    // the versioned CSS/JS links exactly as index.html references them
    for (const m of html.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js)(?:\?[^"]*)?)"/g)) urls.add(m[1]);
    await Promise.all([...urls].map((u) => cache.add(new Request(u, { cache: 'no-cache' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? await cache.match('index.html') : undefined) || Response.error();
    }
  })());
});
