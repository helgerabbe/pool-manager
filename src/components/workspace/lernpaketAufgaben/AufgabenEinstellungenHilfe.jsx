import React from 'react';
import InfoHint from '@/components/lernpfade/InfoHint';

/** Ein Fragezeichen, das die Einstellungen einer Aufgabenzeile erklärt: Niveau und Pflicht/Wahl. */
export default function AufgabenEinstellungenHilfe({ imLernpaket }) {
  const ort = imLernpaket ? 'das Lernpaket' : 'das Themenfeld';
  return (
    <InfoHint title="Einstellungen einer Aufgabe">
      <p>
        <strong>Niveau:</strong> Legt fest, welche Schüler die Aufgabe sehen. G = Grundniveau, nur für Minimalist und
        Pragmatiker. GE = für alle. E = erweitertes Niveau, nur für Ehrgeizig und Passioniert.
      </p>
      <p className="mt-1.5">
        <strong>P / F:</strong> P = Pflicht, muss bearbeitet werden, wenn die Schüler {ort} bearbeiten. F = freiwillig,
        ein Angebot, das übersprungen werden kann.
      </p>
    </InfoHint>
  );
}