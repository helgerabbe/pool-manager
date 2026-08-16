import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { getAktivitaetSeite } from '@/lib/aktivitaetSeitenMap';

/**
 * Schüler-Seite einer DIGITALEN Phase: rendert die in der Phase verknüpfte
 * Aktivität mit genau derselben Darstellung wie im Pool-Manager – direkt aus
 * den gespeicherten Daten (aktivitaet_id + field_values).
 */
export default function StundenDigitalSeite({ phase, kat, onWeiter, onZurueck }) {
  const Seite = getAktivitaetSeite(kat?.name);

  if (!Seite) {
    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
        <div className="flex-1 min-h-0 flex items-center justify-center text-center">
          <p className="text-sm text-amber-700 inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {kat?.name
              ? `Für „${kat.name}“ ist die Schüleransicht noch nicht hinterlegt.`
              : 'Für diesen Schritt ist noch keine digitale Aufgabe eingerichtet.'}
          </p>
        </div>
        <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2" onClick={onZurueck}>
            <ArrowLeft className="w-4 h-4" /> Zurück
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={onWeiter}>
            Weiter <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Die Schüler-Seiten erwarten eine „Aktivität" mit field_values – die Phase
  // liefert sie im identischen Format.
  const aktivitaet = {
    id: phase.id,
    aktivitaet_id: phase.aktivitaet_id,
    field_values: phase.field_values || {},
  };

  return (
    <Seite
      aktivitaet={aktivitaet}
      kat={kat}
      lernpaketTitel={phase.phasenname}
      busy={false}
      onErledigt={onWeiter}
      onBack={onZurueck}
    />
  );
}