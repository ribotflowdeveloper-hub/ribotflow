"use client";

import { ArrowLeft } from 'lucide-react';

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina de l'Editor de Pressupostos.
 */
export function QuoteEditorSkeleton() {
  return (
    <div className="animate-pulse h-full">
      {/* Esquelet de la Capçalera */}
      <header className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="h-9 w-36 bg-gray-700/50 rounded-md"></div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-gray-700/50 rounded-md"></div>
          <div className="h-10 w-10 bg-gray-700/50 rounded-md"></div>
          <div className="h-10 w-32 bg-gray-700/50 rounded-md"></div>
        </div>
      </header>

      {/* Esquelet del Contingut Principal */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        {/* Columna Esquerra (Formulari) */}
        <section className="flex flex-col gap-6 overflow-y-auto">
          <div className="glass-card p-6 h-48"></div>
          <div className="glass-card p-6 h-96"></div>
          <div className="glass-card p-6 h-32"></div>
        </section>
        {/* Columna Dreta (Previsualització) */}
        <aside className="hidden lg:block glass-card p-4 h-[80vh]"></aside>
      </main>
    </div>
  );
}