"use client";

/**
 * @summary Esquelet de càrrega per a la pàgina de Gestió d'Equip.
 */
export function TeamSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Esquelet del formulari d'invitació */}
      <div className="glass-card p-6">
        <div className="h-6 w-1/3 bg-gray-700/50 rounded-md mb-2"></div>
        <div className="h-4 w-2/3 bg-gray-700/50 rounded-md mb-4"></div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-gray-800/50 rounded-md"></div>
          <div className="h-10 w-24 bg-gray-800/50 rounded-md"></div>
          <div className="h-10 w-28 bg-gray-800/50 rounded-md"></div>
        </div>
      </div>
      
      {/* Esquelet de la llista de membres */}
      <div className="glass-card p-6">
        <div className="h-6 w-1/4 bg-gray-700/50 rounded-md mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 h-12 bg-muted rounded-lg">
              <div className="h-6 w-1/2 bg-gray-800/50 rounded-md"></div>
              <div className="h-6 w-1/4 bg-gray-800/50 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}