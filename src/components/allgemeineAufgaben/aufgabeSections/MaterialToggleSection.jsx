/**
 * MaterialToggleSection
 *
 * Toggle, mit dem die Lehrkraft direkt im Bearbeiten-Dialog umschalten
 * kann, ob die Aufgabe physisches Material in der Realität benötigt.
 *
 * Verhalten:
 *   - Aus  → aufgaben_typ='inhalt' (KI-Tutor-Aufgabe). Das Hinweis-Feld
 *            ist nicht sichtbar.
 *   - Ein  → aufgaben_typ='handlung' (Handlungsaufgabe). Das Pflicht-
 *            feld "Hinweise zum Material" wird eingeblendet.
 *
 * Wichtig: der Toggle ändert NUR `aufgaben_typ` und (beim Deaktivieren)
 * leert er das Hinweis-Feld, damit beim Speichern keine verwaisten Daten
 * stehen bleiben. Alle anderen Felder (Schwierigkeit, Ergebnis usw.)
 * bleiben unangetastet, da beide Typen denselben Funktionsumfang haben.
 */
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Hand, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MaterialToggleSection({ formData, set, disabled = false }) {
  const isHandlung = formData.aufgaben_typ === 'handlung';

  const handleToggle = (next) => {
    if (next) {
      set('aufgaben_typ', 'handlung');
    } else {
      set('aufgaben_typ', 'inhalt');
      // Hinweise leeren, damit kein Daten-Geist zurückbleibt.
      set('hinweise_zum_material', '');
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <div className={cn(
          'mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0',
          isHandlung ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        )}>
          {isHandlung ? <Hand className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <Label htmlFor="material-toggle" className="cursor-pointer">
            Aufgabe benötigt physisches Material
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHandlung
              ? 'Handlungsaufgabe – Schüler arbeiten mit echten Gegenständen (z. B. Versuch, Modell, Bastelarbeit).'
              : 'KI-Tutor-Aufgabe – rein digitale Bearbeitung am Computer.'}
          </p>
        </div>
        <Switch
          id="material-toggle"
          checked={isHandlung}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {isHandlung && (
        <div className="space-y-2 pt-1 border-t border-border">
          <Label htmlFor="hinweise_zum_material">
            Hinweise zum Material <span className="text-destructive">*</span>{' '}
            <span className="text-muted-foreground font-normal">(Wo findet der Schüler was?)</span>
          </Label>
          <textarea
            id="hinweise_zum_material"
            value={formData.hinweise_zum_material || ''}
            onChange={(e) => set('hinweise_zum_material', e.target.value)}
            placeholder='z.B. Schere, Klebstoff und Tonpapier liegen im Lehrerregal. Vorlagen findest du in der Schublade „Wasser".'
            className="w-full px-3 py-2 border border-border rounded-lg min-h-20 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}