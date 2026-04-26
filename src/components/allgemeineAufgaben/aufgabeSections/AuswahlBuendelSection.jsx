import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AuswahlAufgabenMultiSelect from '@/components/allgemeineAufgaben/AuswahlAufgabenMultiSelect';

/**
 * AuswahlBuendelSection
 * Brian-Bündel mit X-von-Y-Auswahl auf Aufgabenebene.
 *  - erforderliche_anzahl: Wie viele Aufgaben müssen mindestens erledigt werden? (0 = alle).
 *  - interne_reihenfolge: 'frei' | 'sequenziell'.
 *
 * Hinweis: Die eigentliche Aufgaben-Auswahl (Multi-Select für verlinkte_aufgaben_ids)
 * folgt in einem späteren Sprint – die Felder werden hier bereits sauber gepflegt.
 */
const REIHENFOLGE_OPTIONEN = [
  {
    value: 'frei',
    label: 'Freie Reihenfolge',
    hint: 'Schüler wählt selbst, in welcher Reihenfolge bearbeitet wird.',
  },
  {
    value: 'sequenziell',
    label: 'Sequenziell',
    hint: 'Aufgaben werden in der Listenreihenfolge abgearbeitet.',
  },
];

export default function AuswahlBuendelSection({
  einheitId,
  excludeAufgabeId = null,
  formData,
  set,
  beschreibung,
  onBeschreibung,
}) {
  const reihenfolge = formData.interne_reihenfolge || 'frei';
  const anzahl = Number.isFinite(formData.erforderliche_anzahl) ? formData.erforderliche_anzahl : 0;

  return (
    <>
      <AuswahlAufgabenMultiSelect
        einheitId={einheitId}
        excludeAufgabeId={excludeAufgabeId}
        selectedIds={formData.verlinkte_aufgaben_ids || []}
        onChange={(ids) => set('verlinkte_aufgaben_ids', ids)}
      />

      <div className="space-y-2">
        <Label htmlFor="erforderliche_anzahl">
          Wie viele Aufgaben müssen mindestens erledigt werden?
        </Label>
        <Input
          id="erforderliche_anzahl"
          type="number"
          min={0}
          step={1}
          value={anzahl}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            set('erforderliche_anzahl', Number.isFinite(v) && v >= 0 ? v : 0);
          }}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          <strong>0</strong> = alle verlinkten Aufgaben sind Pflicht. Andernfalls X von Y.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Bearbeitungsreihenfolge im Bündel</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REIHENFOLGE_OPTIONEN.map((opt) => {
            const active = reihenfolge === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('interne_reihenfolge', opt.value)}
                className={`text-left rounded-lg border px-3 py-2 transition-all ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Beschreibung (optional)</Label>
        <textarea
          value={beschreibung}
          onChange={(e) => onBeschreibung(e.target.value)}
          placeholder="z.B. Wähle Aufgaben aus, die zu deinem Lernziel passen."
          className="w-full px-3 py-2 border border-border rounded-lg min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </>
  );
}