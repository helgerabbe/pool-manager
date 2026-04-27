/**
 * BundleAutoFillButton.jsx
 *
 * Auto-Befüllen-Button im Empty-State des BundleContainer (Phase D des
 * Epic „Semantische Dashboard-Sektoren"). Sichtbar nur im aktiven
 * Bearbeitungsmodus eines leeren Bündels.
 *
 * Verantwortung dieser Komponente: nur Click-Handler + Optik. Die komplette
 * Filter- und Insert-Logik (BundleKind ableiten, Kandidaten suchen, Toast)
 * läuft im übergebenen `onAutoFill`-Callback (Cockpit).
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BundleAutoFillButton({ onAutoFill, disabled = false }) {
  return (
    <div className="flex items-center justify-center py-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onAutoFill?.();
        }}
        disabled={disabled}
        className="h-7 text-[11px] px-2.5 gap-1.5 border-bundle-border text-bundle hover:bg-bundle/10"
        title="Bündel automatisch mit passenden Elementen aus der Einheit befüllen"
      >
        <Sparkles className="w-3 h-3 animate-sparkle" />
        Automatisch befüllen
      </Button>
    </div>
  );
}