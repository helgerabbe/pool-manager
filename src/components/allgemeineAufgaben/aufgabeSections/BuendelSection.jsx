import React from 'react';
import { Label } from '@/components/ui/label';
import LernpaketMultiSelect from '@/components/allgemeineAufgaben/LernpaketMultiSelect';

/**
 * BuendelSection
 * Moodle-Bündel: verlinkt N Lernpakete + lernpaket_logik (didaktische Reihenfolge).
 *
 * NEU in Sprint C: Selbsterklärendes Auswahlfeld für lernpaket_logik
 * (Standard / Fast-Track / Wissensspeicher / Zwischentest).
 */
const LOGIK_OPTIONEN = [
  {
    value: 'standard',
    label: 'Standard',
    hint: 'Input → Übung → Test',
  },
  {
    value: 'fast_track',
    label: 'Fast-Track',
    hint: 'Test vorgezogen (Input → Test → Übung)',
  },
  {
    value: 'wissensspeicher',
    label: 'Wissensspeicher',
    hint: 'Nur Input fix, Rest in freier Reihenfolge',
  },
  {
    value: 'test_only',
    label: 'Zwischentest',
    hint: 'Nur das Test-Modul ist aktiv',
  },
];

export default function BuendelSection({ einheitId, formData, set, beschreibung, onBeschreibung }) {
  const logik = formData.lernpaket_logik || 'standard';

  return (
    <>
      <LernpaketMultiSelect
        einheitId={einheitId}
        selectedIds={formData.verlinkte_lernpaket_ids || []}
        onChange={(ids) => set('verlinkte_lernpaket_ids', ids)}
      />

      <div className="space-y-2">
        <Label>Didaktische Reihenfolge im Bündel</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LOGIK_OPTIONEN.map((opt) => {
            const active = logik === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('lernpaket_logik', opt.value)}
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
          placeholder="z.B. Bearbeite die folgenden Pakete in eigenem Tempo."
          className="w-full px-3 py-2 border border-border rounded-lg min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </>
  );
}