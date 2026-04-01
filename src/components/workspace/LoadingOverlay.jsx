/**
 * LoadingOverlay
 * ──────────────────────────────────────────────────────────
 * Blockierendes Overlay während Speichervorgängen.
 * Verhindert Benutzer-Interaktion, bis API-Response kommt.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ isVisible = false }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-xl p-6 sm:p-8 text-center max-w-sm mx-4">
        <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-sm font-medium text-foreground">
          Änderungen werden jetzt übernommen. Bitte warten...
        </p>
      </div>
    </div>
  );
}