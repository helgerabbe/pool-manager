import React from 'react';
import InfoHint from '@/components/lernpfade/InfoHint';

/** Erklärt die drei Einstellungen einer Aufgabenzeile: Auswahl, Niveau, Pflicht/Wahl. */
export default function AufgabenEinstellungenHilfe({ imLernpaket }) {
  const ort = imLernpaket ? 'das Lernpaket' : 'das Themenfeld';
  return (
    <div className="flex items-center justify-end gap-3 flex-wrap text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-0.5">
        Auswahl
        <InfoHint title="Auswahl: Alle oder X von N">
          Eine Aufgabe besteht aus mehreren Elementen. Bei „Alle“ bearbeitet jeder Schüler alle Elemente in der festen
          Reihenfolge. Bei „2 von 15“ bekommt jeder Schüler zufällig 2 der 15 Elemente, also nicht alle dieselben.
          Das eignet sich für Übungen mit vielen gleichartigen Elementen.
        </InfoHint>
      </span>
      <span className="inline-flex items-center gap-0.5">
        Niveau
        <InfoHint title="Niveau: G, GE, E">
          Legt fest, welche Schüler die Aufgabe in ihrem Arbeitsplan sehen. G = Grundniveau, nur für Minimalist und
          Pragmatiker. GE = für alle. E = erweitertes Niveau, nur für Ehrgeizig und Passioniert.
        </InfoHint>
      </span>
      <span className="inline-flex items-center gap-0.5">
        Pflicht / Wahl
        <InfoHint title="Pflicht oder Wahl">
          Pflicht: Die Schüler müssen die Aufgabe bearbeiten, wenn sie {ort} bearbeiten. Wahl: Die Aufgabe ist ein
          freiwilliges Angebot und kann übersprungen werden.
        </InfoHint>
      </span>
    </div>
  );
}