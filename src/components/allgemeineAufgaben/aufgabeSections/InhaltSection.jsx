import React from 'react';
import { Label } from '@/components/ui/label';
import AufgabenstellungSection from './AufgabenstellungSection';
import SternRating from './SternRating';
import ZusaetzlichesMaterialSection from './ZusaetzlichesMaterialSection';

/**
 * InhaltSection
 * Klassische Fachaufgabe: Aufgabenstellung (Text + Bild), Schwierigkeit,
 * Ergebnis-Form/Dateiformat, Erwartungshorizont, zusätzliches Material.
 * 1:1 aus AufgabeCreateView extrahiert.
 */
export default function InhaltSection({
  formData,
  set,
  onBildUploadingChange,
  onMaterialUploadingChange,
}) {
  return (
    <>
      <AufgabenstellungSection
        text={formData.aufgabenstellung}
        onTextChange={(val) => set('aufgabenstellung', val)}
        bildUrl={formData.aufgaben_bild_url}
        onBildUrlChange={(val) => set('aufgaben_bild_url', val)}
        onUploadingChange={onBildUploadingChange}
      />

      <div className="space-y-2">
        <Label>Schwierigkeitsgrad</Label>
        <SternRating
          value={formData.schwierigkeitsgrad}
          onChange={(val) => set('schwierigkeitsgrad', val)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Erwartete Form des Ergebnisses</Label>
          <select
            value={formData.ergebnis_form || ''}
            onChange={(e) => set('ergebnis_form', e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
          >
            <option value="">-- Bitte wählen --</option>
            <option>Fließtext / Essay</option>
            <option>Tabelle / Matrix</option>
            <option>Präsentation / Folien</option>
            <option>Schema / Konzept-Map / Zeichnung</option>
            <option>Stichpunktartige Übersicht</option>
            <option>Mischform / Offen</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Erwartetes Dateiformat</Label>
          <select
            value={formData.ergebnis_dateiformat || ''}
            onChange={(e) => set('ergebnis_dateiformat', e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
          >
            <option value="">-- Bitte wählen --</option>
            <option>Textdokument (Word/PDF)</option>
            <option>Bilddatei (JPG/PNG)</option>
            <option>Präsentationsdatei (PowerPoint/PDF)</option>
            <option>Offen / Beliebig</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Erwartungshorizont / Zielvorgaben (optional)</Label>
        <textarea
          value={formData.erwartungshorizont}
          onChange={(e) => set('erwartungshorizont', e.target.value)}
          placeholder="Definieren Sie, wie ein erfolgreiches Ergebnis aussieht: inhaltliche Kriterien, Umfang, Lösungsansätze, Qualitätsmerkmale…"
          className="w-full px-3 py-2 border border-border rounded-lg min-h-32 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Dieses Feld dient als Leitplanke für den KI-Tutor bei der Lernbegleitung.
        </p>
      </div>

      <ZusaetzlichesMaterialSection
        materials={formData.materialien}
        onMaterialsChange={(mats) => set('materialien', mats)}
        onUploadingChange={onMaterialUploadingChange}
      />
    </>
  );
}