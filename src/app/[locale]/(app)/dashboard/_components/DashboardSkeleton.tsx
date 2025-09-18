"use client";

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina principal del Dashboard.
 */
export function DashboardSkeleton() {
  const SkeletonCard = () => <div className="h-28 bg-card rounded-2xl ring-1 ring-border"></div>;
  
  return (
    <div className="space-y-8 animate-pulse">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Esquelet de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Esquelet del cos principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-card rounded-2xl ring-1 ring-border"></div>
        <div className="h-72 bg-card rounded-2xl ring-1 ring-border"></div>
      </div>
      
      {/* Esquelet d'accés ràpid */}
      <div className="h-32 bg-card rounded-2xl ring-1 ring-border"></div>

      {/* Esquelet de seccions finals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-96 bg-card rounded-2xl ring-1 ring-border"></div>
        <div className="space-y-6">
            <div className="h-48 bg-card rounded-2xl ring-1 ring-border"></div>
            <div className="h-48 bg-card rounded-2xl ring-1 ring-border"></div>
        </div>
      </div>
    </div>
  );
}