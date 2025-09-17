"use client";

const SkeletonCard = ({ lines }: { lines: number }) => (
  <div className="border bg-card text-card-foreground shadow-sm rounded-lg animate-pulse">
    <div className="p-6 space-y-2">
      <div className="h-6 w-1/3 bg-gray-700/50 rounded-md"></div>
      <div className="h-4 w-2/3 bg-gray-700/50 rounded-md"></div>
    </div>
    <div className="p-6 pt-0 space-y-6">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-1/4 bg-gray-700/50 rounded-md"></div>
          <div className="h-10 w-full bg-gray-700/50 rounded-md"></div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina d'edició del perfil.
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <div className="flex justify-end pt-4">
        <div className="h-10 w-32 bg-gray-700/50 rounded-md"></div>
      </div>
    </div>
  );
}