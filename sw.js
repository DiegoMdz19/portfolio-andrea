// ── Andrea López Portfolio — Service Worker ──────────────────────────────────
const CACHE_NAME = 'andrea-v2';

// Assets que se pre-cachean al instalar el SW
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/andrea.js',
  '/404.html',
  '/site.webmanifest',
];

// Patrones que NUNCA se cachean (siempre red)
const SKIP_CACHE = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'cloudinary.com',
  'api.emailjs.com',
  '/videos/',
  '/sonidos/',
];

// ── INSTALL: pre-cachear shell ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches antiguas ─────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = req.url;

  // Solo interceptar GETs
  if (req.method !== 'GET') return;

  // URLs excluidas → red directa, sin caché
  if (SKIP_CACHE.some(p => url.includes(p))) return;

  // Navegación (HTML) → red primero, fallback a index.html cacheado
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // CDN externos (Firebase SDK, Google Fonts) → stale-while-revalidate
  const isCDN = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'gstatic.com/firebasejs',
    'cdn.jsdelivr.net',
  ].some(p => url.includes(p));

  if (isCDN) {
    e.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          return res;
        });
        return cached || network;
      })
    );
    return;
  }

  // Assets locales del mismo origen → cache-first
  try {
    if (new URL(url).origin === self.location.origin) {
      e.respondWith(
        caches.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
            return res;
          });
        })
      );
    }
  } catch (_) {}
});
