// Service worker: păstrează aplicația în cache ca să meargă și fără internet.
const CACHE = 'organizator-v3';
const FILES = ['./', './index.html', './manifest.json', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rețea întâi (ca să primești actualizările), cache dacă nu ai internet.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Fișier de calendar generat local (datele nu pleacă de pe telefon): ./programare.ics?d=<base64>
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('/programare.ics') && url.searchParams.has('d')) {
    let text = '';
    try {
      const b = atob(url.searchParams.get('d').replace(/-/g, '+').replace(/_/g, '/'));
      text = new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0)));
    } catch { return e.respondWith(new Response('Link invalid', { status: 400 })); }
    return e.respondWith(new Response(text, {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="programare.ics"' }
    }));
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
