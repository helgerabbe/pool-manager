import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench } from 'lucide-react';

/**
 * Kleiner Nachbesserungs-Dialog für die interaktive Aufgabe: Die Lehrkraft
 * beschreibt nur, WAS geändert werden soll (z. B. „der Auswerten-Button
 * reagiert nicht" oder „bitte grün statt blau"). Die bestehende Aufgabe wird
 * dann punktuell überarbeitet — nicht komplett neu erzeugt.
 */
export default function OffeneAufgabeImpulsFeld({ wert, onChange, onAnpassen, isBusy }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-700">
        Etwas nachbessern? Kurz beschreiben — die Aufgabe bleibt erhalten und wird nur an dieser Stelle geändert.
      </p>
      <Textarea
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder='z. B. „Der Button ganz unten reagiert nicht" oder „Bitte grüne Farben statt blau"'
        className="text-sm bg-white"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={onAnpassen}
          disabled={isBusy || !wert.trim()}
        >
          {isBusy
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird angepasst…</>
            : <><Wrench className="w-4 h-4" /> Nur das anpassen</>}
        </Button>
      </div>
    </div>
  );
}