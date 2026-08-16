/**
 * Ausführliche Anleitung für das Register „Aufgabe für Brian beschreiben“:
 * Brian kann die Schülerantworten nur sinnvoll begleiten, wenn er die Aufgabe,
 * das Material und die Erwartungen der Lehrkraft kennt.
 */
import React from 'react';
import { Lightbulb } from 'lucide-react';

const LEITFRAGEN = [
  'Worum geht es in dieser Aufgabe – welches Thema, welcher Kontext?',
  'Welches Material haben die Schüler vor sich (Arbeitsblatt, Text, Bild, Video, Tafelbild)? Was sehen sie darin?',
  'Was genau sollen die Schüler tun – und in welchen Schritten bzw. in welcher Reihenfolge?',
  'Worauf kommt es Ihnen fachlich an? Was muss eine gute Bearbeitung enthalten?',
  'Was ist zu beachten: typische Fehler, Stolperstellen, Besonderheiten, Fachbegriffe?',
  'Wie soll Brian reagieren – nachfragen, Hinweise geben, auf Vollständigkeit pochen?',
];

export default function StundenBrianBeschreibungHilfe() {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-3 space-y-2">
      <p className="text-xs text-violet-950">
        Beschreiben Sie die Aufgabe hier <span className="font-semibold">so ausführlich, wie Sie es einer
        Kollegin erklären würden</span>. Das Material selbst können Sie bei Brian hochladen – aber was Sie
        sich bei der Aufgabe zusätzlich denken (Ziel, Arbeitsschritte, Erwartungen, Stolperstellen), weiß
        Brian nur, wenn es hier steht. Dieser Text ist nicht schülersichtbar.
      </p>
      <ul className="text-xs text-violet-950 space-y-1 list-disc pl-4">
        {LEITFRAGEN.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <p className="text-xs text-violet-900 flex gap-1.5">
        <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold">Tipp:</span> Sprechen Sie den Text einfach über das Mikrofon ein –
          oder besprechen Sie die Aufgabe vorab mit einer KI, laden Ihr Material (Arbeitsblatt, Bild, Text)
          dort hoch und lassen sich diese Beschreibung ausformulieren. Das Ergebnis fügen Sie hier ein.
        </span>
      </p>
    </div>
  );
}