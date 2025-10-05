const CACHE_NAME = 'ribotflow-cache-v3'; // Incrementem la versió per forçar l'actualització

// Esdeveniment 'install': Ara només activa el SW, sense pre-carregar res.
self.addEventListener('install', event => {
  console.log('SW: Instal·lant v3...');
  event.waitUntil(self.skipWaiting()); // Forcem l'activació del nou SW
});

// Esdeveniment 'activate': Neteja les caches antigues.
self.addEventListener('activate', event => {
  console.log('SW: Activant v3...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Pren el control de les pàgines obertes
});

// Esdeveniment 'fetch': Aquesta és la part clau.
self.addEventListener('fetch', event => {
  // No gestionem peticions que no siguin GET (com POST, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratègia "Stale-While-Revalidate" (Molt ràpida i moderna)
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // 1. Retorna la versió de la cau si existeix (immediat)
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // 2. Mentrestant, demana la versió nova a la xarxa
          // i l'actualitza a la cau per a la pròxima vegada.
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });

        // Retorna la resposta de la cau o espera la de la xarxa si no hi és
        return response || fetchPromise;
      });
    })
  );
});

// L'esdeveniment 'push' per a les notificacions es queda igual
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});