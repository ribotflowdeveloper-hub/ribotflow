"use client";

import { ArrowLeft } from 'lucide-react';

export function ContactDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Esquelet de la Capçalera */}
      <div>
        <div className="h-9 w-40 bg-gray-700/50 rounded-md mb-4"></div>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gray-700/50 rounded-full shrink-0"></div>
          <div>
            <div className="h-10 w-64 bg-gray-700/50 rounded-md"></div>
            <div className="h-6 w-48 bg-gray-700/50 rounded-md mt-2"></div>
          </div>
        </div>
      </div>

      {/* Esquelet de les Pestanyes */}
      <div className="glass-card p-2">
        <div className="flex border-b border-gray-700/50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-gray-700/50 m-1 rounded-md"></div>
          ))}
        </div>
        <div className="p-8">
          <div className="h-8 w-56 bg-gray-700/50 rounded-md mb-6"></div>
          <div className="space-y-4">
            <div className="h-6 w-full bg-gray-700/50 rounded-md"></div>
            <div className="h-6 w-3/4 bg-gray-700/50 rounded-md"></div>
            <div className="h-6 w-5/6 bg-gray-700/50 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}