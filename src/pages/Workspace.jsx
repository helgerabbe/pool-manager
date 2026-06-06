import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useEinheitFreigabeStatus } from '@/hooks/useEinheitFreigabeStatus';
import { EXPORT_LIFECYCLE_LABELS, EXPORT_LIFECYCLE_STATUS } from '@/lib/exportLifecycle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Lock, ArrowRight, PenLine, Unlock, Loader2, AlignJustify, LayoutList, Layers } from 'lucide-react';
import HelpDialog from '@/components/ui/HelpDialog';
import { cn } from '@/lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import StrukturBoardEmbedded from '@/components/workspace/StrukturBoardEmbedded';
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs';
import TaskCreationView from '@/components/workspace/TaskCreationView.jsx';
import EinheitUebersichtTab from '@/components/workspace/EinheitUebersichtTab';
import LernzieleUebersichtTab from '@/components/workspace/lernziele/LernzieleUebersichtTab';
import MoodleExportTab from '@/components/workspace/MoodleExportTab';
import ExportCockpitView from '@/components/export/ExportCockpitView';
import AllgemeineAufgabenView from '@/components/allgemeineAufgaben/AllgemeineAufgabenView';
import { deleteLernpaket as deleteLernpaketService } from '@/services/LernpaketService';
import { deleteLernziel as deleteLernzielService } from '@/services/LernzielService';
import { deleteAufgabenbaustein } from '@/services/AufgabenbausteinService';
import ProjektaufgabenView from '@/components/projektaufgaben/ProjektaufgabenView';
import LernpfadeCockpit from '@/components/lernpfade/LernpfadeCockpit';
import LoadingOverlay from '@/components/workspace/LoadingOverlay';

const LAST_EINHEIT_STORAGE_KEY = 'poolmanager:lastEinheitId';

const getStoredEinheitId = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_EINHEIT_STORAGE_KEY);
};

