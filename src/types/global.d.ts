// Ruta: types/global.d.ts

// Aquest fitxer sobreescriurà la definició global incorrecta de PageProps

declare global {
    /**
     * Defineix les propietats per a les pàgines de l'App Router de Next.js.
     * La clau és que 'params' i 'searchParams' NO són Promises.
     */
    interface PageProps<
      TParams extends Record<string, string> = {},
      TSearchParams extends Record<string, string | string[] | undefined> = {}
    > {
      params: TParams;
      searchParams?: TSearchParams;
    }
  }
  
  // Aquesta línia és necessària per assegurar que el fitxer es tracti com un mòdul
  // i la declaració global s'apliqui correctament.
  export {};