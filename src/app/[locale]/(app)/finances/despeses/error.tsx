"use client"; // Els fitxers d'error han de ser components de client.

import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function ExpensesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Pots registrar l'error en un servei extern com Sentry
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-2xl font-bold mb-4">Alguna cosa ha anat malament!</h2>
      <p className="mb-6">{error.message}</p>
      <Button
        onClick={
          // Intenta recuperar-se tornant a renderitzar el segment
          () => reset()
        }
      >
        Torna a intentar-ho
      </Button>
    </div>
  );
}