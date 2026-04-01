/**
 * EmptyState.jsx
 *
 * Phase 6.7: Universelle Empty State Komponente
 * 
 * Features:
 * - Design Tokens basiert (keine Hardcoded-Farben)
 * - Flexibel konfigurierbar via Props
 * - Unterstützt Icons, Titel, Beschreibung, Action Button
 * - Responsive & Accessible
 */

import React from 'react';
import { cn } from '@/lib/utils';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4',
      'rounded-lg border border-border bg-card',
      'text-center',
      className
    )}>
      {/* Icon */}
      {Icon && (
        <div className="mb-4">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Titel */}
      {title && (
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {title}
        </h3>
      )}

      {/* Beschreibung */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {action}
        </div>
      )}
    </div>
  );
}