/**
 * SystembausteineTab.jsx — Tab 4 (Platzhalter)
 *
 * Reserviert den Tab-Slot für die kommende Systembaustein-Generierung
 * (Ticket B). Der eigentliche Workflow (eigener Air-Gap-Payload-Typ,
 * lerntyp-spezifische Generierung, Eingefroren-Lifecycle) wird nach
 * Abstimmung mit der MBK-Entwicklung gebaut.
 *
 * Bewusst als eigene Komponente, damit der spätere Ersatz ohne Bruch
 * möglich ist.
 */
import React from 'react';
import { Construction, Info } from 'lucide-react';

export default function SystembausteineTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Construction className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base text-amber-900">
              Systembausteine — in Entwicklung
            </h3>
            <p className="text-sm text-amber-900/90 mt-1 max-w-2xl">
              Dieser Tab wird der Generierung der lerntyp-spezifischen
              Systembausteine (Einführung, Diagnose, Lernlandkarte,
              Exit-Ticket etc.) gewidmet. Die MBK erstellt diese on-the-fly
              je Lerntyp (Minimalist, Pragmatiker, Ehrgeizig, Passioniert).
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm space-y-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2 text-muted-foreground">
            <p>
              <strong className="text-foreground">Geplanter Funktionsumfang</strong> — wird in
              der nächsten Iteration spezifiziert und mit der MBK-Entwicklung abgestimmt:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Eigener Air-Gap-Payload-Typ <code className="bg-muted px-1 rounded">mbk_systembaustein_payload</code></li>
              <li>Lerntyp-Varianten pro Baustein (1 Briefing → 4 Antworten)</li>
              <li>Lifecycle „eingefroren": einmal generiert, nur explizit regenerierbar</li>
              <li>Persistenz analog zu den anderen Payloads in <code className="bg-muted px-1 rounded">ExportPrompts</code></li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic px-1">
        Bis zur Fertigstellung dieses Tabs werden Systembausteine über die
        bestehenden globalen Prompts und den Struktur-Payload mit-übergeben.
        Es geht also keine Information verloren.
      </p>
    </div>
  );
}