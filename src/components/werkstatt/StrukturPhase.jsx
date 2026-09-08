import React, { useState } from 'react';
import GespraechsSpalte from '@/components/werkstatt/GespraechsSpalte';
import AblaufVorschlagListe from '@/components/werkstatt/AblaufVorschlagListe';

/**
 * StrukturPhase — Bereich 2 der Werkstatt: NUR der Ablauf.
 *
 * Links das Gespräch, rechts der Ablauf, an dem gerade geplant wird. Keine
 * Schülervorschau, keine Inhalte — hier werden Anzahl, Reihenfolge und Art
 * der Schritte festgelegt. Jede Nachricht an den Assistenten ändert den
 * rechts sichtbaren Ablauf. Übernommen wird erst auf Knopfdruck.
 */
export default function StrukturPhase({
  struktur,
  hatSchritte,
  onUebernehmen,   // (vorschlag) => void
  onZurueck,       // ohne Änderung zurück zu den Aufgaben
  disabled = false,
}) {
  const [eingabe, setEingabe] = useState('');

  const abschicken = () => {
    const t = eingabe.trim();
    if (!t || struktur.busy) return;
    setEingabe('');
    struktur.senden(t);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_minmax(380px,1.2fr)] gap-4 h-full min-h-0">
      <GespraechsSpalte
        gen={struktur}
        eingabe={eingabe}
        onEingabe={setEingabe}
        onAbschicken={abschicken}
        disabled={disabled}
        className="min-h-[300px]"
        platzhalter={struktur.vorschlag?.length
          ? 'Was soll am Ablauf anders sein? z. B. „Mach daraus vier Schritte“ oder „Schritt 2 als Lückentext“'
          : 'Worum geht es in dieser Aufgabe? Was sollen die Schüler am Ende können?'}
        leerText="Beschreiben Sie kurz, worum es gehen soll — ich schlage einen Ablauf vor. Gebaut wird hier nichts; die Aufgaben selbst arbeiten Sie im nächsten Bereich aus."
      />
      <AblaufVorschlagListe
        vorschlag={struktur.vorschlag}
        warnungen={struktur.warnungen}
        busy={struktur.busy}
        hatSchritte={hatSchritte}
        disabled={disabled}
        onUebernehmen={onUebernehmen}
        onZuruecksetzen={struktur.zuruecksetzen}
        onZurueck={onZurueck}
      />
    </div>
  );
}