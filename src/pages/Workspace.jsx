import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/utils/functionsHelper';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN, hasUnitLevelAccess } from '@/lib/rbac';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import ErrorBoundary from '@/components/errors/ErrorBoundary';
import { SkeletonWorkspace } from '@/components/loading/SkeletonLoader';
import SidebarTree from '@/components/workspace/SidebarTree';
import WorkspaceDetailPanel from '@/components/workspace/WorkspaceDetailPanel';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import { usePresence } from '@/hooks/usePresence';
import { isStructurallyLocked } from '@/hooks/useStructuralLock';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Lock, ArrowRight, PenLine, Unlock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import StrukturBoardEmbedded from '@/components/workspace/StrukturBoardEmbedded';
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs';
import TaskCreationView from '@/components/workspace/TaskCreationView.jsx';
import EinheitUebersichtTab from '@/components/workspace/EinheitUebersichtTab';
import MoodleExportTab from '@/components/workspace/MoodleExportTab';
import ExportCockpitView from '@/components/export/ExportCockpitView';
import MoodleExportView from '@/components/export/MoodleExportView';
import BrianExportCockpitView from '@/components/export/BrianExportCockpitView';
import AllgemeineAufgabenView from '@/components/allgemeineAufgaben/AllgemeineAufgabenView';
import { deleteLernpaket as deleteLernpaketService } from '@/services/LernpaketService';
import { deleteLernziel as deleteLernzielService } from '@/services/LernzielService';
import { deleteAufgabenbaustein } from '@/services/AufgabenbausteinService';
import ProjektaufgabenView from '@/components/projektaufgaben/ProjektaufgabenView';

