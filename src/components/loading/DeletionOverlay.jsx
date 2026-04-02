import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DeletionOverlay.jsx
 * 
 * Globales Loading-Overlay beim Löschen von Einheiten.
 * Zeigt visuelles Feedback und blockiert Interaktionen bis Löschvorgang abgeschlossen ist.
 */

export default function DeletionOverlay({ isVisible, message = 'Wird gelöscht... Bitte warten.' }) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-background/50 backdrop-blur-sm',
      'animate-in fade-in duration-200'
    )}>
      {/* Spinner + Text Container */}
      <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border border-border shadow-lg">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">Dies kann einige Sekunden dauern...</p>
        </div>
      </div>
    </div>
  );
}