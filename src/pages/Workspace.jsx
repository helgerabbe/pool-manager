import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import ErrorBoundary from '@/components/errors/ErrorBoundary';
import { SkeletonWorkspace } from '@/components/loading/SkeletonLoader';
import SidebarTree from '@/components/workspace/SidebarTree';
import WorkspaceDetailPanel from '@/components/workspace/WorkspaceDetailPanel';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import { usePresence } from '@/hooks/usePresence';
import { isStructurallyLocked } from '@/hooks/useStructuralLock';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import StrukturBoardEmbedded from '@/components/workspace/StrukturBoardEmbedded';
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs';
import TaskCreationView from '@/components/workspace/TaskCreationView.jsx';
import EinheitUebersichtTab from '@/components/workspace/EinheitUebersichtTab';
import MoodleExportTab from '@/components/workspace/MoodleExportTab';
import ExportCockpitView from '@/components/export/ExportCockpitView';
import MoodleExportView from '@/components/export/MoodleExportView';
import AllgemeineAufgabenView from '@/components/allgemeineAufgaben/AllgemeineAufgabenView';
import ProjektaufgabenView from '@/components/projektaufgaben/ProjektaufgabenView';

export default function Workspace({ initialEinheitId: initialEinheitIdProp = null }) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialEinheitId = initialEinheitIdProp || urlParams.get('einheit') || null;

  const { permissions, authUser, rolle, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEinheitId, setSelectedEinheitId] = useState(initialEinheitId);
  const [selectedThemenfeldId, setSelectedThemenfeldId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('einheit');
  const [highlightedAtomIds, setHighlightedAtomIds] = useState(new Set());
  const [taskWorkshopActivityId, setTaskWorkshopActivityId] = useState(null);

  const fromWizard = new URLSearchParams(window.location.search).get('fromWizard') === '1';

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setHighlightedAtomIds(new Set());
    if (tab !== 'aufgaben') setTaskWorkshopActivityId(null);
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: einheiten = [], isLoading: einheitenLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date')
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!selectedEinheitId
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!selectedEinheitId
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: !!selectedEinheitId
  });

  const { data: allgemeineAufgabenData = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', selectedEinheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['mappingBasisziele'],
    queryFn: () => base44.entities.MappingAufgabeBasisziel.list(),
    enabled: !!selectedEinheitId
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', selectedEinheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId
  });

  const { data: lernpaketAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    enabled: !!selectedEinheitId
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    enabled: !!selectedEinheitId
  });

  // ── Aktive Einheit ────────────────────────────────────────────────────────────
  const einheit = einheiten.find((e) => e.id === selectedEinheitId) || null;

  const paketeFuerEinheit = lernpakete
    .filter((lp) => lp.einheit_id === selectedEinheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const paketIds = paketeFuerEinheit.map((p) => p.id);
  const zieleFuerEinheit = lernziele.filter((lz) => paketIds.includes(lz.lernpaket_id));
  const aufgabenFuerEinheit = aufgaben.filter((a) => paketIds.includes(a.lernpaket_id));

  // ── RBAC ──────────────────────────────────────────────────────────────────────
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaftsleitung = rolle === ROLLEN.FACHSCHAFT;
  const kannSperreIgnorieren = istAdmin || istFachschaftsleitung;

  // Einheit gesperrt? → normale Lehrkräfte dürfen nicht bearbeiten
  const einheitGesperrt = einheit?.freigabe_status === 'Gesperrt';
  const kannDieseEinheitBearbeiten = einheit
    ? permissions.kannEinheitBearbeiten(einheit.fach) && (!einheitGesperrt || kannSperreIgnorieren)
    : false;

  // ── Präsenz ──────────────────────────────────────────────────────────────────
  const { onlineUsers } = usePresence(selectedEinheitId);

  // ── Structural-Lock + "Paket verschoben"-Notification ────────────────────────
  const [movedNotification, setMovedNotification] = useState(null);

  useEffect(() => {
    if (!selectedEinheitId) return;
    const ch = new BroadcastChannel(`presence_${selectedEinheitId}`);
    ch.onmessage = (ev) => {
      if (ev.data?.type === 'paket_moved') {
        setMovedNotification(ev.data);
        setTimeout(() => setMovedNotification(null), 6000);
      }
    };
    return () => ch.close();
  }, [selectedEinheitId]);

  // fromWizard → direkt zum Struktur-Tab
  useEffect(() => {
    if (fromWizard) setActiveTab('struktur');
  }, [fromWizard]);

  const structLocked = einheit ? isStructurallyLocked(einheit, authUser?.email) : false;

  // ── Callbacks ─────────────────────────────────────────────────────────────────
  const handleEinheitChange = (id) => {
    setSelectedEinheitId(id);
    setSelectedThemenfeldId(null);
    setSelectedNode({ type: 'einheit', id });
    setHighlightedAtomIds(new Set());
    const url = new URL(window.location.href);
    url.searchParams.set('einheit', id);
    window.history.replaceState({}, '', url);
  };

  const handleAtomHighlight = useCallback((atomIds) => {
    setHighlightedAtomIds(new Set(atomIds));
  }, []);

  const handleSelect = useCallback((node) => {
    if (node?.type === 'goto-task-workshop') {
      setTaskWorkshopActivityId(node.activityId);
      setActiveTab('aufgaben');
      return;
    }
    if (node?.type === 'themenfeld') setSelectedThemenfeldId(node.themenfeldId);
    setSelectedNode(node);
  }, []);

  // Pakete/Ziele/Aufgaben gefiltert nach aktivem Themenfeld
  const paketeFuerThemenfeld = selectedThemenfeldId
    ? paketeFuerEinheit.filter((p) => p.themenfeld_id === selectedThemenfeldId)
    : paketeFuerEinheit;
  const paketIdsFuerThemenfeld = paketeFuerThemenfeld.map((p) => p.id);
  const zieleFuerThemenfeld = lernziele.filter((lz) => paketIdsFuerThemenfeld.includes(lz.lernpaket_id));
  const aufgabenFuerThemenfeld = aufgaben.filter(
    (a) => paketIdsFuerThemenfeld.includes(a.lernpaket_id) && a.anforderungsebene !== '3 - Projekt'
  );

  // ── Delete-Mutations ──────────────────────────────────────────────────────────
  const deleteLernpaket = useMutation({
    mutationFn: async (id) => {
      const relZiele = zieleFuerEinheit.filter((lz) => lz.lernpaket_id === id);
      const relAufgaben = aufgabenFuerEinheit.filter((a) => a.lernpaket_id === id);
      for (const z of relZiele) await base44.entities.Lernziele.delete(z.id);
      for (const a of relAufgaben) await base44.entities.Aufgabenbausteine.delete(a.id);
      return base44.entities.Lernpakete.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setSelectedNode({ type: 'einheit', id: selectedEinheitId });
    }
  });

  const deleteLernziel = useMutation({
    mutationFn: (id) => base44.entities.Lernziele.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      const lz = zieleFuerEinheit.find((lz) => lz.id === id);
      if (lz) setSelectedNode({ type: 'lernpaket', id: lz.lernpaket_id });
    }
  });

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (rbacLoading || einheitenLoading) {
    return <SkeletonWorkspace />;
  }

  if (einheiten.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Keine Einheiten vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Legen Sie zuerst eine Einheit an, um den Workspace zu nutzen.
          </p>
        </div>
        <Link to="/einheiten"><Button>Zu den Einheiten</Button></Link>
      </div>
    );
  }

  const allgemeineAufgabenCount = allgemeineAufgabenData.filter(
    (a) => !a.anforderungsebene || ['1 - Basis', '2 - Transfer'].includes(a.anforderungsebene)
  ).length;
  const projektCount = allgemeineAufgabenData.filter((a) => a.anforderungsebene === '3 - Projekt').length;

  // Bidirektionale Lock-Prüfung: Hat ein Kollege gerade ein Lernpaket gesperrt?
  const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;
  const aktivePaketLocks = paketeFuerEinheit.filter(
    (p) =>
      p.locked_by &&
      p.locked_by !== authUser?.email &&
      p.locked_at &&
      Date.now() - new Date(p.locked_at).getTime() < PAKET_LOCK_TIMEOUT_MS
  );
  const kollegen = [...new Set(aktivePaketLocks.map((p) => p.locked_by))];

  return (
    <ErrorBoundary label="Workspace">
      <div className="flex flex-col h-screen w-screen fixed inset-0 bg-background overflow-hidden">

        {/* ── Einheit-Gesperrt-Banner ─────────────────────────────────────────── */}
        {einheitGesperrt && !kannSperreIgnorieren && (
          <div className="shrink-0 px-4 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span>
              <strong>Einheit gesperrt</strong> – Diese Einheit wurde für die Bearbeitung gesperrt. Inhalte können nur gelesen werden.
            </span>
          </div>
        )}
        {einheitGesperrt && kannSperreIgnorieren && (
          <div className="shrink-0 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>
              <strong>Einheit gesperrt</strong> – Lehrkräfte können nicht bearbeiten. Sie haben als Fachschaftsleitung/Administrator weiterhin Schreibzugriff.
            </span>
          </div>
        )}

        {/* ── Structural-Lock-Banner ───────────────────────────────────────────── */}
        {structLocked && (
          <div className="shrink-0 px-4 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-800 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-orange-600" />
            <span>
              <strong>Struktur wird angepasst</strong> von {einheit?.structural_lock}. Bestehende Inhalte können gespeichert werden, neue Bearbeitungssitzungen sind kurzzeitig gesperrt.
            </span>
          </div>
        )}

        {/* ── "Paket verschoben"-Toast-Banner ─────────────────────────────────── */}
        {movedNotification && (
          <div className="shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-800 flex items-center gap-2 animate-in slide-in-from-top-1">
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span>
              <strong>Achtung:</strong> Das Paket „{movedNotification.paketTitel}" wurde in das Themenfeld <strong>{movedNotification.neuesThemenfeld}</strong> verschoben.
            </span>
            <button onClick={() => setMovedNotification(null)} className="ml-auto text-blue-500 hover:text-blue-700">✕</button>
          </div>
        )}

        {/* ── Haupt-Inhalt ─────────────────────────────────────────────────────── */}
        {!einheit ? (
           <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30" />
            <div>
              <p className="font-semibold">Einheit auswählen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Wählen Sie oben eine Einheit aus, um mit der Planung zu beginnen.
              </p>
            </div>
          </div>
        ) : (
         <Tabs
           value={activeTab}
           onValueChange={handleTabChange}
           className="flex flex-col flex-1 overflow-hidden m-0 p-0">

            {/* Einheit-Infoleiste */}
            <div className="px-4 sm:px-6 lg:px-8 py-2 border-b border-border bg-muted/40 shrink-0 flex items-center gap-3">
              <span className="text-base font-bold text-foreground truncate" style={{fontSize: '1.75rem', lineHeight: '1.2'}}>{einheit.titel_der_einheit}</span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">{einheit.fach}</span>
            </div>

            {/* 6-Step Navigation */}
            <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-card shrink-0">
              <WorkspaceTabs activeTab={activeTab} onTabChange={handleTabChange} />
            </div>

            {/* ── Tab 1: Einheit anlegen ───────────────────────────────────────── */}
            <TabsContent value="einheit" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <div className="flex-1 overflow-y-auto">
                <ErrorBoundary label="Einheit">
                  {einheit && (
                     <EinheitUebersichtTab
                       einheit={einheit}
                       currentUserEmail={authUser?.email}
                       currentUserRole={rolle}
                       currentUserFaecher={permissions?.faecher || []}
                     />
                   )}
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 2: Struktur anlegen → StrukturBoard ──────────────────────── */}
              <TabsContent value="struktur" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
                <div className="flex-1 overflow-y-auto">
                  <ErrorBoundary label="Struktur">
                    {!permissions.kannStrukturBearbeiten(einheit?.fach) ? (
                   <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
                     <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                       <Lock className="w-8 h-8 text-red-500" />
                     </div>
                     <div className="max-w-md">
                       <p className="text-lg font-semibold">Strukturbearbeitung nicht erlaubt</p>
                       <p className="text-sm text-muted-foreground mt-2">
                         Nur Fachschaftsleitung und Administratoren dürfen die Struktur dieser Einheit bearbeiten.
                       </p>
                     </div>
                   </div>
                 ) : aktivePaketLocks.length > 0 ? (
                     <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
                       <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
                         <Lock className="w-8 h-8 text-orange-500" />
                       </div>
                       <div className="max-w-md">
                         <p className="text-lg font-semibold">Strukturbearbeitung gesperrt</p>
                         <p className="text-sm text-muted-foreground mt-2">
                           {kollegen.join(', ')} {kollegen.length === 1 ? 'bearbeitet' : 'bearbeiten'} gerade Inhalte dieser Einheit.
                           Strukturänderungen sind nicht möglich, solange Kollegen aktiv an Lernpaketen arbeiten.
                         </p>
                         <p className="text-xs text-muted-foreground mt-3 italic">
                           Die Sperre wird automatisch aufgehoben, sobald die Bearbeitung abgeschlossen ist.
                         </p>
                       </div>
                     </div>
                   ) : (
                     <StrukturBoardEmbedded
                       einheitId={selectedEinheitId}
                       einheit={einheit}
                       lernpakete={paketeFuerEinheit}
                       themenfelder={themenfelder}
                       queryClient={queryClient}
                     />
                     )}
                     </ErrorBoundary>
                     </div>
                     </TabsContent>

            {/* ── Tab 3: Aktivitäten zuordnen → Sidebar-Baum + Detail-Panel ───── */}
            <TabsContent value="aktivitaeten" className="data-[state=active]:flex data-[state=inactive]:hidden flex-row flex-1 overflow-hidden m-0 p-0">
              <ErrorBoundary label="Aktivitäten-Struktur">
                <aside className="w-96 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden h-full">
                   <div className="flex-1 overflow-hidden p-3">
                     <div className="h-full overflow-y-auto pr-2">
                    <SidebarTree
                      einheit={einheit}
                      lernpakete={paketeFuerEinheit}
                      lernziele={zieleFuerEinheit}
                      aufgaben={aufgabenFuerEinheit}
                      mappings={mappings}
                      themenfelder={themenfelder}
                      selectedNode={selectedNode}
                      onSelect={handleSelect}
                      kannBearbeiten={kannDieseEinheitBearbeiten}
                      userEmail={authUser?.email || ''}
                      highlightedAtomIds={highlightedAtomIds}
                      phaseAktivitaeten={lernpaketAktivitaeten}
                      />
                      </div>
                      </div>
                      </aside>

                <main className="flex-1 overflow-hidden min-h-0 h-full">
                   <ErrorBoundary label="Detail-Panel">
                     <div className="h-full overflow-y-auto max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pr-2">
                      {selectedNode?.type === 'aktivitaet-edit' ? (() => {
                        const activityRecord = lernpaketAktivitaeten.find((a) => a.id === selectedNode.activityRecordId);
                        if (!activityRecord) return null;
                        return (
                           <ActivityDetailView
                             activityRecord={activityRecord}
                             kannBearbeiten={kannDieseEinheitBearbeiten}
                             einheitFach={einheit?.fach}
                             queryClient={queryClient}
                           />
                        );
                      })() : (
                        <WorkspaceDetailPanel
                          selectedNode={{ ...selectedNode, themenfelder }}
                          einheit={einheit}
                          lernpakete={paketeFuerEinheit}
                          lernziele={zieleFuerEinheit}
                          aufgaben={aufgabenFuerEinheit}
                          userEmail={authUser?.email}
                          kannBearbeiten={kannDieseEinheitBearbeiten}
                          istAdmin={istAdmin}
                          onNavigate={handleSelect}
                          onNewLernpaket={() => handleSelect({ type: 'new-lernpaket' })}
                          onNewLernziel={(paketId) => handleSelect({ type: 'new-lernziel', paketId })}
                          onNewAufgabe={(paketId, lernzielId) => handleSelect({ type: 'new-aufgabe', paketId, lernzielId })}
                          onEditEinheit={() => {}}
                          onDeleteLernpaket={(id) => deleteLernpaket.mutate(id)}
                          onDeleteLernziel={(id) => deleteLernziel.mutate(id)}
                        />
                      )}
                    </div>
                  </ErrorBoundary>
                </main>
              </ErrorBoundary>
            </TabsContent>

            {/* ── Tab 4: Aufgaben erstellen ─────────────────────────────────── */}
            <TabsContent value="aufgaben" className="data-[state=active]:flex data-[state=inactive]:hidden flex-row flex-1 overflow-hidden m-0 p-0">
              <ErrorBoundary label="Aufgaben erstellen">
                <TaskCreationView
                  einheitId={selectedEinheitId}
                  einheit={einheit}
                  initialActivityId={taskWorkshopActivityId}
                  kannBearbeiten={kannDieseEinheitBearbeiten}
                  userEmail={authUser?.email}
                  userRole={rolle}
                />
              </ErrorBoundary>
            </TabsContent>

            {/* ── Tab 5: Allgemeine Aufgaben (Ebene 2) ────────────────────────── */}
            <TabsContent value="ebene2" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <div className="flex-1 overflow-y-auto">
                <ErrorBoundary label="Allgemeine Aufgaben erstellen">
                  <AllgemeineAufgabenView 
                    einheitId={selectedEinheitId}
                    einheit={einheit}
                    kannBearbeiten={kannDieseEinheitBearbeiten}
                    userEmail={authUser?.email}
                    userRole={rolle}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 6: Anwendungs- & Projektaufgaben (Ebene 3) ──────────────── */}
            <TabsContent value="ebene3" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <div className="flex-1 overflow-y-auto">
                <ErrorBoundary label="Anwendungs- und Projektaufgaben">
                  <ProjektaufgabenView 
                    einheitId={selectedEinheitId}
                    einheit={einheit}
                    kannBearbeiten={kannDieseEinheitBearbeiten}
                    userEmail={authUser?.email}
                    userRole={rolle}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 7: Freigabe-Cockpit ──────────────────────────────────────── */}
            <TabsContent value="cockpit" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
                <ErrorBoundary label="Freigabe-Cockpit">
                  <ExportCockpitView 
                    einheitId={selectedEinheitId} 
                    userRole={rolle}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 8: Moodle-Export & Admin-Freigabe ────────────────────────── */}
            <TabsContent value="export" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <div className="flex-1 overflow-y-auto">
                <ErrorBoundary label="Moodle Export">
                  <MoodleExportView 
                    einheitId={selectedEinheitId} 
                    userRole={rolle}
                    isAdmin={istAdmin}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

          </Tabs>
        )}

      </div>
    </ErrorBoundary>
  );
}