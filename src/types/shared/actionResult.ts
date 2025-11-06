// En un fitxer de tipus compartit, com src/types/shared/index.ts

export type ActionResult<T = unknown> = {
    success: boolean;
    message?: string;
    data?: T; // <-- Aquí està la clau. 'T' serà el tipus de les dades que retornem.
    error?: string;
};