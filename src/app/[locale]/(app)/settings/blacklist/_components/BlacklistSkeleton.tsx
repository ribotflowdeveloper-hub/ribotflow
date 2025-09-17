"use client";

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina de la Blacklist.
 */
export function BlacklistSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse">
      {/* Esquelet de la descripció */}
      <div className="space-y-2 mb-6">
        <div className="h-4 w-full bg-gray-700/50 rounded"></div>
        <div className="h-4 w-3/4 bg-gray-700/50 rounded"></div>
      </div>
      
      {/* Esquelet del formulari */}
      <div className="flex gap-2 mb-6">
        <div className="h-10 flex-1 bg-gray-700/50 rounded-md"></div>
        <div className="h-10 w-24 bg-gray-700/50 rounded-md"></div>
      </div>

      {/* Esquelet de la llista de regles */}
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between items-center p-2 h-10 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
              <div className="h-5 w-48 bg-gray-700/50 rounded-md"></div>
            </div>
            <div className="h-8 w-8 bg-gray-700/50 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}