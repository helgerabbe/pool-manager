import React from 'react';
import { Info, Sparkles } from 'lucide-react';

/**
 * Erklär-Box für das Kompaktwissen (2026-08-13):
 * Kolleg:innen fragten wiederholt, was diese nicht löschbare Aktivität ist.
 * Die Box erklärt Zweck (Meta-/Überblickstext als Infobox für Schüler:innen)
 * und gibt den Arbeits-Tipp, das Kompaktwissen zuletzt per KI erstellen zu lassen.
 */
export default function KompaktwissenInfoBox() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-900 leading-relaxed">
          <p className="font-semibold mb-1">Standardelement in jedem Lernpaket</p>
          <p>
            Das Kompaktwissen ist fest in jeder Erarbeitungsphase enthalten und kann nicht
            entfernt werden. Es ist eine Art Infobox bzw. Meta-Text: Die Schüler:innen bekommen
            hier auf einen Blick zusammengefasst, worum es in diesem Lernpaket geht – die
            wichtigsten Begriffe, Definitionen und Merksätze. So können sie sich orientieren und
            beim Üben jederzeit etwas nachschlagen.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-950 leading-relaxed">
          <span className="font-semibold">Tipp:</span> Fülle zuerst das gesamte Lernpaket mit
          Inhalten und Aufgaben – und lass dir das Kompaktwissen erst am Schluss per KI erstellen.
          Dann passt die Zusammenfassung genau zu dem, was die Schüler:innen tatsächlich bearbeiten.
        </p>
      </div>
    </div>
  );
}