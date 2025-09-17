"use client";


// Aquest component mostra un esquelet per a la pàgina d'activitats
export function ActivitiesSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Esquelet de la capçalera */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-9 w-64 bg-gray-700/50 rounded-md"></div>
      </div>

      {/* Esquelet de la llista d'activitats */}
      <div className="glass-card divide-y divide-white/10">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="p-4 flex items-start gap-4">
            <div className="mt-1">
              <div className="w-5 h-5 bg-gray-700/50 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-5 w-1/3 bg-gray-700/50 rounded-md"></div>
                <div className="h-3 w-1/4 bg-gray-700/50 rounded-md"></div>
              </div>
              <div className="h-4 w-4/5 bg-gray-700/50 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}