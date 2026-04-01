import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Generischer Skeleton Loader für beliebige Layouts
 * Verhindert Layout-Shifts während Daten geladen werden
 */
export function SkeletonLoader({ height = 'h-8', width = 'w-full', className }) {
  return (
    <div
      className={cn(
        'bg-slate-200 rounded-md animate-pulse',
        height,
        width,
        className
      )}
    />
  );
}

/**
 * Skeleton für Tabellen-Zeilen
 */
export function SkeletonTableRow({ columns = 4, className }) {
  return (
    <div className={cn('flex gap-3 mb-3', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLoader key={i} className="flex-1" height="h-10" />
      ))}
    </div>
  );
}

/**
 * Skeleton für Card-Layouts
 */
export function SkeletonCard({ className }) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-3', className)}>
      <SkeletonLoader height="h-6" width="w-2/3" />
      <SkeletonLoader height="h-4" width="w-full" />
      <SkeletonLoader height="h-4" width="w-4/5" />
      <div className="flex gap-2 pt-2">
        <SkeletonLoader height="h-8" width="w-1/3" />
        <SkeletonLoader height="h-8" width="w-1/3" />
      </div>
    </div>
  );
}

/**
 * Skeleton für komplexe Workspace-Layouts
 */
export function SkeletonWorkspace() {
  return (
    <div className="grid grid-cols-3 gap-6 h-full p-6">
      {/* Linker Panel */}
      <div className="border rounded-lg p-4 space-y-3">
        <SkeletonLoader height="h-8" width="w-2/3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} height="h-10" width="w-full" className="mb-2" />
        ))}
      </div>

      {/* Mitte Panel */}
      <div className="border rounded-lg p-4 space-y-4 col-span-2">
        <SkeletonLoader height="h-8" width="w-1/2" />
        <SkeletonLoader height="h-40" width="w-full" />
        <SkeletonLoader height="h-6" width="w-full" />
        <SkeletonLoader height="h-6" width="w-3/4" />
      </div>
    </div>
  );
}