export default function Workspace({ initialEinheitId: initialEinheitIdProp = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEinheitId = initialEinheitIdProp || searchParams.get('einheit') || null;

  const { permissions, authUser, rolle, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEinheitId, setSelectedEinheitId] = useState(initialEinheitId);
  const [selectedThemenfeldId, setSelectedThemenfeldId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const VALID_TABS = ['einheit', 'struktur', 'aktivitaeten', 'aufgaben', 'ebene2', 'ebene3', 'cockpit', 'export', 'brian'];
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'einheit');
  const [highlightedAtomIds, setHighlightedAtomIds] = useState(new Set());
  const [taskWorkshopActivityId, setTaskWorkshopActivityId] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setHighlightedAtomIds(new Set());
    setSelectedNode(null); // Zurücksetzen beim Tab-Wechsel
    if (tab !== 'aufgaben') setTaskWorkshopActivityId(null);
  };

  // ── Structural-Lock State (muss VOR useWorkspaceData deklariert werden) ──────
  const [isStructuralEditingActive, setIsStructuralEditingActive] = useState(false);
  const [acquiringStructLock, setAcquiringStructLock] = useState(false);
  const [releasingStructLock, setReleasingStructLock] = useState(false);

  // ── Queries (ausgelagert in Custom Hook) ──────────────────────────────────────
  const {
    einheiten = [],
    lernpakete = [],
    lernziele = [],
    aufgaben = [],
    allgemeineAufgabenData = [],
    mappings = [],
    themenfelder = [],
    lernpaketAktivitaeten = [],
    aktivitaetenKatalog = [],
    isLoading: einheitenLoading,
    isFetching: einheitenIsFetching, // ✅ Silent Polling
  } = useWorkspaceData(selectedEinheitId, isStructuralEditingActive);

  // ── Aktive Einheit + Memoisierte abgeleitete Daten ──────────────────────────────
  const einheit = einheiten.find((e) => e.id === selectedEinheitId) || null;

  const paketeFuerEinheit = useMemo(
    () =>
      lernpakete
        .filter((lp) => lp.einheit_id === selectedEinheitId)
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)),
    [lernpakete, selectedEinheitId]
  );

  const paketIds = useMemo(() => paketeFuerEinheit.map((p) => p.id), [paketeFuerEinheit]);

  // ── Lernpaket-Edit-Mode: persistiert über Tab-Wechsel ─────────────────────────
  // Abgeleitet aus DB-Daten: Hält der aktuelle User irgendeinen Lernpaket-Lock?
  const PAKET_LOCK_TIMEOUT_EDIT_MS = 30 * 60 * 1000;
  const isLernpaketEditActive = useMemo(
    () =>
      paketeFuerEinheit.some(
        (p) =>
          p.is_locked &&
          p.locked_by_email === authUser?.email &&
          p.locked_at &&
          Date.now() - new Date(p.locked_at).getTime() < PAKET_LOCK_TIMEOUT_EDIT_MS
      ),
    [paketeFuerEinheit, authUser?.email]
  );

  const zieleFuerEinheit = useMemo(
    () => lernziele.filter((lz) => paketIds.includes(lz.lernpaket_id)),
    [lernziele, paketIds]
  );

  const aufgabenFuerEinheit = useMemo(
    () => aufgaben.filter((a) => paketIds.includes(a.lernpaket_id)),
    [aufgaben, paketIds]
  );

  // ── RBAC ──────────────────────────────────────────────────────────────────────
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaftsleitung = rolle === ROLLEN.FACHSCHAFT;
  const kannSperreIgnorieren = istAdmin || istFachschaftsleitung;

  // ✅ Unit-Level RBAC: Berücksichtigt LEITUNG-Rolle in EinheitMembers
  const unitAccess = hasUnitLevelAccess(
    rolle,
    permissions?.faecher || [],
    einheit?.fach,
    einheit?.members || [],
    authUser?.email
  );
  
  // ✅ GLOBALE STRUCTURAL-LOCK-PRÜFUNG (für alle Tabs)
  const structLocked = einheit ? isStructurallyLocked(einheit, authUser?.email) : false;
  const isLockedByOther = structLocked; // Alias für bessere Lesbarkeit

  // Einheit gesperrt? → normale Lehrkräfte dürfen nicht bearbeiten
  const einheitGesperrt = einheit?.freigabe_status === 'Gesperrt';
  const kannDieseEinheitBearbeiten = einheit
    ? (permissions.kannEinheitBearbeiten(einheit.fach) || unitAccess.hasFullAccess) && (!einheitGesperrt || kannSperreIgnorieren)
    : false;

  // ── Präsenz ──────────────────────────────────────────────────────────────────
  const { onlineUsers } = usePresence(selectedEinheitId);

  // ── Structural-Lock (explizit per Button) ─────────────────────────────────

  // Lock freigeben wenn Einheit gewechselt wird ODER Tab gewechselt wird
  useEffect(() => {
    if (isStructuralEditingActive && activeTab !== 'struktur') {
      handleReleaseStructLock();
    }
  }, [activeTab, isStructuralEditingActive]);

  useEffect(() => {
    if (isStructuralEditingActive && !selectedEinheitId) {
      handleReleaseStructLock();
    }
  }, [selectedEinheitId, isStructuralEditingActive]);

  // Lock freigeben bei Page-Unmount (wenn User die Seite verlässt)
  useEffect(() => {
    return () => {
      if (isStructuralEditingActive && einheit) {
        invokeFunction('releaseStructuralLockSecure', { einheit_id: einheit.id })
          .catch(console.error);
      }
    };
  }, [isStructuralEditingActive, einheit?.id]);

  // ✅ BEFOREUNLOAD: Not-Unlock wenn Browser-Tab geschlossen wird (Race Condition Fix)
  // Hinweis: Der Backend-Timeout (60 Min) bereinigt verwaiste Locks automatisch
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isStructuralEditingActive && einheit) {
        // Browser zeigt Standard-Dialog "Möchten Sie diese Seite verlassen?"
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStructuralEditingActive, einheit?.id]);

  const handleAcquireStructLock = async () => {
    if (!einheit) return;
    setAcquiringStructLock(true);
    try {
      const res = await invokeFunction('acquireStructuralLockSecure', {
        einheit_id: einheit.id,
      });
      if (res.data?.success) {
        setIsStructuralEditingActive(true);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
        toast.success('✅ Strukturbearbeitung aktiviert. Andere Nutzer können jetzt keine Änderungen mehr vornehmen.');
      } else {
        const lockOwner = res.data?.lockedByEmail;
        toast.error(
          lockOwner
            ? `🔒 Struktur wird gerade von ${lockOwner} bearbeitet. Bitte warten Sie bis die Bearbeitung abgeschlossen ist.`
            : 'Structural Lock konnte nicht erworben werden.'
        );
      }
    } catch (err) {
      const lockOwner = err?.response?.data?.lockedByEmail;
      if (err?.response?.status === 409) {
        toast.error(lockOwner ? `🔒 Struktur wird von ${lockOwner} bearbeitet.` : 'Struktur ist gesperrt.');
      } else {
        toast.error('Fehler beim Erwerben der Structural-Sperre.');
      }
    } finally {
      setAcquiringStructLock(false);
    }
  };

  const handleReleaseStructLock = async () => {
    if (!einheit) return;
    setReleasingStructLock(true);
    try {
      await invokeFunction('releaseStructuralLockSecure', {
        einheit_id: einheit.id,
      });
      setIsStructuralEditingActive(false);
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      toast.success('✅ Bearbeitungsmodus beendet. Andere Nutzer können jetzt wieder Änderungen vornehmen.');
    } catch (err) {
      if (err?.response?.status === 403) {
        toast.error('Sie haben diesen Lock nicht. Nur der Lock-Inhaber kann ihn freigeben.');
      } else {
        toast.error('Fehler beim Freigeben der Structural-Sperre.');
      }
    } finally {
      setReleasingStructLock(false);
    }
  };

  // ── "Paket verschoben"-Notification ──────────────────────────────────────────
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

  // Bidirektionale Lock-Prüfung (memoisiert) – VOR Early Returns!
  const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;
  const aktivePaketLocks = useMemo(
    () =>
      paketeFuerEinheit.filter(
        (p) =>
          p.locked_by &&
          p.locked_by !== authUser?.email &&
          p.locked_at &&
          Date.now() - new Date(p.locked_at).getTime() < PAKET_LOCK_TIMEOUT_MS
      ),
    [paketeFuerEinheit, authUser?.email]
  );

  const kollegen = useMemo(
    () => [...new Set(aktivePaketLocks.map((p) => p.locked_by))],
    [aktivePaketLocks]
  );

  // Pakete/Ziele/Aufgaben gefiltert nach aktivem Themenfeld (memoisiert)
  const paketeFuerThemenfeld = useMemo(
    () =>
      selectedThemenfeldId
        ? paketeFuerEinheit.filter((p) => p.themenfeld_id === selectedThemenfeldId)
        : paketeFuerEinheit,
    [paketeFuerEinheit, selectedThemenfeldId]
  );

  const paketIdsFuerThemenfeld = useMemo(
    () => paketeFuerThemenfeld.map((p) => p.id),
    [paketeFuerThemenfeld]
  );

  const activityRecordForEdit = selectedNode?.type === 'aktivitaet-edit' 
    ? lernpaketAktivitaeten.find((a) => a.id === selectedNode.activityRecordId) 
    : null;

  // ── Callbacks ─────────────────────────────────────────────────────────────────
  const handleEinheitChange = (id) => {
    setSelectedEinheitId(id);
    setSelectedThemenfeldId(null);
    setSelectedNode({ type: 'einheit', id });
    setHighlightedAtomIds(new Set());
    setSearchParams({ einheit: id });
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

  // ── Delete-Mutations (parallelisiert) ─────────────────────────────────────────
  const deleteLernpaket = useMutation({
    mutationFn: async (id) => {
      const relZiele = zieleFuerEinheit.filter((lz) => lz.lernpaket_id === id);
      const relAufgaben = aufgabenFuerEinheit.filter((a) => a.lernpaket_id === id);
      // Parallele Requests statt sequenzielle for...of Schleifen
      await Promise.all([
        ...relZiele.map((z) => deleteLernzielService(z.id)),
        ...relAufgaben.map((a) => deleteAufgabenbaustein(a.id)),
      ]);
      return deleteLernpaketService(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setSelectedNode({ type: 'einheit', id: selectedEinheitId });
    }
  });

  const deleteLernziel = useMutation({
    mutationFn: (id) => deleteLernzielService(id),
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

  // ✅ TAB-SPERREN: Welche Tabs sind für welche Rolle sichtbar?
  const istMoodleDesigner = rolle === ROLLEN.MOODLE_DESIGNER;
  const showExportTabs = istAdmin || istMoodleDesigner; // Nur Admin und Moodle-Designer sehen Export-Tabs

  return (
    <ErrorBoundary label="Workspace">
      <div className="flex flex-col h-full w-full bg-background overflow-hidden">

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

        {/* ── GLOBALE STRUCTURAL-LOCK-WARNUNG (alle Tabs) ───────────────────────── */}
        {isLockedByOther && (
          <div className="shrink-0 px-4 py-2.5 bg-orange-50 border-b border-orange-200 text-xs text-orange-800 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-orange-600" />
            <span>
              <strong>🔒 Diese Einheit wird aktuell von {einheit?.structural_lock} im Struktur-Tab bearbeitet</strong> – Alle Bearbeitungsfunktionen sind gesperrt. Bitte warten Sie bis die Strukturbearbeitung abgeschlossen ist.
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

            {/* ── PERSISTENTER LOCK-STATUS-BANNER (über allen Tabs) ──────────── */}
            {isStructuralEditingActive && (
              <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
                <PenLine className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-blue-900 flex-1">
                  ✏️ Du befindest dich im Bearbeitungsmodus. Nur du kannst Änderungen vornehmen.
                </span>
                <button
                  onClick={handleReleaseStructLock}
                  disabled={releasingStructLock}
                  className="text-xs font-medium px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  {releasingStructLock ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                  Bearbeitung beenden
                </button>
              </div>
            )}

            {/* ── Persistenter Header mit Structural-Lock-Control ─────────── */}
            <div className="px-4 sm:px-6 lg:px-8 py-2 border-b border-border bg-muted/40 shrink-0 flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold text-foreground truncate flex-1 min-w-0 leading-snug">{einheit.titel_der_einheit}</span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">{einheit.fach}</span>

              {/* Status-Badge + Lock-Button – IMMER sichtbar wenn Berechtigung (inkl. Unit-Level) */}
              {permissions.kannStrukturBearbeiten(einheit?.fach) || unitAccess.hasFullAccess ? (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Status-Badge */}
                  {isStructuralEditingActive ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                      <PenLine className="w-3.5 h-3.5" /> Bearbeitungsmodus
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                      <Lock className="w-3.5 h-3.5" /> Lesemodus
                    </span>
                  )}

                  {/* Action-Button */}
                  {isStructuralEditingActive ? (
                    <button
                      onClick={handleReleaseStructLock}
                      disabled={releasingStructLock}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {releasingStructLock
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Unlock className="w-3.5 h-3.5" />}
                      Bearbeitung beenden
                    </button>
                  ) : (
                    <button
                      onClick={handleAcquireStructLock}
                      disabled={acquiringStructLock || structLocked}
                      title={structLocked ? `Gesperrt von ${einheit?.structural_lock}` : 'Strukturbearbeitung starten'}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acquiringStructLock
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <PenLine className="w-3.5 h-3.5" />}
                      Einheit Struktur bearbeiten
                    </button>
                  )}
                </div>
              ) : null}
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
                       isLockedByOther={isLockedByOther}
                     />
                   )}
                 </ErrorBoundary>
               </div>
             </TabsContent>

            {/* ── Tab 2: Struktur anlegen → StrukturBoard ──────────────────────── */}
               <TabsContent value="struktur" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      <ErrorBoundary label="Struktur">
                         <StrukturBoardEmbedded
                           einheitId={selectedEinheitId}
                           einheit={einheit}
                           lernpakete={paketeFuerEinheit}
                           themenfelder={themenfelder}
                           queryClient={queryClient}
                           readOnly={!isStructuralEditingActive || isLockedByOther}
                           isStructuralEditingActive={isStructuralEditingActive}
                           isLockedByOther={isLockedByOther}
                           onSaved={() => {
                             handleReleaseStructLock();
                           }}
                         />
                      </ErrorBoundary>
                   </div>
                 </TabsContent>

            {/* ── Tab 3: Aktivitäten zuordnen → Sidebar-Baum + Detail-Panel ───── */}
            <TabsContent value="aktivitaeten" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <ErrorBoundary label="Aktivitäten-Struktur">
                {/* Sticky Edit-Banner – direkt an globalem isLernpaketEditActive gebunden (Single Source of Truth) */}
                {isLernpaketEditActive && (
                  <div className="shrink-0 bg-orange-500 text-white px-6 py-2.5 flex items-center gap-3">
                    <PenLine className="w-4 h-4 shrink-0 animate-pulse" />
                    <span className="text-sm font-semibold flex-1">✏️ Bearbeitungsmodus aktiv – ein Lernpaket ist für andere gesperrt</span>
                  </div>
                )}
                <div className={cn(
                  "flex flex-col lg:flex-row flex-1 overflow-hidden transition-colors",
                  isLernpaketEditActive && "bg-orange-50/60 ring-2 ring-inset ring-orange-300"
                )}>
                <aside className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden h-64 lg:h-full min-h-0">
                   <div className="flex-1 overflow-hidden min-h-0 p-3">
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
                      kannBearbeiten={kannDieseEinheitBearbeiten && !isLockedByOther}
                      userEmail={authUser?.email || ''}
                      highlightedAtomIds={highlightedAtomIds}
                      phaseAktivitaeten={lernpaketAktivitaeten}
                      isEditingActive={isLernpaketEditActive}
                      />
                      </div>
                      </div>
                      </aside>

                <main className="flex-1 overflow-hidden min-h-0 h-full lg:h-auto">
                  <ErrorBoundary label="Detail-Panel">
                    <div className="h-full overflow-y-auto max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full min-h-0">
                      {selectedNode?.type === 'aktivitaet-edit' ? (
                        activityRecordForEdit ? (
                          <ActivityDetailView
                            activityRecord={activityRecordForEdit}
                            kannBearbeiten={false}
                            einheitFach={einheit?.fach}
                            queryClient={queryClient}
                          />
                        ) : null
                      ) : (
                        <WorkspaceDetailPanel
                          selectedNode={{ ...selectedNode, themenfelder }}
                          einheit={einheit}
                          lernpakete={paketeFuerEinheit}
                          lernziele={zieleFuerEinheit}
                          aufgaben={aufgabenFuerEinheit}
                          userEmail={authUser?.email}
                          kannBearbeiten={kannDieseEinheitBearbeiten && !isLockedByOther}
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
                </div>
                </ErrorBoundary>
                </TabsContent>

            {/* ── Tab 4: Aufgaben erstellen ─────────────────────────────────── */}
            <TabsContent value="aufgaben" className="data-[state=active]:flex data-[state=inactive]:hidden flex-row flex-1 overflow-hidden m-0 p-0">
              <ErrorBoundary label="Aufgaben erstellen">
                <TaskCreationView
                  einheitId={selectedEinheitId}
                  einheit={einheit}
                  initialActivityId={taskWorkshopActivityId}
                  kannBearbeiten={kannDieseEinheitBearbeiten && !isLockedByOther}
                  userEmail={authUser?.email}
                  userRole={rolle}
                  isLockedByOther={isLockedByOther}
                  globalEditActive={isLernpaketEditActive}
                />
              </ErrorBoundary>
            </TabsContent>

            {/* ── Tab 5: Allgemeine Aufgaben (Ebene 2) ────────────────────────── */}
            <TabsContent value="ebene2" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0 min-h-0">
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <ErrorBoundary label="Allgemeine Aufgaben erstellen">
                  <AllgemeineAufgabenView 
                    einheitId={selectedEinheitId}
                    einheit={einheit}
                    kannBearbeiten={kannDieseEinheitBearbeiten && !isLockedByOther}
                    userEmail={authUser?.email}
                    userRole={rolle}
                    anforderungsebene="2 - Transfer"
                    isLockedByOther={isLockedByOther}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 6: Anwendungs- & Projektaufgaben (Ebene 3) ──────────────── */}
            <TabsContent value="ebene3" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0 min-h-0">
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <ErrorBoundary label="Anwendungs- und Projektaufgaben">
                  <ProjektaufgabenView 
                    einheitId={selectedEinheitId}
                    einheit={einheit}
                    kannBearbeiten={kannDieseEinheitBearbeiten && !isLockedByOther}
                    userEmail={authUser?.email}
                    userRole={rolle}
                    isLockedByOther={isLockedByOther}
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
                    onNavigateToActivity={(activityId) => {
                      setTaskWorkshopActivityId(activityId);
                      handleTabChange('aufgaben');
                    }}
                    onNavigateToTask={(ebene, taskId) => {
                      handleTabChange(ebene === 'ebene12' ? 'ebene2' : 'ebene3');
                      handleSelect({ type: 'allgemein-aufgabe', id: taskId });
                    }}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 8: Moodle-Export & Admin-Freigabe ────────────────────────── */}
            {!showExportTabs ? null : (
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
            )}

            {/* ── Tab 9: Brian.study Export ─────────────────────────────────────── */}
            {!showExportTabs ? null : (
              <TabsContent value="brian" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
                <div className="flex-1 overflow-y-auto">
                  <ErrorBoundary label="Brian Export">
                    <BrianExportCockpitView />
                  </ErrorBoundary>
                </div>
              </TabsContent>
            )}

          </Tabs>
        )}

      </div>
    </ErrorBoundary>
  );
}