export default function Workspace({ initialEinheitId: initialEinheitIdProp = null, isBasismodul = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEinheitId = initialEinheitIdProp || searchParams.get('einheit') || getStoredEinheitId() || null;

  const { permissions, authUser, rolle, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEinheitId, setSelectedEinheitId] = useState(initialEinheitId);
  const [selectedThemenfeldId, setSelectedThemenfeldId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  // Phase H Cleanup: Tabs 9 ('export'/Moodle-Export) und 10 ('brian'/Brian-
  // Export) sind aus der Einheitenansicht entfernt. Beide Workflows laufen
  // jetzt zentral im eigenständigen Export-Center (Hauptmenü).
  const VALID_TABS = isBasismodul
    ? ['einheit', 'struktur', 'lernziele', 'aktivitaeten', 'aufgaben']
    : ['einheit', 'struktur', 'lernziele', 'aktivitaeten', 'aufgaben', 'ebene2', 'ebene3', 'dashboards', 'cockpit'];
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'einheit');
  const [highlightedAtomIds, setHighlightedAtomIds] = useState(new Set());
  const [taskWorkshopActivityId, setTaskWorkshopActivityId] = useState(null);
  const [strukturCompact, setStrukturCompact] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setHighlightedAtomIds(new Set());
    setSelectedNode(null); // Zurücksetzen beim Tab-Wechsel
    if (tab !== 'aufgaben') setTaskWorkshopActivityId(null);
    // 🩹 Frische Workspace-Daten beim Tab-Wechsel erzwingen.
    // Hintergrund (Bug "Lernziele verschwinden in Tab 2/3/4"): Alle Tabs leben in
    // EINER Workspace-Komponente, die beim Tab-Wechsel NICHT neu gemountet wird.
    // Die geteilte workspace-data-Query liefert daher den (evtl. veralteten/leeren)
    // Cache-Stand, bis irgendwann zufällig ein Refetch passiert. Außerhalb des
    // Edit-Modus holen wir die Detaildaten beim Tab-Wechsel aktiv neu, damit Tab
    // 2/3/4 dieselben frischen Lernziele sehen wie Tab 5.
    if (selectedEinheitId && !isStructuralEditingActive) {
      queryClient.refetchQueries({ queryKey: ['workspace-data', selectedEinheitId], type: 'active' });
    }
  };

  // Reaktiv auf `?tab=`-Deeplinks reagieren (z. B. wenn das Dashboard in
  // Tab 7 auf ein Lernpaket verweist → Tab 4). Workspace wird beim
  // Tab-Wechsel nicht neu gemountet, daher reicht der Mount-Init nicht.
  useEffect(() => {
    const t = searchParams.get('tab');
    const lernpaketParam = searchParams.get('lernpaket');
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      handleTabChange(t);
    }
    // Deep-Link aus Tab 7 (Dashboard): ein bestimmtes Lernpaket in Tab 3
    // („Aktivitäten zuordnen") öffnen. Wir setzen den selectedNode auf das
    // Lernpaket und räumen den Param danach wieder aus der URL.
    if (lernpaketParam) {
      setSelectedNode({ type: 'lernpaket', id: lernpaketParam });
      const next = new URLSearchParams(searchParams);
      next.delete('lernpaket');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Structural-Lock State (muss VOR useWorkspaceData deklariert werden) ──────
  const [isStructuralEditingActive, setIsStructuralEditingActive] = useState(false);
  const [acquiringStructLock, setAcquiringStructLock] = useState(false);
  const [releasingStructLock, setReleasingStructLock] = useState(false);
  const [strukturBoardKey, setStrukturBoardKey] = useState(0); // ← Key-Remount-Counter

  // Dashboard-Tab (Tab 7) hat eine eigene "Bearbeitung beenden"-Sequenz, die VOR
  // dem Lock-Release einen Save erzwingt. Das Cockpit liefert per Ref eine
  // flush-Funktion, die wir hier aufrufen, bevor `releaseStructuralLockSecure`
  // läuft. Siehe `handleEndDashboardEditing`.
  const dashboardFlushRef = useRef(null);
  const [endingDashboardEdit, setEndingDashboardEdit] = useState(false);

  // ── Tab-1-Bearbeitungsmodus State ────────────────────────────────────────────
  const [isTab1EditingActive, setIsTab1EditingActive] = useState(false);
  const [acquiringTab1Lock, setAcquiringTab1Lock] = useState(false);
  const [releasingTab1Lock, setReleasingTab1Lock] = useState(false);

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
    detailReady, // 🚪 Detaildaten-Gate (Grundgerüst + Lernziele vollständig aus DB)
  } = useWorkspaceData(selectedEinheitId, isStructuralEditingActive, isBasismodul);

  // ── Aktive Einheit + Memoisierte abgeleitete Daten ──────────────────────────────
  const einheit = einheiten.find((e) => e.id === selectedEinheitId) || null;

  useEffect(() => {
    if (selectedEinheitId || einheiten.length === 0) return;

    const storedEinheitId = getStoredEinheitId();
    const fallbackEinheit = einheiten.find((e) => e.id === storedEinheitId) || einheiten[0];
    if (!fallbackEinheit?.id) return;

    setSelectedEinheitId(fallbackEinheit.id);
    setSelectedNode({ type: 'einheit', id: fallbackEinheit.id });
    window.localStorage.setItem(LAST_EINHEIT_STORAGE_KEY, fallbackEinheit.id);
    const next = new URLSearchParams(searchParams);
    next.set('einheit', fallbackEinheit.id);
    setSearchParams(next, { replace: true });
  }, [selectedEinheitId, einheiten, searchParams, setSearchParams]);

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
  //
  // Reload-Resilienz (2026-05-14): Wenn die Base44-Preview neu lädt, während
  // der User im Edit-Dialog war, bleibt der DB-Lock hängen — der Cleanup-
  // Pfad im Dialog kommt nicht mehr zum Zug. Damit der User aus diesem
  // Zustand selbst rauskommt, exportieren wir die betroffenen Pakete und
  // bieten einen "Bearbeitung beenden"-Button direkt im Banner an.
  // AFK-Polish 2026-05-14: synchron zu Backend (acquireLockSecure / lockReaper),
  // siehe dortige Kommentare. War 30 Min, jetzt 5 Min.
  const PAKET_LOCK_TIMEOUT_EDIT_MS = 5 * 60 * 1000;
  const ownLockedPakete = useMemo(
    () =>
      paketeFuerEinheit.filter(
        (p) =>
          p.is_locked &&
          p.locked_by_email === authUser?.email &&
          p.locked_at &&
          Date.now() - new Date(p.locked_at).getTime() < PAKET_LOCK_TIMEOUT_EDIT_MS
      ),
    [paketeFuerEinheit, authUser?.email]
  );
  const isLernpaketEditActive = ownLockedPakete.length > 0;
  const [releasingOwnLocks, setReleasingOwnLocks] = useState(false);

  const handleReleaseOwnLernpaketLocks = useCallback(async () => {
    if (ownLockedPakete.length === 0 || releasingOwnLocks) return;
    setReleasingOwnLocks(true);
    try {
      await Promise.all(
        ownLockedPakete.map((p) =>
          invokeFunction('releaseLernpaketLockSecure', { lernpaketId: p.id }).catch((err) => {
            console.warn('[Workspace] releaseLernpaketLockSecure failed for', p.id, err);
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['workspace-data', selectedEinheitId] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      toast.success('Bearbeitungsmodus beendet.');
    } finally {
      setReleasingOwnLocks(false);
    }
  }, [ownLockedPakete, releasingOwnLocks, queryClient, selectedEinheitId]);

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

  // ── Ring der Macht: Lifecycle-Hard-Lock ─────────────────────────────────
  // Sobald die Einheit final freigegeben oder im Export ist, sind ALLE
  // Bearbeitungsknöpfe in jedem Tab weg — keine „Bearbeiten"-Buttons,
  // kein „Bearbeitungsmodus aktivieren", kein „Mit KI entwerfen", nichts.
  // Aufhebung läuft ausschließlich über das Freigabe-Cockpit (Tab 8) bzw.
  // das Export-Center (Moodle-Team).
  const { data: einheitFreigabe } = useEinheitFreigabeStatus(einheit?.id);
  const isEinheitContentLocked = einheitFreigabe?.isContentLocked === true;
  const lifecycleStatus = einheitFreigabe?.status || EXPORT_LIFECYCLE_STATUS.DRAFT;

  const kannDieseEinheitBearbeiten = einheit
    ? (permissions.kannEinheitBearbeiten(einheit.fach) || unitAccess.hasFullAccess) && (!einheitGesperrt || kannSperreIgnorieren) && !isEinheitContentLocked
    : false;

  // ── Präsenz ──────────────────────────────────────────────────────────────────
  const { onlineUsers } = usePresence(selectedEinheitId);

  // ── Structural-Lock (explizit per Button) ─────────────────────────────────

  // Lock freigeben wenn Einheit gewechselt wird ODER Tab gewechselt wird.
  // Hinweis: Tab 7 "dashboards" recycelt den Structural Lock – daher hier ebenfalls erlaubt.
  useEffect(() => {
    if (isStructuralEditingActive && activeTab !== 'struktur' && activeTab !== 'dashboards') {
      handleReleaseStructLock();
    }
    if (isTab1EditingActive && activeTab !== 'einheit') {
      handleReleaseTab1Lock();
    }
  }, [activeTab, isStructuralEditingActive, isTab1EditingActive]);



  useEffect(() => {
    if (isStructuralEditingActive && !selectedEinheitId) {
      handleReleaseStructLock();
    }
    if (isTab1EditingActive && !selectedEinheitId) {
      handleReleaseTab1Lock();
    }
  }, [selectedEinheitId, isStructuralEditingActive, isTab1EditingActive]);

  // Lock freigeben bei Page-Unmount (wenn User die Seite verlässt)
  useEffect(() => {
    return () => {
      if (isStructuralEditingActive && einheit) {
        invokeFunction('releaseStructuralLockSecure', { einheit_id: einheit.id })
          .catch(console.error);
      }
      if (isTab1EditingActive && einheit) {
        invokeFunction('releaseStructuralLockSecure', { einheit_id: einheit.id })
          .catch(console.error);
      }
    };
  }, [isStructuralEditingActive, isTab1EditingActive, einheit?.id]);

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

  // Toast-Text-Helper: erzeugt aus einem 409-Response des Deep-Scans eine
  // sprechende Meldung — abhängig davon, welche Ebene blockiert
  // (struktur | lernpaket | aufgabe). Wird sowohl für 'structure' als
  // auch 'dashboard' verwendet, damit Tab 2 und Tab 7 dasselbe sagen.
  const buildUnitLockBlockerToast = (data) => {
    const name = data?.lockedByName || data?.lockedByEmail;
    const blocker = data?.scope; // 'struktur' | 'lernpaket' | 'aufgabe'
    const title = data?.blockerTitle;
    if (!name) return 'Diese Einheit ist gerade gesperrt. Bitte erneut versuchen.';
    if (blocker === 'lernpaket') {
      return title
        ? `🔒 ${name} bearbeitet gerade das Lernpaket „${title}". Sobald die Bearbeitung abgeschlossen ist, kannst du loslegen.`
        : `🔒 ${name} bearbeitet gerade ein Lernpaket in dieser Einheit. Bitte kurz warten oder Rücksprache halten.`;
    }
    if (blocker === 'aufgabe') {
      return title
        ? `🔒 ${name} bearbeitet gerade die Aufgabe „${title}". Sobald die Bearbeitung abgeschlossen ist, kannst du loslegen.`
        : `🔒 ${name} bearbeitet gerade eine Aufgabe in dieser Einheit. Bitte kurz warten oder Rücksprache halten.`;
    }
    return `🔒 ${name} bearbeitet gerade die Struktur dieser Einheit. Bitte warten Sie, bis die Bearbeitung abgeschlossen ist.`;
  };

  const handleAcquireStructLock = async () => {
    if (!einheit) return;
    setAcquiringStructLock(true);
    try {
      const res = await invokeFunction('acquireUnitLockSecure', {
        einheit_id: einheit.id,
        scope: 'structure',
      });
      if (res.data?.success) {
        setIsStructuralEditingActive(true);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
        toast.success('✅ Strukturbearbeitung aktiviert. Andere Nutzer können jetzt keine Änderungen mehr vornehmen.');
      } else {
        toast.error(buildUnitLockBlockerToast(res.data));
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error(buildUnitLockBlockerToast(err.response.data));
      } else {
        toast.error('Fehler beim Erwerben der Structural-Sperre.');
      }
    } finally {
      setAcquiringStructLock(false);
    }
  };

  // Dashboards (Tab 7): Pre-Flight-Check über alle Locks der Einheit
  // (Struktur, Lernpakete, Aufgaben). Bei Konflikt → blockierende Toast-
  // Meldung mit Klartext-Namen, kein Lock-Erwerb. Bei Erfolg → harter
  // Struktur-Lock auf der gesamten Einheit (gleiche DB-Felder, daher
  // kompatibel zu allen anderen Tabs, die den Lock auswerten).
  const handleAcquireDashboardLock = async () => {
    if (!einheit) return;
    setAcquiringStructLock(true);
    try {
      const res = await invokeFunction('acquireUnitLockSecure', {
        einheit_id: einheit.id,
        scope: 'dashboard',
      });
      if (res.data?.success) {
        setIsStructuralEditingActive(true);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
        toast.success('✅ Dashboards-Bearbeitung aktiviert. Die gesamte Einheit ist jetzt für andere gesperrt.');
        return;
      }
      toast.error(buildUnitLockBlockerToast(res.data));
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error(buildUnitLockBlockerToast(err.response.data));
      } else {
        toast.error('Fehler beim Starten der Dashboards-Bearbeitung.');
      }
    } finally {
      setAcquiringStructLock(false);
    }
  };

  // Dashboards: Save → Wait → Unlock → Exit (strikt synchron).
  // Das Cockpit registriert über `dashboardFlushRef` eine flush-Funktion
  // (`useDashboardSync.flushSave`), die alle ausstehenden Änderungen
  // synchron persistiert. Erst nach erfolgreichem Save wird der Lock
  // freigegeben und der Edit-Modus beendet. Schlägt der Save fehl,
  // bleibt der Lock bestehen, damit nichts verloren geht.
  const handleEndDashboardEditing = async () => {
    if (!einheit) return;
    setEndingDashboardEdit(true);
    try {
      // Schritt 1+2: Save + auf 200 OK warten.
      const flush = dashboardFlushRef.current;
      if (typeof flush === 'function') {
        try {
          await flush();
        } catch (saveErr) {
          console.error('[handleEndDashboardEditing] Save fehlgeschlagen:', saveErr);
          toast.error(
            'Speichern fehlgeschlagen. Die Bearbeitung bleibt aktiv, damit nichts verloren geht. Bitte erneut versuchen.'
          );
          setEndingDashboardEdit(false);
          return;
        }
      }
      // Schritt 3: KRITISCH — Workspace-Daten frisch aus DB laden, BEVOR
      // wir den Edit-Modus beenden. Sonst sieht das Cockpit beim Wechsel
      // auf Read-Only noch den ALTEN `einheit.lernpfade_konfiguration`-Prop
      // und überschreibt den lokalen State (frisch gespeichert!) mit dem
      // veralteten Server-Snapshot. Ergebnis: Dashboards erscheinen leer,
      // obwohl die DB die korrekten Daten hält.
      try {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['einheiten-list-secure'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['workspace-data', selectedEinheitId], type: 'all' }),
        ]);
      } catch (refetchErr) {
        console.warn('[handleEndDashboardEditing] Refetch fehlgeschlagen:', refetchErr);
      }
      // Schritt 4: Lock freigeben.
      await handleReleaseStructLock();
      // Schritt 5: handleReleaseStructLock setzt isStructuralEditingActive=false.
    } finally {
      setEndingDashboardEdit(false);
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

  const handleAcquireTab1Lock = async () => {
    if (!einheit) return;
    setAcquiringTab1Lock(true);
    try {
      const res = await invokeFunction('acquireUnitLockSecure', {
        einheit_id: einheit.id,
        scope: 'structure',
      });
      if (res.data?.success) {
        setIsTab1EditingActive(true);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
        toast.success('✅ Bearbeitungsmodus aktiviert.');
      } else {
        const name = res.data?.lockedByName || res.data?.lockedByEmail;
        toast.error(
          name
            ? `🔒 Einheit wird gerade von ${name} bearbeitet. Bitte warten Sie bis die Bearbeitung abgeschlossen ist.`
            : 'Bearbeitungsmodus konnte nicht aktiviert werden. Bitte laden Sie die Seite neu.'
        );
      }
    } catch (err) {
      const data = err?.response?.data;
      const name = data?.lockedByName || data?.lockedByEmail;
      if (err?.response?.status === 409) {
        toast.error(name ? `🔒 Einheit wird von ${name} bearbeitet.` : '🔒 Einheit ist gerade gesperrt. Bitte versuchen Sie es erneut.');
      } else {
        toast.error(`Bearbeitungsmodus konnte nicht gestartet werden: ${err?.message || 'Unbekannter Fehler'}`);
      }
    } finally {
      setAcquiringTab1Lock(false);
    }
  };

  const handleReleaseTab1Lock = async () => {
    if (!einheit) return;
    setReleasingTab1Lock(true);
    try {
      await invokeFunction('releaseStructuralLockSecure', {
        einheit_id: einheit.id,
      });
    } catch (err) {
      // Lock-Release-Fehler ignorieren – Bearbeitungsmodus wird trotzdem beendet
      console.warn('[Tab1 Lock Release] Fehler beim Lock-Release (ignoriert):', err?.response?.status);
    } finally {
      // Bearbeitungsmodus IMMER beenden, unabhängig vom Lock-Release-Ergebnis
      setIsTab1EditingActive(false);
      setReleasingTab1Lock(false);
      queryClient.refetchQueries({ queryKey: ['workspace-data', einheit.id] });
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
  // AFK-Polish 2026-05-14: synchron zu Backend, war 30 Min.
  const PAKET_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
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
    window.localStorage.setItem(LAST_EINHEIT_STORAGE_KEY, id);
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

  const handleCloseDialog = useCallback(() => {
    // Dialog geschlossen → selectedNode zurücksetzen auf 'einheit'
    // Das freigeben des Lernpaket-Locks wird dann automatisch vom Backend übernommen
    if (selectedNode?.type === 'aktivitaet-edit' || selectedNode?.type === 'phase') {
      setSelectedNode({ type: 'einheit', id: selectedEinheitId });
    }
  }, [selectedNode?.type, selectedEinheitId]);

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

  // Während des Dashboard-Edit-Beenden-Vorgangs (Save → Refetch → Lock-Release)
  // ein blockierendes Overlay zeigen, damit der User in den ~10 Sekunden nicht
  // weiterklicken und damit Race-Conditions oder verlorene Änderungen erzeugen
  // kann. Analog zum Strukturboard-Verhalten.
  const showDashboardEndOverlay = endingDashboardEdit || (activeTab === 'dashboards' && releasingStructLock);

  // 🚪 DETAILDATEN-GATE (2026-06-06):
  // Solange eine Einheit gewählt ist, aber ihre Detaildaten (Grundgerüst +
  // Lernziele) noch nicht vollständig aus der DB geladen sind, öffnen wir die
  // Einheit NICHT, sondern zeigen einen Lade-Bildschirm. Das verhindert das
  // verwirrende „Lernziele/Grundgerüst plötzlich weg" während eines laufenden
  // (Hintergrund-)Fetchs. Im Struktur-Edit-Modus ist der Cache absichtlich
  // eingefroren — dort greift das Gate nicht.
  const detailGateBlocking =
    !!einheit && !isStructuralEditingActive && !detailReady;

  return (
    <ErrorBoundary label="Workspace">
      <LoadingOverlay isVisible={showDashboardEndOverlay} />
      <div className="flex flex-col h-full w-full bg-background overflow-hidden">

        {/* ── Lifecycle-Lock-Banner (Ring der Macht) ───────────────────────── */}
        {isEinheitContentLocked && (
          <div className="shrink-0 px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>
              <strong>{EXPORT_LIFECYCLE_LABELS[lifecycleStatus] || 'Einheit final freigegeben'}</strong> – Alle Bearbeitungsfunktionen in allen Tabs sind gesperrt.{' '}
              {lifecycleStatus === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
                ? 'Die Einheit wird gerade vom Moodle-Team exportiert. Aufhebung nur über das Export-Center.'
                : 'Hebe die Freigabe im Freigabe-Cockpit (Tab 8) auf, um wieder zu bearbeiten.'}
            </span>
          </div>
        )}

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
        ) : detailGateBlocking ? (
          /* 🚪 Detaildaten-Gate: Einheit wird erst geöffnet, wenn Grundgerüst
             und Lernziele vollständig aus der Datenbank geladen sind. */
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div>
              <p className="font-semibold">Einheit wird vollständig geladen …</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Grundgerüst und Lernziele werden aus der Datenbank geholt. Die Einheit
                öffnet sich automatisch, sobald alle Inhalte verfügbar sind.
              </p>
            </div>
          </div>
        ) : (
         <Tabs
           value={activeTab}
           onValueChange={handleTabChange}
           className="flex flex-col flex-1 overflow-hidden m-0 p-0">

            {/* ── PERSISTENTER LOCK-STATUS-BANNER (alle Tabs außer Dashboards) ──
                In Tab 7 (dashboards) wird der Beenden-Button platzsparend in
                der Aktionszeile des Architekten angezeigt – kein Banner. */}
            {(isStructuralEditingActive || isTab1EditingActive) && activeTab !== 'dashboards' && activeTab !== 'struktur' && (
              <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-1.5 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
                <PenLine className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-blue-900 flex-1">
                  ✏️ Du befindest dich im Bearbeitungsmodus. Nur du kannst Änderungen vornehmen.
                </span>
                <button
                  onClick={isStructuralEditingActive ? handleReleaseStructLock : handleReleaseTab1Lock}
                  disabled={releasingStructLock || releasingTab1Lock}
                  className="text-xs font-medium px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  {(releasingStructLock || releasingTab1Lock) ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                  Bearbeitung beenden
                </button>
              </div>
            )}

            {/* 10-Step Navigation – der Einheits-Titel wird global im AppLayout-Header
                angezeigt, daher ist hier keine separate Titel-Zeile mehr nötig.
                Der Strukturlock-„Bearbeiten starten"-Button (Tab 2) wird kompakt
                rechts neben der Tab-Leiste eingeblendet, wenn er aktivierbar ist. */}
            <div className="px-4 sm:px-6 lg:px-8 py-1.5 border-b border-border bg-card shrink-0 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <WorkspaceTabs activeTab={activeTab} onTabChange={handleTabChange} isBasismodul={isBasismodul} />
              </div>
              {activeTab === 'struktur' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStrukturCompact(c => !c)}
                  className="h-7 gap-1.5 text-xs shrink-0"
                >
                  {strukturCompact ? <AlignJustify className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                  {strukturCompact ? 'Normal' : 'Kompakt'}
                </Button>
              )}
              {activeTab === 'struktur' && isStructuralEditingActive && (
                <button
                  onClick={handleReleaseStructLock}
                  disabled={releasingStructLock}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {releasingStructLock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                  Bearbeitung beenden
                </button>
              )}
              {(activeTab === 'struktur' || activeTab === 'dashboards') &&
                !isStructuralEditingActive &&
                !isEinheitContentLocked &&
                (permissions.kannStrukturBearbeiten(einheit?.fach) || unitAccess.hasFullAccess) && (
                  <button
                    onClick={activeTab === 'dashboards' ? handleAcquireDashboardLock : handleAcquireStructLock}
                    disabled={acquiringStructLock || structLocked}
                    title={
                      structLocked
                        ? `Gesperrt von ${einheit?.structural_lock}`
                        : (activeTab === 'dashboards' ? 'Dashboards-Bearbeitung starten' : 'Strukturbearbeitung starten')
                    }
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acquiringStructLock
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <PenLine className="w-3.5 h-3.5" />}
                    {activeTab === 'dashboards' ? 'Dashboards bearbeiten' : 'Struktur bearbeiten'}
                  </button>
                )}
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
                       isEditingActive={isTab1EditingActive}
                       onAcquireLock={handleAcquireTab1Lock}
                       onReleaseLock={handleReleaseTab1Lock}
                       isAcquiring={acquiringTab1Lock}
                       isReleasing={releasingTab1Lock}
                       isEinheitContentLocked={isEinheitContentLocked}
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
                            key={strukturBoardKey}
                            einheitId={selectedEinheitId}
                            einheit={einheit}
                            lernpakete={paketeFuerEinheit}
                            lernziele={zieleFuerEinheit}
                            themenfelder={themenfelder}
                            queryClient={queryClient}
                            readOnly={!isStructuralEditingActive || isLockedByOther || isEinheitContentLocked}
                            isStructuralEditingActive={isStructuralEditingActive && !isEinheitContentLocked}
                            isLockedByOther={isLockedByOther}
                            compact={strukturCompact}
                            onSaved={async () => {
                              // 🔄 PHASE 1: Key-Remount erzwingt kompletten Neustart der Komponente
                              console.log('[Workspace] 🔄 onSaved-Callback: Triggere Board-Remount via Key-Increment');
                              setStrukturBoardKey(prev => prev + 1);

                              // ⚠️ Kleine Verzögerung (100ms), damit React die alte Komponente abbaut + neue mountet
                              await new Promise(resolve => setTimeout(resolve, 100));

                              // 🔄 PHASE 2: Lock freigeben (setzt isStructuralEditingActive=false)
                              console.log('[Workspace] 🔄 Gebe Structural Lock frei...');
                              await handleReleaseStructLock();

                              // 🔄 PHASE 3: Force-Refetch der Workspace-Daten
                              // Wichtig: staleTime:Infinity im Edit-Modus blockiert invalidations,
                              // daher MUSS man refetch() aufrufen nach Lock-Release
                              console.log('[Workspace] 🔄 Force-Refetch workspace-data...');
                              await queryClient.refetchQueries({ queryKey: ['workspace-data', selectedEinheitId], type: 'all' });
                            }}
                          />
                       </ErrorBoundary>
                    </div>
                  </TabsContent>

            {/* ── Tab 3: Lernziele (zentraler Heimatort) ───────────────────────── */}
            <TabsContent value="lernziele" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <ErrorBoundary label="Lernziele">
                  <LernzieleUebersichtTab
                    einheit={einheit}
                    lernpakete={paketeFuerEinheit}
                    lernziele={zieleFuerEinheit}
                    themenfelder={themenfelder}
                    kannBearbeiten={kannDieseEinheitBearbeiten && !isLockedByOther}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* ── Tab 4: Aktivitäten zuordnen → Sidebar-Baum + Detail-Panel ───── */}
            <TabsContent value="aktivitaeten" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0">
              <ErrorBoundary label="Aktivitäten-Struktur">
                {/* Sticky Edit-Banner – direkt an globalem isLernpaketEditActive gebunden (Single Source of Truth).
                    Zeigt die konkret gesperrten Pakete an und erlaubt dem Lock-Inhaber, den Modus
                    explizit zu beenden — wichtig nach Reload/Verbindungsabbruch, wo der Edit-Dialog
                    nicht mehr offen ist, der DB-Lock aber noch lebt. */}
                {isLernpaketEditActive && (
                  <div className="shrink-0 bg-orange-500 text-white px-6 py-2.5 flex items-center gap-3">
                    <PenLine className="w-4 h-4 shrink-0 animate-pulse" />
                    <div className="text-sm flex-1 min-w-0">
                      <div className="font-semibold">
                        ✏️ Bearbeitungsmodus aktiv – {ownLockedPakete.length === 1 ? '1 Lernpaket ist' : `${ownLockedPakete.length} Lernpakete sind`} für andere gesperrt
                      </div>
                      <div className="text-xs text-orange-50 truncate mt-0.5">
                        {ownLockedPakete.map((p) => p.titel_des_pakets).join(' · ')}
                      </div>
                    </div>
                    <button
                      onClick={handleReleaseOwnLernpaketLocks}
                      disabled={releasingOwnLocks}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-60"
                      title="Hebt die Sperre auf allen oben genannten Lernpaketen auf"
                    >
                      {releasingOwnLocks
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Unlock className="w-3.5 h-3.5" />}
                      Bearbeitung beenden
                    </button>
                  </div>
                )}
                <div className={cn(
                  "flex flex-col lg:flex-row flex-1 overflow-hidden transition-colors",
                  isLernpaketEditActive && "bg-orange-50/60 ring-2 ring-inset ring-orange-300"
                )}>
                <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden h-64 lg:h-full min-h-0">
                   <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b h-11">
                     <Layers className="w-4 h-4 text-primary shrink-0" />
                     <span className="text-sm font-semibold flex-1">Lernpakete</span>
                     <HelpDialog
                       title="Aktivitäten zuordnen"
                       description="Hier ordnest du jedem Lernpaket konkrete Aktivitäten zu – gegliedert nach den Lernphasen Input, Übung und Abschluss. Wähle links ein Lernpaket aus, um rechts seine Phasen und Aktivitäten zu bearbeiten."
                       docsSlug="lernpakete-aktivitaeten"
                     />
                   </div>
                   <div className="flex-1 overflow-hidden min-h-0 p-2">
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
                            onClose={handleCloseDialog}
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

            {/* ── Tab 7: Dashboards (Lernpfad-Architekt) ────────────────────── */}
            <TabsContent value="dashboards" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col flex-1 overflow-hidden m-0 p-0 min-h-0">
              <ErrorBoundary label="Lernpfad-Architekt">
                <LernpfadeCockpit
                  einheit={einheit}
                  isStructuralEditingActive={isStructuralEditingActive}
                  isLockedByOther={isLockedByOther}
                  kannBearbeiten={kannDieseEinheitBearbeiten}
                  isEndingEdit={endingDashboardEdit || releasingStructLock}
                  onEndEditing={handleEndDashboardEditing}
                  flushRef={dashboardFlushRef}
                />
              </ErrorBoundary>
            </TabsContent>

            {/* ── Tab 8: Freigabe-Cockpit ──────────────────────────────────────── */}
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
                    onOpenDashboardArchitekt={(lerntyp, sektorId) => {
                      // Phase F.2: Deep-Link Tab 8 → Tab 7. Wir schreiben die
                      // Ziel-Parameter als URL-Params; das LernpfadeCockpit
                      // liest sie beim Mount aus und scrollt zum Sektor.
                      const next = new URLSearchParams(searchParams);
                      if (selectedEinheitId) next.set('einheit', selectedEinheitId);
                      if (lerntyp) next.set('lerntyp', lerntyp);
                      if (sektorId) {
                        next.set('sektor', sektorId);
                      } else {
                        next.delete('sektor');
                      }
                      setSearchParams(next);
                      handleTabChange('dashboards');
                    }}
                  />
                </ErrorBoundary>
              </div>
            </TabsContent>

            {/* Phase H Cleanup: Tabs 9 (Moodle-Export) und 10 (Brian.study
                Export) wurden aus der Einheitenansicht entfernt. Beide
                Workflows laufen jetzt zentral im Export-Center (Hauptmenü). */}

          </Tabs>
        )}

      </div>
    </ErrorBoundary>
  );
}