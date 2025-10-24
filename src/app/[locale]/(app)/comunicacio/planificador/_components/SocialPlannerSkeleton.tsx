// src/app/[locale]/(app)/comunicacio/planificador/_components/SocialPlannerSkeleton.tsx

import { Skeleton } from "@/components/ui/skeleton";

export function SocialPlannerSkeleton() {
  return (
    // Estructura principal flex (columna en mòbil, fila en desktop)
    <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.24))] gap-6 p-4 md:p-6 animate-pulse">

      {/* --- Columna d'Esborranys (Sidebar) Skeleton --- */}
      <aside className="lg:w-[320px] xl:w-[350px] flex-shrink-0 flex flex-col gap-4 min-h-[300px] lg:min-h-0">
        {/* Botó Crear Post */}
        <Skeleton className="h-10 w-full" />
        {/* Caixa d'Esborranys */}
        <div className="bg-muted/50 rounded-lg p-4 flex-grow flex flex-col">
          {/* Títol Esborranys */}
          <Skeleton className="h-6 w-3/4 mb-3 flex-shrink-0" />
          {/* Llista d'Esborranys Skeletons */}
          <div className="space-y-3 flex-grow overflow-hidden">
            {[...Array(3)].map((_, index) => (
              // PostCard Skeleton a la Sidebar
              <div key={`draft-skel-${index}`} className="p-1.5 rounded-md bg-card border border-border flex items-start gap-1.5">
                {/* Drag Handle Skeleton */}
                <Skeleton className="h-8 w-8 flex-shrink-0" />
                {/* Contingut Skeleton */}
                <div className="flex-grow space-y-1.5 overflow-hidden">
                  <Skeleton className="h-3 w-1/2" /> {/* Simula text petit */}
                  <Skeleton className="h-3 w-full" /> {/* Simula text truncat */}
                </div>
                {/* Media Preview Skeleton (opcional, no sempre hi ha) */}
                <Skeleton className="h-10 w-10 rounded-sm flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* --- Calendari Skeleton --- */}
      <section className="flex-grow bg-card p-4 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
        {/* Header Navegació Mes Skeleton */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Header Dies Setmana Skeleton */}
        <header className="grid grid-cols-7 gap-1 text-center mb-2 flex-shrink-0">
          {[...Array(7)].map((_, index) => (
            <Skeleton key={`day-header-${index}`} className="h-4 w-8 mx-auto" />
          ))}
        </header>
        {/* Grid Calendari Skeleton */}
        <main className="grid grid-cols-7 grid-rows-5 gap-2 flex-grow min-h-0">
          {/* Generem cel·les skeleton (aprox 35 per a 5 setmanes) */}
          {[...Array(35)].map((_, index) => (
            <div key={`day-cell-${index}`} className="rounded-md p-1.5 flex flex-col gap-2 bg-muted/30">
              {/* Número del dia Skeleton */}
              <Skeleton className="h-4 w-4 self-center flex-shrink-0" />
              {/* Espai per a PostCards Skeletons (només en algunes cel·les) */}
              <div className="flex-grow space-y-2 overflow-hidden">
                {/* Afegim 1 o 2 post skeletons aleatòriament per simular contingut */}
                {Math.random() > 0.6 && (
                  <div className="p-1 rounded-md bg-card border border-border flex items-start gap-1">
                    <Skeleton className="h-4 w-4 flex-shrink-0" /> {/* Icona petita */}
                    <Skeleton className="h-3 w-full" /> {/* Text truncat */}
                  </div>
                )}
                {Math.random() > 0.8 && (
                   <div className="p-1 rounded-md bg-card border border-border flex items-start gap-1">
                    <Skeleton className="h-4 w-4 flex-shrink-0" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </main>
      </section>
    </div>
  );
}