import React from 'react';
import InfoHint from '@/components/lernpfade/InfoHint';

/** Ein Fragezeichen, das die drei Einstellungen einer Aufgabenzeile erklärt: Auswahl, Niveau, Pflicht/Wahl. */
export default function AufgabenEinstellungenHilfe({ imLernpaket }) {
  const ort = imLernpaket ? 'das Lernpaket' : 'das Themenfeld';
  return (
    <InfoHint title="Einstellungen einer Aufgabe">
      <p>
        <strong>Auswahl:</strong> Bei „Alle“ bearbeitet jeder Schüler alle Elemente der Aufgabe in der festen
        Reihenfolge. Bei „2 von 15“ bekommt jeder Schüler zufällig 2 der 15 Elemente.
      </p>
      <p className="mt-1.5">
        <strong>Niveau:</strong> Legt fest, welche Schüler die Aufgabe sehen. G = Grundniveau, nur für Minimalist und
        Pragmatiker. GE = für alle. E = erweitertes Niveau, nur für Ehrgeizig und Passioniert.
      </p>
      <p className="mt-1.5">
        <strong>Pflicht / Wahl:</strong> Pflicht muss bearbeitet werden, wenn die Schüler {ort} bearbeiten. Wahl ist
        ein freiwilliges Angebot und kann übersprungen werden.
      </p>
    </InfoHint>
  );
}