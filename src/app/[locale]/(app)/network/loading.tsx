"use client";

/**
 * @summary Esquelet de càrrega per a la pàgina de Network.
 */
export default function Loading() {
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
      {/* Esquelet de la llista de perfils */}
      <div className="lg:col-span-1 h-full bg-gray-800/50 rounded-lg p-4 space-y-4 overflow-y-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-700/50 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-700/50 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-700/50 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Esquelet del mapa */}
      <div className="lg:col-span-2 h-full bg-gray-800/50 rounded-lg"></div>
    </div>
  );
}