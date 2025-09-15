/**
 * @file useMediaQuery.ts
 * @summary Aquest fitxer defineix un hook de React personalitzat (`useMediaQuery`) per a la
 * detecció de media queries de CSS al costat del client. És una eina molt útil per
 * crear components que s'adapten o canvien el seu comportament segons la mida de la pantalla
 * (ex: mostrar una vista per a mòbils i una altra per a escriptori).
 */

"use client";

import { useState, useEffect } from 'react';

/**
 * @function useMediaQuery
 * @summary Un hook que retorna 'true' si la 'media query' proporcionada coincideix, i 'false' si no.
 * @param {string} query - La 'media query' de CSS a avaluar (ex: '(max-width: 768px)').
 * @returns {boolean} L'estat de coincidència de la 'media query'.
 */
export function useMediaQuery(query: string) {
  // Inicialitzem l'estat a 'false'. Això és important perquè aquest codi s'executa primer
  // al servidor durant el Server-Side Rendering (SSR), on l'objecte 'window' no existeix.
  // Si l'inicialitzéssim basant-nos en 'window.matchMedia', tindríem un error d'hidratació.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Aquest codi dins de 'useEffect' només s'executa al client (al navegador),
    // on l'objecte 'window' sí que està disponible.
    const media = window.matchMedia(query);

    // Comprovem si l'estat actual de la 'media query' és diferent del nostre estat de React
    // i, si és així, el sincronitzem.
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Creem un oient d'esdeveniments que s'activarà cada vegada que l'estat
    // de la 'media query' canviï (ex: quan l'usuari redimensiona la finestra).
    const listener = () => {
      setMatches(media.matches);
    };

    media.addEventListener('change', listener);
    
    // Funció de neteja: Quan el component que utilitza aquest hook es desmunta,
    // eliminem l'oient d'esdeveniments per evitar fuites de memòria.
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
