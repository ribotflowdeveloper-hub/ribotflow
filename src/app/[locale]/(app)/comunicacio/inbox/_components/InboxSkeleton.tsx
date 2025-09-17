"use client";

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina de l'Inbox.
 */
export function InboxSkeleton() {
  return (
    <div className="flex flex-row h-full w-full animate-pulse">
      {/* Esquelet de la llista de tiquets */}
      <div className="w-80 lg:w-96 flex-shrink-0 border-r border-border glass-card p-4 space-y-4">
        <div className="h-8 w-1/2 bg-gray-700/50 rounded-md"></div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-700/50 rounded-md"></div>
          <div className="h-8 w-24 bg-gray-700/50 rounded-md"></div>
        </div>
        <div className="space-y-4 pt-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800/50 rounded-md"></div>
          ))}
        </div>
      </div>
      
      {/* Esquelet del detall del tiquet */}
      <div className="flex-1 p-6 space-y-4">
        <div className="h-8 w-3/4 bg-gray-700/50 rounded-md"></div>
        <div className="h-4 w-full bg-gray-700/50 rounded-md"></div>
        <div className="h-4 w-full bg-gray-700/50 rounded-md"></div>
        <div className="h-4 w-5/6 bg-gray-700/50 rounded-md"></div>
      </div>

      {/* Esquelet del panell de contacte */}
      <div className="w-80 lg:w-96 flex-shrink-0 border-l border-border glass-card p-4 space-y-4 hidden lg:block">
        <div className="h-8 w-1/2 bg-gray-700/50 rounded-md"></div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 w-full bg-gray-700/50 rounded-md"></div>
            <div className="h-4 w-3/4 bg-gray-700/50 rounded-md"></div>
          </div>
        </div>
        <div className="h-4 w-full bg-gray-700/50 rounded-md"></div>
        <div className="h-4 w-full bg-gray-700/50 rounded-md"></div>
      </div>
    </div>
  );
}