/**
 * BundleContainer.jsx
 *
 * Hierarchischer Container für Bündel-Bausteine (baustein_modus='bundle_1ton').
 * Gehört zum Read-Pfad des Dashboard-Epics (Phase 2 — siehe Logbuch §18).
 *
 * Rendert:
 *   - oben das Bündel-Pill selbst (über die normale SystemBausteinPill,
 *     die der Sektor schon kennt — wir bekommen das fertige Element als
 *     `headerSlot` durchgereicht, statt die Pill hier nachzubauen),
 *   - darunter eine Indigo-getönte Drop-Fläche für die Children,
 *   - jedes Child eingerückt mit dezentem Border-Akzent (border-l-2 ml-4).
 *
 * Phase 2 ist ein REINER Read-Pfad. Das heißt:
 *   - Hier werden NUR die Children gerendert, die bereits in der DB stehen.
 *   - Es gibt KEIN eigenes <Droppable> für Children — das schaltet erst
 *     Phase 3 (Strict-Drop) scharf. Aktuell stoßen die Children auf die
 *     gleiche Sektor-Drop-Zone wie Root-Items, weil alles im selben
 *     <Droppable>-Container liegt.
 *
 * Optik:
 *   - Token-Familie `bundle` aus tailwind.config.js (siehe Phase 1).
 *   - bg-bundle-soft + border-bundle-border + Akzent-Linke `border-bundle`.
 */

import React from 'react';

export default function BundleContainer({ headerSlot, children, isEmpty }) {
  return (
    <div
      data-bundle-container="true"
      className="rounded-md border border-bundle-border bg-bundle-soft/60 p-1.5 space-y-1.5"
    >
      {/* Header = das Bündel-Pill selbst (von außen reingereicht). */}
      {headerSlot}

      {/* Children-Spur: dezenter Akzent links, leichte Einrückung. */}
      <div className="ml-4 border-l-2 border-bundle/60 pl-3 py-0.5 space-y-1.5">
        {isEmpty ? (
          <div className="text-[10px] italic text-muted-foreground/70 py-0.5">
            Bündel ist leer – Lernpakete hierher ziehen.
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}