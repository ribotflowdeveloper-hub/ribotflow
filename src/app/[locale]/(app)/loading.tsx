import { Loader2 } from "lucide-react";

/**
 * 'loading.tsx' és un arxiu especial de Next.js.
 * El component que s'exporta aquí s'utilitzarà automàticament com a 'fallback'
 * per al component <Suspense> del layout que l'envolta ('app/(app)/layout.tsx').
 * * Això permet mostrar una interfície de càrrega a l'instant mentre Next.js
 * carrega les dades de la nova pàgina al servidor, millorant molt l'experiència
 * d'usuari durant la navegació.
 */
export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}