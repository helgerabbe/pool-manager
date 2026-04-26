import React from 'react';
import { Label } from '@/components/ui/label';
import { Hand } from 'lucide-react';

/**
 * HandlungSection
 * Handlungsorientierte Aufgabe mit physischem Material.
 * Digitale Eingabefelder (Erwartungshorizont, Materialien-Liste, Bild-Upload usw.)
 * werden bewusst NICHT angezeigt – stattdessen ein einziges großes Hinweisfeld.
 */
export default function HandlungSection({ formData, set, beschreibung, onBeschreibung }) {
  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
        <Hand className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
        <span>
          Handlungsaufgaben werden physisch bearbeitet (z. B. Bastelarbeit, Experiment, Plakat).
          Beschreibe knapp, <strong>was</strong> der Schüler tun soll und <strong>wo</strong> er
          das Material findet. Digitale Lösungseingaben sind hier nicht vorgesehen.
        </span>
      </div>

      <div className="space-y-2">
        <Label>Aufgabentext / Auftrag</Label>
        <textarea
          value={beschreibung}
          onChange={(e) => onBeschreibung(e.target.value)}
          placeholder="z.B. Erstelle ein Plakat zum Thema Wasserkreislauf. Arbeite in Partnerarbeit."
          className="w-full px-3 py-2 border border-border rounded-lg min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hinweise_zum_material">
          Hinweise zum Material (Wo findet der Schüler was?)
        </Label>
        <textarea
          id="hinweise_zum_material"
          value={formData.hinweise_zum_material || ''}
          onChange={(e) => set('hinweise_zum_material', e.target.value)}
          placeholder='z.B. Schere, Klebstoff und Tonpapier liegen im Lehrerregal. Vorlagen findest du in der Schublade „Wasser".'
          className="w-full px-3 py-2 border border-border rounded-lg min-h-32 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </>
  );
}