import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Eye, Link2, PartyPopper, ArrowRight, Hammer } from 'lucide-react';

/**
 * Direkthilfe im Privatbereich: erklärt Laien in 4 einfachen Schritten,
 * wie die selbst gebaute Einheit zu den Schülern nach Moodle kommt.
 */
const SCHRITTE = [
  {
    icon: Hammer,
    titel: '1. Einheit fertig bauen',
    text: 'Legen Sie Themenfelder, Aufgaben und mindestens ein Schüler-Dashboard an. Die Einheit muss dafür nicht perfekt sein — Sie können jederzeit weiterarbeiten.',
  },
  {
    icon: Eye,
    titel: '2. Aus Schülersicht prüfen',
    text: 'Klicken Sie auf das Auge-Symbol Ihrer Einheiten-Karte. Sie sehen die Einheit genau so, wie Ihre Schüler:innen sie später sehen werden.',
  },
  {
    icon: Link2,
    titel: '3. Link im Moodle-Kurs anlegen',
    text: 'In Ihrem Moodle-Kurs wird ein „Externes Tool" angelegt, das auf Ihre Einheit zeigt. Das übernimmt in der Regel Ihr Moodle-Spezialist — sagen Sie einfach Bescheid, welche Einheit verknüpft werden soll.',
  },
  {
    icon: PartyPopper,
    titel: '4. Fertig — Schüler legen los',
    text: 'Ihre Schüler:innen klicken in Moodle auf den Link und landen direkt in Ihrer Einheit — ganz ohne eigenes Konto. Ihr Lernfortschritt wird automatisch gespeichert.',
  },
];

export default function MoodleWegInfoBox() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-blue-700" />
        <h2 className="text-sm font-bold text-blue-900">
          Wie kommt meine Einheit zu den Schülern nach Moodle?
        </h2>
      </div>
      <p className="text-xs text-blue-800/80 mb-4">
        Ihre Einheit bleibt hier in der App — die Schüler:innen erreichen sie über einen einfachen Link in ihrem Moodle-Kurs. So geht's:
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

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-blue-800/70">
          Voraussetzung: Die Moodle-Verbindung wird <strong>einmalig</strong> von Ihrer Administration eingerichtet — darum müssen Sie sich nicht kümmern.
        </p>
        <Link
          to="/docs/moodle-anbindung"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors shrink-0"
        >
          Ausführliche Anleitung
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}