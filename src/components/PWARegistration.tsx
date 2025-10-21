// src/components/PWARegistration.tsx
'use client';

import { useEffect } from 'react';

export function PWARegistration() {
  useEffect(() => {
    // Aquesta lògica només s'executa un cop el component s'ha muntat al client.
    // Comprovem si el navegador suporta Service Workers.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js') // Registrem el nostre fitxer sw.js
          .then((registration) => {
            console.log('SW registrat amb èxit:', registration.scope);
          })
          .catch((error) => {
            console.error('Error durant el registre del SW:', error);
          });
      });
    }
  }, []); // L'array buit assegura que l'efecte només s'executa un cop.

  // Aquest component no renderitza res a la UI.
  return null;
}