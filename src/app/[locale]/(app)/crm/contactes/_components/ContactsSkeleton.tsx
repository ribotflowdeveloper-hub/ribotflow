"use client";



// Aquest component mostra un esquelet genèric per a la pàgina de contactes.
export function ContactsSkeleton() {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Esquelet de la capçalera */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 flex-shrink-0">
        <div className="h-9 w-48 bg-gray-700/50 rounded-md"></div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-48 bg-gray-700/50 rounded-md"></div>
          <div className="h-10 w-20 bg-gray-700/50 rounded-md"></div>
          <div className="h-10 w-32 bg-gray-700/50 rounded-md"></div>
        </div>
      </div>

      {/* Esquelet de les targetes de contacte */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}