import React from 'react';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';

/**
 * FachRollenEditor
 *
 * Zeigt – nur für die Basisrolle "Fachschaftsleitung" – pro zuständigem Fach
 * einen Umschalter an: Standard = Fachschaftsleitung, oder herabgestuft auf
 * "Nur Fachlehrkraft". Die Herabstufungen werden als `fach_ausnahmen`-Liste
 * ({ fach, rolle: 'Fachlehrkraft' }) gespeichert.
 *
 * Für alle anderen Basisrollen ist keine Fach-Ausnahme nötig:
 * - Fachlehrkraft ist ohnehin überall Fachlehrkraft.
 * - Admin / Moodle-Designer / Betrachter bekommen über die
 *   Fachbereich-Zugehörigkeit automatisch additiven Fachlehrkraft-Zugriff.
 */
export default function FachRollenEditor({ basisRolle, faecher = [], ausnahmen = [], onChange }) {
  // Normalisieren: jeden Eintrag in einzelne Fächer aufsplitten (falls ein
  // Eintrag versehentlich kommasepariert ist) und Duplikate entfernen.
  const faecherListe = Array.from(
    new Set(
      (faecher || [])
        .flatMap((f) => String(f).split(',').map((s) => s.trim()))
        .filter(Boolean)
    )
  );

  if (basisRolle !== 'Fachschaftsleitung' || faecherListe.length === 0) {
    // Hinweis für Moodle-Designer: additiver Lehrkraft-Zugriff
    if (basisRolle === 'Moodle-Designer' && faecherListe.length > 0) {
      return (
        <div className="flex items-start gap-2 rounded-lg border bg-blue-50/60 p-3 text-xs text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Als Moodle-Designer erhält diese Person in den oben gewählten Fächern
            zusätzlich <strong>Fachlehrkraft</strong>-Zugriff.
          </span>
        </div>
      );
    }
    return null;
  }

  const istHerabgestuft = (fach) =>
    (ausnahmen || []).some((a) => a.fach === fach && a.rolle === 'Fachlehrkraft');

  const setRolleFuerFach = (fach, nurLehrkraft) => {
    const ohne = (ausnahmen || []).filter((a) => a.fach !== fach);
    onChange(nurLehrkraft ? [...ohne, { fach, rolle: 'Fachlehrkraft' }] : ohne);
  };

  return (
    <div className="space-y-2">
      <Label>Rolle pro Fach</Label>
      <p className="text-xs text-muted-foreground">
        Standardmäßig Fachschaftsleitung in allen Fächern. Für einzelne Fächer kann auf
        „Nur Fachlehrkraft" herabgestuft werden.
      </p>
      <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
        {faecherListe.map((fach) => {
          const herab = istHerabgestuft(fach);
          return (
            <div key={fach} className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm font-medium">{fach}</span>
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setRolleFuerFach(fach, false)}
                  className={`px-3 py-1.5 transition-colors ${
                    !herab
                      ? 'bg-purple-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Fachschaftsleitung
                </button>
                <button
                  type="button"
                  onClick={() => setRolleFuerFach(fach, true)}
                  className={`px-3 py-1.5 border-l transition-colors ${
                    herab
                      ? 'bg-blue-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Nur Fachlehrkraft
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}