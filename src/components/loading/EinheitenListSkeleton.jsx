/**
 * EinheitenListSkeleton.jsx
 *
 * Phase 6.7: Struktur-Skeleton für Einheiten-Liste
 * 
 * Imitiert das finale Layout mit 3 Einheiten-Kartenplatzhaltern,
 * nutzt ausschließlich Design Tokens (keine Hardcoded-Farben)
 */

import React from 'react';

export default function EinheitenListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-4"
        >
          {/* Header: Fach Badge + Titel */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 space-y-2">
              {/* Fach Badge Skeleton */}
              <div className="h-5 w-20 rounded bg-muted animate-pulse" />
              {/* Titel Skeleton */}
              <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
            </div>
            {/* Status Badge Skeleton */}
            <div className="h-6 w-32 rounded-full bg-muted animate-pulse shrink-0" />
          </div>

          {/* Metadata Row */}
          <div className="flex gap-4 mb-4">
            {/* Fach: Deutsch */}
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            {/* Jahrgang: 10 */}
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>

          {/* Beschreibung Lines */}
          <div className="space-y-2 mb-4">
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
          </div>

          {/* Footer: Member Avatars + Action Button */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {/* Avatars Placeholder */}
            <div className="flex gap-2">
              {[0, 1].map((j) => (
                <div
                  key={j}
                  className="h-8 w-8 rounded-full bg-muted animate-pulse"
                />
              ))}
            </div>
            {/* Action Button Skeleton */}
            <div className="h-9 w-24 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}