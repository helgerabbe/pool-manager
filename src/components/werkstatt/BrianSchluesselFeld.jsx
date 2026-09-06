import React from 'react';
import { Button } from '@/components/ui/button';
import { KeyRound, Dices } from 'lucide-react';
import { neueSchluessel, hatSchluessel, MINDESTDAUER_MINUTEN } from '@/lib/brianSchluessel';

/**
 * Die beiden Schlüsselcodes eines Brian-Gesprächs — für die Lehrkraft sichtbar.
 *
 * Der Schüler kann das Gespräch nur mit einem dieser Codes abschließen; Brian
 * nennt sie nach den Regeln in lib/brianSchluessel. Neu würfeln, sobald ein
 * Code erkennbar in der Klasse herumgeht.
 */
export default function BrianSchluesselFeld({ schluessel, onChange, kannBearbeiten }) {
  const gesetzt = hatSchluessel(schluessel);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" /> Schlüsselcodes
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nachweis, dass das Gespräch stattgefunden hat. Fließt beim Generieren in die interne Anweisung ein — nach dem Würfeln also neu generieren.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        {gesetzt ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">Vollständig bearbeitet</p>
              <p className="text-xl font-bold tracking-widest text-emerald-900">{schluessel.vollstaendig}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Abgebrochen</p>
              <p className="text-xl font-bold tracking-widest text-amber-900">{schluessel.abbruch}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Noch keine Codes vergeben — ohne Codes schließen die Schüler das Gespräch wie bisher mit „Erledigt" ab.
          </p>
        )}

        {kannBearbeiten && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => onChange(neueSchluessel())}
          >
            <Dices className="w-3.5 h-3.5" />
            {gesetzt ? 'Codes neu würfeln' : 'Codes erzeugen'}
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground">
          Wer schneller als {MINDESTDAUER_MINUTEN} Minuten mit dem Vollständig-Code zurückkommt, muss zusätzlich bestätigen — das wird mitprotokolliert.
        </p>
      </div>
    </div>
  );
}