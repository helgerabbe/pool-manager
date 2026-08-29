import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import useAufgabenGenerator from '@/hooks/useAufgabenGenerator';
import useWerkstattStaende from '@/hooks/useWerkstattStaende';
import GespraechsSpalte from '@/components/werkstatt/GespraechsSpalte';
import StaendeLeiste from '@/components/werkstatt/StaendeLeiste';
import { fragmentZuDokument } from '@/lib/aufgabeFragment';

/**
 * OffenerSchrittGespraech
 * ───────────────────────
 * Das Bauen EINES offenen Schritts: Gespräch, gespeicherte Zwischenstände,
 * Übernehmen.
 *
 * WICHTIG — diese Komponente muss vom Aufrufer mit `key={schritt.id}`
 * eingesetzt werden. `useAufgabenGenerator` liest sein Startfragment nur
 * beim ersten Rendern; ohne key würde beim Wechsel des Schritts das
 * Gespräch des vorigen weiterlaufen und die Antworten zum falschen Schritt
 * verfälschen. Der key erzwingt einen frischen Start je Schritt.
 *
 * Zwei Ebenen von Ständen liegen hier übereinander:
 *   - die Sitzungsstände des Generators (schnell, flüchtig)
 *   - die gespeicherten Stände als eigene Datensätze (überleben das Fenster)
 * Jeder neu erzeugte Sitzungsstand wird einmal gesichert.
 */
export default function OffenerSchrittGespraech({
  schritt,
  aufgabeId,
  kontext,
  isReleased = false,
  onUebernehmen,   // (fragment, snapshotHtml) => void
}) {
  const gen = useAufgabenGenerator({
    kontext,
    startFragment: schritt?.offen?.fragment || '',
  });
  const staende = useWerkstattStaende({ aufgabeId, schrittId: schritt?.id });

  const [eingabe, setEingabe] = useState('');

  // Wie viele Sitzungsstände bereits gesichert wurden. Ohne das würde jeder
  // Rerender denselben Stand erneut schreiben.
  const gesichertBisRef = useRef(0);
  const letzteNachrichtRef = useRef('');

  const { aktiv, hinzufuegen } = staende;
  useEffect(() => {
    if (!aktiv || gen.busy) return;
    if (gen.staende.length <= gesichertBisRef.current) return;
    const frisch = gen.staende.slice(gesichertBisRef.current);
    gesichertBisRef.current = gen.staende.length;
    frisch.forEach((st) => {
      // Ein aus dem Verlauf geladener Stand steht dort schon — nicht doppeln.
      if (st.label === 'Geladener Stand') return;
      hinzufuegen(st.fragment, { anlass: letzteNachrichtRef.current });
    });
  }, [gen.staende, gen.busy, aktiv, hinzufuegen]);

  const abschicken = () => {
    const t = eingabe.trim();
    if (!t || gen.busy) return;
    letzteNachrichtRef.current = t;
    setEingabe('');
    gen.senden(t);
  };

  const uebernehmen = () => {
    if (!gen.fragment) return;
    onUebernehmen(gen.fragment, fragmentZuDokument(gen.fragment));
    const passend = staende.staende.find((st) => st.fragment === gen.fragment);
    if (passend) staende.alsUebernommenMarkieren(passend.id);
  };

  return (
    <>
      <GespraechsSpalte
        gen={gen}
        eingabe={eingabe}
        onEingabe={setEingabe}
        onAbschicken={abschicken}
        disabled={isReleased}
        className="flex-1 min-h-[220px]"
        platzhalter="Was soll dieser Schritt können?"
        leerText="Beschreiben Sie, was die Schüler in diesem Schritt tun sollen — ich baue daraus eine erste Fassung."
      />

      <div className="shrink-0 space-y-2">
        <StaendeLeiste
          staende={staende.staende}
          isLoading={staende.isLoading}
          aktiv={staende.aktiv}
          aktuellesFragment={gen.fragment}
          disabled={gen.busy || isReleased}
          onLaden={(st) => gen.setzeFragment(st.fragment, 'Geladener Stand')}
        />
        {gen.fragment && (
          <Button onClick={uebernehmen} disabled={gen.busy || isReleased} className="gap-2 w-full">
            Diesen Stand in den Schritt übernehmen
          </Button>
        )}
      </div>
    </>
  );
}
