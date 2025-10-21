// public/sw.js

const CACHE_NAME = 'ribotflow-cache-v1'; // Nom de la cache específic per a la nostra app

// Esdeveniment 'install': S'activa quan el navegador instal·la el nou SW.
self.addEventListener('install', event => {
  console.log('SW: Instal·lant...');
  // Forcem que el nou Service Worker s'activi immediatament, sense esperar
  // que l'usuari tanqui totes les pestanyes de l'app.
  event.waitUntil(self.skipWaiting()); 
});

// Esdeveniment 'activate': Neteja les caches antigues per alliberar espai.
self.addEventListener('activate', event => {
  console.log('SW: Activant...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Busquem totes les caches i eliminem les que no coincideixen amb el nom de la cache actual.
        // Això és crucial per eliminar dades obsoletes en actualitzar la versió del SW.
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  // Un cop activat, el SW pren el control de totes les pàgines obertes immediatament.
  self.clients.claim(); 
});

// Esdeveniment 'fetch': Intercepta totes les peticions de xarxa.
self.addEventListener('fetch', event => {
  // Ignorem peticions que no siguin GET (com POST) i les d'extensions de Chrome,
  // ja que no són rellevants per a la cache de l'aplicació.
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  // Estratègia "Stale-While-Revalidate": Servim des de la cache primer per rapidesa,
  // i en paral·lel demanem una versió nova a la xarxa per mantenir les dades fresques.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // Sempre intentem obtenir la versió més recent de la xarxa.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Si la resposta de xarxa és vàlida, l'emmagatzemem a la cache per a futures peticions.
          // Clonem la resposta perquè un 'Response' només es pot consumir una vegada.
          if (networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          // Si la xarxa falla, almenys tenim el contingut de la cache.
          // Si no hi ha res a la cache, aquí podríem retornar una pàgina offline genèrica.
          console.error('SW: La petició de xarxa ha fallat.', error);
          throw error;
        });

        // Retornem la resposta de la cache si existeix (immediat), 
        // o esperem la resposta de la xarxa si no hi és.
        return cachedResponse || fetchPromise;
      });
    })
  );
});