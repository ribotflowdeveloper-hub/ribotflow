"use client";

export function CustomizationSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 h-48"></div>
        <div className="glass-card p-6 h-48"></div>
      </div>
      <div className="glass-card p-8 h-64"></div>
      <div className="glass-card p-8 h-64"></div>
    </div>
  );
}