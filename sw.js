// Service worker: l'app funziona offline. Incrementa VERSION a ogni aggiornamento dei file.
const VERSION = 'spese-v92';
const FILES = ['./', 'index.html', 'style.css', 'nitido.css', 'foglio.css', 'manifest.webmanifest', 'js/main.js', 'js/store.js', 'js/calc.js', 'js/sync.js', 'js/icons.js', 'fonts/manrope.woff2', 'fonts/geist.woff2', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rete prima (così gli aggiornamenti arrivano subito), ma senza aspettare all'infinito: se la rete non risponde
// entro WAIT ms (o il telefono è offline) si usa subito la copia salvata, e la rete aggiorna la copia in sottofondo.
// Le richieste ad altri siti (GitHub per la sincronizzazione) non passano di qui.
const WAIT = 1200;
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return r;
    });
    if (!cached) return net;
    net.catch(() => {});
    if (self.navigator && self.navigator.onLine === false) return cached;
    return Promise.race([net.catch(() => cached), new Promise(res => setTimeout(() => res(cached), WAIT))]);
  })());
});
