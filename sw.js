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

// All page navigations share one cache entry, so links like /?utm=x or /index.html?foo do not pile up copies.
const keyFor = (req) => (req.mode === 'navigate' ? 'index.html' : req);

// Versioned files (?v=N): once a newer version is cached, drop the older ones so the cache does not grow every release.
async function pruneOldVersions(cache, url) {
  const u = new URL(url);
  if (!u.searchParams.has('v')) return;
  const v = Number(u.searchParams.get('v'));
  if (!Number.isFinite(v)) return;
  for (const k of await cache.keys()) {
    const ku = new URL(k.url);
    if (ku.pathname === u.pathname && ku.searchParams.has('v') && Number(ku.searchParams.get('v')) < v) await cache.delete(k);
  }
}

// If the network has not answered after this long and we already hold a copy, use the copy (the network request keeps
// going and refreshes the cache for next time). On a flaky connection this beats waiting 30 seconds for a page we have.
const NETWORK_TIMEOUT_MS = 2000;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(handle(event, req));
});

async function handle(event, req) {
  const cache = await caches.open(CACHE);
  const key = keyFor(req);
  const network = fetch(req, { cache: 'no-cache' });
  // Store in the background but keep the worker alive until the write is done; only complete (200) responses,
  // never partial (206) or error pages.
  event.waitUntil(network.then(async (res) => {
    if (res.status !== 200) return;
    await cache.put(key, res.clone());
    await pruneOldVersions(cache, req.url);
  }).catch(() => {}));
  // Only an exact copy may beat a slow network: a different version of the same file could mismatch the page.
  const exact = await cache.match(key);
  try {
    if (!exact) return await network;
    return await Promise.race([
      network,
      new Promise((resolve) => setTimeout(() => resolve(exact), NETWORK_TIMEOUT_MS)),
    ]);
  } catch (err) {
    // network failed outright (offline)
    return exact || (await cache.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? await cache.match('index.html') : undefined) || Response.error();
  }
}
