import React from 'react';
import { Label } from '@/components/ui/label';
import ProjektAufgabenMultiSelect from '@/components/allgemeineAufgaben/ProjektAufgabenMultiSelect';
import SternRating from './SternRating';

/**
 * ProjektAnkerSection
 * Tor zu Ebene-3-Projekten. 1:1 aus AufgabeCreateView extrahiert.
 */
export default function ProjektAnkerSection({
  einheitId,
  excludeAufgabeId,
  formData,
  set,
  beschreibung,
  onBeschreibung,
}) {
  return (
    <>
      <ProjektAufgabenMultiSelect
        einheitId={einheitId}
        selectedIds={formData.verlinkte_projekt_ids || []}
        onChange={(ids) => set('verlinkte_projekt_ids', ids)}
        excludeAufgabeId={excludeAufgabeId}
      />

      <div className="space-y-2">
        <Label>Beschreibung (optional)</Label>
        <textarea
          value={beschreibung}
          onChange={(e) => onBeschreibung(e.target.value)}
          placeholder="z.B. Wähle ein Projekt aus, das dich besonders interessiert."
          className="w-full px-3 py-2 border border-border rounded-lg min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <Label>Schwierigkeitsgrad</Label>
        <SternRating
          value={formData.schwierigkeitsgrad}
          onChange={(val) => set('schwierigkeitsgrad', val)}
        />
      </div>
    </>
  );
}