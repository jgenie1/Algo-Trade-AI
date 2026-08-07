// Service Worker PWA pour Algo-Trade-AI
// v5 - Fix: Utiliser fetch(event.request) directement sans init invalide pour les requêtes de navigation
const CACHE_NAME = 'algotrade-pwa-v5';
const DYNAMIC_CACHE = 'algotrade-dynamic-v5';

// On ne cache QUE le manifest — jamais les pages HTML
const STATIC_ASSETS = [
  '/manifest.webmanifest'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker v5] Caching static assets (NO HTML)');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activation : purge TOUS les anciens caches (v1, v2, v3, v4, etc.)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[Service Worker v5] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ===================================================
  // RÈGLE 1 : Navigation HTML → TOUJOURS depuis le réseau, jamais de cache
  // Cela garantit que chaque déploiement est immédiatement visible
  // ===================================================
  const isNavigation = event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .catch((err) => {
          console.error('[SW v5] Fetch navigation failed:', err);
          // En cas d'offline complet : serve une page d'erreur minimaliste
          return new Response(
            `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Algo-Trade-AI - Hors ligne</title>
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <style>body{font-family:sans-serif;background:#0f0f1a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;}
            h1{color:#6366f1;font-size:2rem;margin-bottom:1rem;}p{color:#94a3b8;}</style></head>
            <body><div><h1>⚡ Algo-Trade-AI</h1><p>Connexion réseau indisponible.<br>Veuillez vérifier votre connexion et réessayer.</p>
            <button onclick="location.reload()" style="margin-top:1.5rem;padding:.75rem 2rem;background:#6366f1;color:#fff;border:none;border-radius:.5rem;cursor:pointer;font-size:1rem;">Réessayer</button>
            </div></body></html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        })
    );
    return;
  }

  // ===================================================
  // RÈGLE 2 : Assets Next.js immuables (_next/static/) → Cache-First permanent
  // Ces fichiers ont un hash dans le nom, donc un nouveau build = nouveau fichier
  // ===================================================
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // ===================================================
  // RÈGLE 3 : Images et autres assets statiques → Cache-First avec fallback réseau
  // ===================================================
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // ===================================================
  // RÈGLE 4 : Tout le reste (API, JSON, etc.) → Network-First (pas de cache)
  // ===================================================
  event.respondWith(fetch(event.request));
});

// Gestion des Notifications Push PWA
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Algo-Trade-AI', body: 'Alerte de bot de trading' };
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
