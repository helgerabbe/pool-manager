/**
 * LernlandkarteVorschauInhalt.jsx
 *
 * Lehrer-Vorschau der Lernlandkarte — dieselbe Ansicht, die Schüler sehen
 * (gemeinsame Komponente LernlandkarteAnsicht). Unterschied: Es wird nichts
 * gespeichert und nichts geöffnet; die Lehrkraft kann gefahrlos stöbern und
 * prüfen, ob Leitfragen und Struktur tragen.
 */
import React, { useState } from 'react';
import LernlandkarteAnsicht from '@/components/lernlandkarte/LernlandkarteAnsicht';

export default function LernlandkarteVorschauInhalt({
  einheitTitel,
  themenfelder,
  lernpakete,
  lernziele,
  aufgaben,
  vorwissenPakete,
  lerntyp = 'ehrgeizig',
}) {
  // Nur lokal: „Kann ich schon" zum Ausprobieren, ohne Speichern.
  const [lokal, setLokal] = useState({});

  return (
    <LernlandkarteAnsicht
      einheitTitel={einheitTitel}
      themenfelder={themenfelder || []}
      lernpakete={lernpakete || []}
      lernziele={lernziele || []}
      aufgaben={aufgaben || []}
      vorwissenPakete={vorwissenPakete || []}
      lerntyp={lerntyp}
      einschaetzungByZiel={lokal}
      onMarkieren={(node, stufe) =>
        setLokal((prev) => ({ ...prev, [node.refs.lernzielId]: stufe ?? null }))
      }
    />
  );
}