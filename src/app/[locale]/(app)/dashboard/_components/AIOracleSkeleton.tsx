"use client";
import { Button } from '@/components/ui/button';

/**
 * @summary Esquelet de càrrega per a l'Oracle d'IA.
 */
export function AIOracleSkeleton() {
  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-gradient-to-br from-white/10 to-white/5 animate-pulse">
      <h2 className="text-xl font-bold text-white mb-3">Oracle d’IA</h2>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white/90 mb-1">Resum</p>
          <div className="h-4 w-3/4 rounded bg-white/10"></div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white/90 mb-1">Suggeriment</p>
          <div className="h-4 w-full rounded bg-white/10 mb-1"></div>
          <div className="h-4 w-1/2 rounded bg-white/10"></div>
        </div>
        <Button variant="outline" className="w-full" disabled>Parlar amb l’assistent</Button>
      </div>
    </div>
  );
}