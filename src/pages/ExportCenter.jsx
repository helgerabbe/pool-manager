/**
 * pages/ExportCenter.jsx
 *
 * Phase G + Phase I — Hauptarbeitsplatz des Moodle-Spezialisten.
 *
 * Nach der Air-Gap-Konsolidierung gibt es nur noch eine Ansicht:
 * den Einheiten-Export (Split-Screen mit Einheiten-Liste links + Air-Gap-
 * Tabs-Panel rechts). Der frühere „MBK-Prompt-Manager"-Tab ist entfallen,
 * weil seine Inhalte (globale KI-Prompts) vollständig im Tab „3 · Globale
 * KI" des Air-Gap-Workflows abgedeckt sind.
 *
 * Die Anleitung samt kontextspezifischem Operator Action Plan liegt
 * weiterhin im Header-Button → AnleitungModal.
 */

import React, { useState } from 'react';
import { Send, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelpBadge from '@/components/ui/HelpBadge';
import ExportCenterEinheitenList from '@/components/exportcenter/ExportCenterEinheitenList';
import ExportCenterArbeitsbereich from '@/components/exportcenter/ExportCenterArbeitsbereich';
import AnleitungModal from '@/components/exportcenter/v2/AnleitungModal';

export default function ExportCenter() {
  const [selectedEinheitId, setSelectedEinheitId] = useState(null);
  const [anleitungOpen, setAnleitungOpen] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Export-Center
              <HelpBadge
                text="Arbeitsplatz für den Moodle-Spezialisten: Einheiten an die MBK übergeben."
                docsSlug="export-workflow"
              />
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Übergabe an Moodle und Brian.study via Air-Gap-Payloads.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnleitungOpen(true)}
            className="gap-1.5"
            title="Nachschlagewerk: Was tun bei welchem Drift-Szenario?"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Anleitung
          </Button>
        </div>
      </div>

      <AnleitungModal
        open={anleitungOpen}
        onOpenChange={setAnleitungOpen}
        einheitId={selectedEinheitId}
      />

      {/* Split-Screen: Einheiten-Liste + Arbeitsbereich */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="flex h-full overflow-hidden min-h-0">
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
    </div>
  );
}