/**
 * pages/ExportCenter.jsx
 *
 * Phase G — Eigenständiger Hauptbereich für den Moodle-Export-Spezialisten.
 *
 * Aufbau (Split-Screen):
 *   - Links: Master-Tabelle aller Einheiten mit Status & Drift-Badge
 *     (Komponente: ExportCenterEinheitenList)
 *   - Rechts: Arbeitsbereich für die ausgewählte Einheit
 *     (Komponente: ExportCenterArbeitsbereich)
 *
 * Diese Page hält ausschließlich die Auswahl-State (selectedEinheitId)
 * und delegiert die Inhalts-Logik an die beiden Sub-Komponenten.
 *
 * Routing: wird in App.jsx als /export-center eingehängt und im AppLayout
 * über permissions.kannExportBedienen ein-/ausgeblendet.
 */

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import HelpBadge from '@/components/ui/HelpBadge';
import ExportCenterEinheitenList from '@/components/exportcenter/ExportCenterEinheitenList';
import ExportCenterArbeitsbereich from '@/components/exportcenter/ExportCenterArbeitsbereich';

export default function ExportCenter() {
  const [selectedEinheitId, setSelectedEinheitId] = useState(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border bg-card">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Export-Center
          <HelpBadge
            text="Arbeitsplatz für den Moodle-Spezialisten: Einheit auswählen, Delta prüfen, MBK-Prompts kopieren, Export bestätigen."
            docsSlug="export-workflow"
          />
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Einheiten zur Übergabe an Moodle und Brian.study auswählen und freigeben.
        </p>
      </div>

      {/* Split-Screen */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-[380px] shrink-0 border-r border-border bg-card overflow-hidden flex flex-col">
          <ExportCenterEinheitenList
            selectedEinheitId={selectedEinheitId}
            onSelect={setSelectedEinheitId}
          />
        </aside>
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <ExportCenterArbeitsbereich einheitId={selectedEinheitId} />
        </main>
      </div>
    </div>
  );
}