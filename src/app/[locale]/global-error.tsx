// src/app/[locale]/global-error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aquí és on podríes enviar l'error a un servei de monitorització
    // com Sentry, LogRocket, etc.
    console.error('S_ha produït un error global no controlat:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Ups! Alguna cosa ha fallat.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              El nostre equip tècnic ja ha estat notificat. Estem treballant
              per solucionar-ho el més aviat possible.
            </p>
            <div className="mt-8">
              <Button
                onClick={
                  // Intenta recuperar-te renderitzant de nou el segment
                  () => reset()
                }
                size="lg"
              >
                Torna-ho a intentar
              </Button>
            </div>
            {/* En desenvolupament, pots mostrar detalls de l'error si vols, 
                tot i que Next.js ja mostra el seu overlay. */}
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-4 rounded-md bg-muted p-4 text-left text-sm">
                <code>{error?.message}</code>
                <code>{error?.stack}</code>
              </pre>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}