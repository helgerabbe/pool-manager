/**
 * Direkthilfe im Bereich „Meine Unterrichtsstunden": erklärt in 4 Schritten,
 * wie eine geplante Stunde über Moodle bei den Schülern landet.
 */
import React from 'react';
import { GraduationCap, Link2, PartyPopper, Hammer } from 'lucide-react';

const SCHRITTE = [
  {
    icon: Hammer,
    titel: '1. Unterrichtsstunde hier bauen',
    text: 'Planen Sie die Stunde im Regieblatt: Phasen, Materialien, digitale Aufgaben. Über das Register „Schüleransicht" prüfen Sie jederzeit, was die Schüler sehen.',
  },
  {
    icon: Link2,
    titel: '2. Stunden-Code kopieren',
    text: 'Jede Stunde hat einen eigenen Code. Sie finden ihn in der Stunde im Register „Moodle-Übergabe" — ein Klick auf „Kopieren" genügt.',
  },
  {
    icon: GraduationCap,
    titel: '3. Code in Moodle einfügen',
    text: 'In Moodle die Aktivität „Externes Tool" anlegen, als vorkonfiguriertes Tool „Pool-Manager" wählen und den Code in das Feld „Angepasste Parameter" einfügen.',
  },
  {
    icon: PartyPopper,
    titel: '4. Fertig — Schüler legen los',
    text: 'Die Schüler:innen klicken in Moodle auf den Link und starten direkt in dieser Stunde — ohne eigenes Konto. Die Phasen schalten sie mit Ihren Codes frei.',
  },
];

export default function StundenMoodleWegInfoBox() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-blue-700" />
        <h3 className="text-sm font-bold text-blue-900">
          Wie kommt meine Unterrichtsstunde zu den Schülern nach Moodle?
        </h3>
      </div>
      <p className="text-xs text-blue-800/80 mb-3">
        Vier Schritte — danach starten Ihre Schüler:innen die Stunde direkt aus dem Moodle-Kurs.
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
    </div>
  );
}