import React from 'react';
import { Label } from '@/components/ui/label';

/**
 * ProzessSection
 * Lernorganisations-Meilenstein: nur Aufgabentext (Pflicht).
 * 1:1 aus AufgabeCreateView extrahiert.
 */
export default function ProzessSection({ formData, set }) {
  return (
    <div className="space-y-2">
      <Label>
        Aufgabentext / Anleitung<span className="text-destructive ml-1">*</span>
      </Label>
      <textarea
        value={formData.aufgabenstellung}
        onChange={(e) => set('aufgabenstellung', e.target.value)}
        placeholder="z.B. Halte einen kurzen Zwischenstand fest – was hast du bis hier gelernt?"
        className="w-full px-3 py-2 border border-border rounded-lg min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}