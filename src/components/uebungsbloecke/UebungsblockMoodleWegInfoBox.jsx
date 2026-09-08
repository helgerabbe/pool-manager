/**
 * Direkthilfe im Bereich „Meine Übungsblöcke": erklärt in 4 Schritten, wie ein
 * fertiger Übungsblock über Moodle bei den Schüler:innen landet. Technisch ist
 * ein Übungsblock eine private Einheit — der Weg läuft deshalb über den
 * Einheiten-Code (Ketten-Symbol an der Kachel).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Link2, PartyPopper, Hammer, ArrowRight } from 'lucide-react';

const SCHRITTE = [
  {
    icon: Hammer,
    titel: '1. Übungsblock hier füllen',
    text: 'Öffnen Sie den Block und legen Sie Lernpakete und Aufgaben an. Über die Schüleransicht prüfen Sie jederzeit, was die Schüler:innen sehen.',
  },
  {
    icon: Link2,
    titel: '2. Block-Code kopieren',
    text: 'Jeder Übungsblock hat einen eigenen Code. Klicken Sie auf das Ketten-Symbol an der Kachel und kopieren Sie den angezeigten Code.',
  },
  {
    icon: GraduationCap,
    titel: '3. Code in Moodle einfügen',
    text: 'In Moodle die Aktivität „Externes Tool" anlegen, als vorkonfiguriertes Tool „Pool-Manager" wählen und den Code in das Feld „Angepasste Parameter" einfügen.',
  },
  {
    icon: PartyPopper,
    titel: '4. Fertig — Schüler legen los',
    text: 'Die Schüler:innen klicken in Moodle auf den Link und landen direkt in diesem Übungsblock — ohne eigenes Konto. Der Fortschritt wird automatisch gespeichert.',
  },
];

export default function UebungsblockMoodleWegInfoBox() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-blue-700" />
        <h3 className="text-sm font-bold text-blue-900">
          Wie kommt mein Übungsblock zu den Schülern nach Moodle?
        </h3>
      </div>
      <p className="text-xs text-blue-800/80 mb-3">
        Vier Schritte — danach öffnen Ihre Schüler:innen den Block direkt aus dem Moodle-Kurs.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCHRITTE.map((s) => (
          <div key={s.titel} className="rounded-lg border border-blue-200 bg-card p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-xs font-semibold text-foreground">{s.titel}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Link
          to="/docs/moodle-anbindung"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
        >
          Ausführliche Anleitung
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}