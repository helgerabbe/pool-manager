/**
 * pages/ExportCenter.jsx
 *
 * Phase G + Phase I — Hauptarbeitsplatz des Moodle-Spezialisten.
 *
 * Aufbau:
 *   - Header mit Titel + zwei Tabs:
 *       Tab 1 „Einheiten-Export": bestehender Split-Screen
 *         (Einheiten-Liste + Arbeitsbereich pro Einheit)
 *       Tab 2 „MBK-Prompt-Manager": globale Prompt-Bibliothek
 *         (Sidebar + Editor)
 *
 *   - Der Manager (Tab 2) ist nur für Administrator und Moodle-Designer
 *     überhaupt sichtbar — siehe useRBAC().rolle. Fachschaftsleitung sieht
 *     den Tab gar nicht. Schreibrechte werden zusätzlich serverseitig in
 *     `updateMBKGlobalPromptSecure` geprüft.
 *
 *   - State des aktiven Tabs wird im URL-Param `tab` gespiegelt, damit
 *     Refreshs / Deep-Links den Bereich behalten.
 */

import React, { useState, useEffect } from 'react';
import { Send, Library, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import HelpBadge from '@/components/ui/HelpBadge';
import ExportCenterEinheitenList from '@/components/exportcenter/ExportCenterEinheitenList';
import ExportCenterArbeitsbereich from '@/components/exportcenter/ExportCenterArbeitsbereich';
import MBKPromptManagerView from '@/components/exportcenter/promptmanager/MBKPromptManagerView';
import AnleitungModal from '@/components/exportcenter/v2/AnleitungModal';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';

const TABS = {
  EINHEITEN: 'einheiten',
  MANAGER: 'manager',
};

function readInitialTab() {
  if (typeof window === 'undefined') return TABS.EINHEITEN;
  const params = new URLSearchParams(window.location.search);
  const t = params.get('tab');
  return t === TABS.MANAGER ? TABS.MANAGER : TABS.EINHEITEN;
}

export default function ExportCenter() {
  const { rolle } = useRBAC();
  const [selectedEinheitId, setSelectedEinheitId] = useState(null);
  const [activeTab, setActiveTab] = useState(readInitialTab);
  const [anleitungOpen, setAnleitungOpen] = useState(false);

  // RBAC: Manager nur für Admin + Moodle-Designer.
  const darfManagerSehen = rolle === ROLLEN.ADMIN || rolle === ROLLEN.MOODLE;

  // Falls Tab-Param auf 'manager' steht, der Nutzer aber kein Recht hat:
  // freundlich auf 'einheiten' zurückfallen.
  useEffect(() => {
    if (activeTab === TABS.MANAGER && !darfManagerSehen) {
      setActiveTab(TABS.EINHEITEN);
    }
  }, [activeTab, darfManagerSehen]);

  // Tab-Wechsel im URL spiegeln — ohne Browser-History zu fluten.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (activeTab === TABS.MANAGER) params.set('tab', TABS.MANAGER);
    else params.delete('tab');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + Tabs */}
      <div className="shrink-0 px-6 pt-4 border-b border-border bg-card">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Export-Center
          <HelpBadge
            text="Arbeitsplatz für den Moodle-Spezialisten: Einheiten exportieren und globale KI-Anweisungen pflegen."
            docsSlug="export-workflow"
          />
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Übergabe an Moodle und Brian.study sowie Pflege der MBK-Prompt-Bibliothek.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value={TABS.EINHEITEN} className="gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Einheiten-Export
              </TabsTrigger>
              {darfManagerSehen && (
                <TabsTrigger value={TABS.MANAGER} className="gap-1.5">
                  <Library className="w-3.5 h-3.5" />
                  MBK-Prompt-Manager
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
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

      <AnleitungModal open={anleitungOpen} onOpenChange={setAnleitungOpen} />

      {/* Inhalte — wir rendern nur den aktiven Tab, damit Querys nicht
          unnötig parallel laufen. */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === TABS.EINHEITEN && (
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
        )}

        {activeTab === TABS.MANAGER && darfManagerSehen && (
          <MBKPromptManagerView />
        )}
      </div>
    </div>
  );
}