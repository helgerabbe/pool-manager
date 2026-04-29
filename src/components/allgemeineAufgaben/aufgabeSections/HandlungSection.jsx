import React from 'react';
import { Label } from '@/components/ui/label';
import { Hand } from 'lucide-react';
import AufgabenstellungSection from './AufgabenstellungSection';
import SternRating from './SternRating';
import ZusaetzlichesMaterialSection from './ZusaetzlichesMaterialSection';

/**
 * HandlungSection
 *
 * Handlungsorientierte Aufgabe mit physischem Material.
 * Hat denselben Funktionsumfang wie eine KI-Tutor-Aufgabe (InhaltSection):
 * Aufgabenstellung mit Bild, Schwierigkeitsgrad, Ergebnis-Form/Format,
 * Erwartungshorizont, zusätzliches Material — ergänzt um das Pflichtfeld
 * "Hinweise zum Material" (wo findet der Schüler was?).
 */
export default function HandlungSection({
  formData,
  set,
  onBildUploadingChange,
  onMaterialUploadingChange,
}) {
  return (
    <>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-start gap-2">
        <Hand className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />
        <span>
          Handlungsaufgaben werden physisch bearbeitet (z. B. Bastelarbeit, Experiment, Plakat).
          Beschreibe knapp, <strong>was</strong> der Schüler tun soll und <strong>wo</strong> er
          das Material findet.
        </span>
      </div>

      <AufgabenstellungSection
        text={formData.aufgabenstellung}
        onTextChange={(val) => set('aufgabenstellung', val)}
        bildUrl={formData.aufgaben_bild_url}
        onBildUrlChange={(val) => set('aufgaben_bild_url', val)}
        onUploadingChange={onBildUploadingChange}
      />

      <div className="space-y-2">
        <Label htmlFor="hinweise_zum_material">
          Hinweise zum Material <span className="text-destructive">*</span>{' '}
          <span className="text-muted-foreground font-normal">(Wo findet der Schüler was?)</span>
        </Label>
        <textarea
          id="hinweise_zum_material"
          value={formData.hinweise_zum_material || ''}
          onChange={(e) => set('hinweise_zum_material', e.target.value)}
          placeholder='z.B. Schere, Klebstoff und Tonpapier liegen im Lehrerregal. Vorlagen findest du in der Schublade „Wasser".'
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
          value={formData.erwartungshorizont || ''}
          onChange={(e) => set('erwartungshorizont', e.target.value)}
          placeholder="Definieren Sie, wie ein erfolgreiches Ergebnis aussieht: inhaltliche Kriterien, Umfang, Lösungsansätze, Qualitätsmerkmale…"
          className="w-full px-3 py-2 border border-border rounded-lg min-h-32 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <ZusaetzlichesMaterialSection
        materials={formData.materialien}
        onMaterialsChange={(mats) => set('materialien', mats)}
        onUploadingChange={onMaterialUploadingChange}
      />
    </>
  );
}