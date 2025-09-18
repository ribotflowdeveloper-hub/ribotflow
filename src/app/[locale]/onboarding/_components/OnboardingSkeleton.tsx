"use client";

/**
 * @summary Esquelet de càrrega per a la pàgina d'Onboarding.
 */
export function OnboardingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background animate-pulse">
      <div className="w-full max-w-2xl glass-card p-8 shadow-2xl">
        <div className="space-y-4">
          <div className="h-8 w-1/3 bg-gray-700/50 rounded-md"></div>
          <div className="h-5 w-2/3 bg-gray-700/50 rounded-md"></div>
          <div className="h-3 w-full bg-gray-700/50 rounded-md mt-4"></div>
        </div>
        <div className="mt-8 space-y-6">
          <div className="h-12 w-full bg-gray-700/50 rounded-md"></div>
          <div className="h-12 w-full bg-gray-700/50 rounded-md"></div>
        </div>
      </div>
    </div>
  );
}