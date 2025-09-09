// Ruta del fitxer: src/hooks/useMediaQuery.ts
"use client";

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string) {
  // Inicialitzem a 'false' per evitar problemes durant el renderitzat al servidor.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Aquest codi només s'executa al client.
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => {
      setMatches(media.matches);
    };

    media.addEventListener('change', listener);
    
    // Netejem el 'listener' quan el component es desmunta.
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

