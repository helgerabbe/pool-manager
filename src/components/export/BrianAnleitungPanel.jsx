/**
 * BrianAnleitungPanel.jsx
 *
 * Ausführliche, aufklappbare Schritt-für-Schritt-Anleitung für Lehrkräfte:
 * Wie bekomme ich eine KI-Tutor-Aufgabe aus meiner (privaten) Einheit
 * händisch nach Brian.study? Analog zur Moodle-Anleitung auf Tab 1.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCHRITTE = [
  {
    titel: 'Aufgabe im Poolmanager fertigstellen',
    text: 'Bevor du etwas nach Brian überträgst, muss die Aufgabe hier vollständig sein: Aufgabenstellung, Erwartungshorizont und die vier Brian-Segmente (Dialogname, Anweisung für Lernende, System-Anweisung, Completion-Rule). Die Segmente lässt du dir im Aufgaben-Tab unter „KI-Tutor Prompt" per Knopfdruck generieren. Gib die Aufgabe anschließend frei — erst dann erscheint sie unten in der Liste mit dem grünen Badge „✓ Bereit".',
  },
  {
    titel: 'Brian.study öffnen und anmelden',
    text: 'Öffne brian.study im Browser und melde dich mit deinem Lehrkräfte-Konto an. Wechsle in den Lehrenden-Bereich (Dashboard für Lehrpersonen) — dort verwaltest du deine Lernumgebungen und Aufgaben.',
  },
  {
    titel: 'Die richtige Lernumgebung wählen',
    text: 'Wähle die Lernumgebung (bzw. den Kurs), die zu deiner Einheit gehört — oder lege eine neue an, falls es für diese Einheit noch keine gibt. Tipp: Benenne die Lernumgebung genauso wie deine Einheit im Poolmanager, dann findest du dich später sofort zurecht.',
  },
  {
    titel: 'Neue Aufgabe in Brian anlegen',
    text: 'Erstelle in der Lernumgebung eine neue Aufgabe (in Brian auch „Dialog" genannt). Brian öffnet dann ein Formular mit den Feldern, die du gleich befüllst.',
  },
  {
    titel: 'Die vier Segmente kopieren und einfügen',
    text: 'Klappe unten in der Liste die gewünschte Aufgabe auf. Du siehst die vier vorbereiteten Segmente, jedes mit einem eigenen Kopieren-Button: (1) Dialogname → Name/Titel der Aufgabe in Brian. (2) Anweisung für Lernende → das Feld, das die Schüler:innen als Aufgabenstellung sehen. (3) System-Anweisung → Brians Tutor-Verhalten (didaktische Regie, Erwartungshorizont; bei Aufgabensequenzen steckt hier auch der Schritt-Ablauf). (4) Completion-Rule → die Regel, wann die Aufgabe als geschafft gilt. Kopiere jedes Segment einzeln und füge es in das passende Brian-Feld ein — nichts umformulieren, die Texte sind bereits aufeinander abgestimmt.',
  },
  {
    titel: 'Bei Projektaufgaben: Bewertungsrubriken übernehmen',
    text: 'Zeigt die aufgeklappte Aufgabe zusätzlich Bewertungsrubriken (Punkt 5), trage diese in Brians Rubrik-/Bewertungsbereich ein: pro Rubrik den Titel, die Punktzahl und den Kriterientext. Die Rubriken lenken Brians Begleitung — sie sind keine starre Benotung.',
  },
  {
    titel: 'In Brian aus Schülersicht testen',
    text: 'Speichere die Aufgabe in Brian und starte sie einmal probeweise aus der Schüler-Perspektive (Vorschau-/Testfunktion). Prüfe: Begrüßt Brian passend? Hält er sich an die Regie (keine Lösungen verraten)? Erkennt er das Abschluss-Kriterium? Kleinigkeiten passt du direkt in Brian an.',
  },
  {
    titel: 'Brian-ID zurück in den Poolmanager eintragen',
    text: 'Kopiere die ID (und wenn vorhanden den direkten Link) der neu angelegten Brian-Aufgabe. Klicke dann unten in der Liste auf „Übertragen" und trage beides ein. Damit weiß der Poolmanager, dass die Aufgabe in Brian lebt — und die Verknüpfung wird bei jedem Export (z. B. für Moodle-Seiten) mitgegeben, sodass direkt auf die richtige Brian-Aufgabe verlinkt werden kann.',
  },
  {
    titel: 'Bei späteren Änderungen',
    text: 'Änderst du die Aufgabe im Poolmanager nachträglich, springt ihr Brian-Status automatisch auf „Geändert". Wiederhole dann die Schritte 5–8: aktualisierte Segmente kopieren, in der bestehenden Brian-Aufgabe ersetzen (nicht neu anlegen!) und die Übertragung hier erneut bestätigen.',
  },
];

export default function BrianAnleitungPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-indigo-50 transition-colors"
      >
        <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-900">
            Anleitung: So bekommst du deine Aufgaben nach Brian.study
          </p>
          <p className="text-xs text-indigo-700/80 mt-0.5">
            Schritt-für-Schritt erklärt — vom Kopieren der Segmente bis zur Rückmeldung der Brian-ID.
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-indigo-200 p-4 space-y-3 bg-card">
          {SCHRITTE.map((schritt, i) => (
            <div key={i} className="flex gap-3">
              <span
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5',
                  'bg-indigo-100 text-indigo-700'
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{schritt.titel}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{schritt.text}</p>
              </div>
            </div>
          ))}

          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>Wichtig:</strong> Das Anlegen in Brian erfolgt aktuell händisch per Kopieren &amp;
              Einfügen — es gibt (noch) keine automatische Übertragung. Der Poolmanager bereitet dir
              aber alle Texte fertig vor, sodass du pro Aufgabe nur wenige Minuten brauchst.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}