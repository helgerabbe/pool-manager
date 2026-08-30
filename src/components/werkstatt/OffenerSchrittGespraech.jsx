import React, { useEffect, useRef, useState } from 'react';
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
 *
 * Der jeweils aktuelle Stand fließt SOFORT in den Entwurf des Schritts —
 * ohne Zwischenbestätigung. Vorher gab es dafür einen eigenen Knopf, und die
 * Vorschau daneben blieb bis zu dessen Klick leer: Der Assistent meldete
 * „fertig", rechts stand „noch keine Aufgabe gebaut". Eine Bestätigung
 * genügt, und das ist „Übernehmen" am Fuß des Fensters.
 */
export default function OffenerSchrittGespraech({
  schritt,
  aufgabeId,
  kontext,
  isReleased = false,
  onFragment,   // (fragment, snapshotHtml) => void — fließt in den Entwurf
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

  // Neuer Stand → sofort in den Entwurf, damit die Vorschau ihn zeigt.
  // Läuft auch beim Zurückspringen auf einen früheren Stand.
  const letztesGemeldetesRef = useRef(null);
  useEffect(() => {
    const f = gen.fragment;
    if (!f || gen.busy || f === letztesGemeldetesRef.current) return;
    letztesGemeldetesRef.current = f;
    onFragment?.(f, fragmentZuDokument(f));
    const passend = staende.staende.find((st) => st.fragment === f);
    if (passend) staende.alsUebernommenMarkieren(passend.id);
  }, [gen.fragment, gen.busy, onFragment, staende]);

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-2">
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
        {gen.fragment && !gen.busy && (
          <p className="text-xs text-emerald-700">
            Der aktuelle Stand steht rechts in der Vorschau. Mit „Übernehmen“ unten wird er Teil
            des Schritts.
          </p>
        )}
      </div>
    </div>
  );
}
