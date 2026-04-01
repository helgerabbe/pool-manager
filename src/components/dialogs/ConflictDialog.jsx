/**
 * ConflictDialog.jsx
 *
 * Phase 6.4: Hard Block Pattern für HTTP 409 Speicherkonflikte
 *
 * - Modal, nicht-dismissible (kein Schließen per Escape/Click-Outside)
 * - Zeigt nur einen einzigen Button: "Aktuellen Stand laden"
 * - Kein "Trotzdem überschreiben"-Option
 * - Refetcht Queries oder lädt Seite neu
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * @param {boolean} open - Dialog ist offen?
 * @param {string} entityType - Entity-Typ (z.B. "Einheit", "Lernpaket") für spezifische Meldung
 * @param {Array<string>} queryKeysToInvalidate - Query Keys zum Invalidieren (optional)
 * @param {Function} onReload - Custom Reload-Callback (optional, default: window.location.reload)
 */
export default function ConflictDialog({
  open,
  entityType = 'Daten',
  queryKeysToInvalidate = [],
  onReload,
}) {
  const queryClient = useQueryClient();

  const handleReload = async () => {
    // 1. Invalidiere React Query Caches
    if (queryKeysToInvalidate.length > 0) {
      for (const key of queryKeysToInvalidate) {
        await queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      }
    } else {
      // Fallback: Invalidiere alles
      queryClient.clear();
    }

    // 2. Custom Reload-Callback oder Default Reload
    if (onReload && typeof onReload === 'function') {
      onReload();
    } else {
      // Default: Hard Page Reload nach kurzem Delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        // ❌ Kein Schließen erlaubt - onOpenChange ist ein No-Op
      }}
    >
      <DialogContent
        // Hard Block: Nicht dismissible
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()} // Vermeide Close via Click-Outside
        onEscapeKeyDown={(e) => e.preventDefault()} // Vermeide Close via Escape
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Speicherkonflikt
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="space-y-3 text-sm text-muted-foreground">
          <p>
            Diese {entityType} wurden in der Zwischenzeit von einer anderen Person aktualisiert.
          </p>
          <p className="font-medium text-foreground">
            Um Inkonsistenzen zu vermeiden, müssen die aktuellen Daten vom Server geladen werden.
            Nicht gespeicherte Eingaben werden dabei verworfen.
          </p>
        </DialogDescription>

        {/* Single Button: Nur "Aktuellen Stand laden" */}
        <div className="pt-4 flex gap-3">
          <Button
            onClick={handleReload}
            className="w-full bg-destructive hover:bg-destructive/90 text-white"
            size="lg"
          >
            Aktuellen Stand laden
          </Button>
        </div>

        {/* Optional: Info-Text */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Diese Seite wird aktualisiert, um die aktuellen Daten zu laden.
        </p>
      </DialogContent>
    </Dialog>
  );
}