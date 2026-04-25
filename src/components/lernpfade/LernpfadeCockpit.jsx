/**
 * LernpfadeCockpit.jsx
 *
 * Hauptkomponente für Tab 7 "Dashboards" (Lernpfad-Architekt).
 * Verantwortlich für:
 *   - Strukturelle Lese-/Schreibsperre (recycelt structural_lock der Einheit).
 *   - Halten des lernpfade_konfiguration-State (lokal, debounced gespiegelt nach Backend).
 *   - Layout: 30% Pool (links) + 70% Architekt (rechts).
 *
 * Persistenz-Modell:
 *   - Beim Mount: Snapshot aus einheit.lernpfade_konfiguration laden.
 *   - Bei Änderung: lokal State aktualisieren, Backend-Save mit 800ms Debounce.
 *   - Bei Unmount/Lock-Verlust: pending Save sofort flushen.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, PenLine, Unlock, Cloud, CloudOff, ShieldCheck, ShieldOff, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LernpfadeAufgabenPool from '@/components/lernpfade/LernpfadeAufgabenPool';
import LernpfadeArchitekt from '@/components/lernpfade/LernpfadeArchitekt';
import LernpfadeQuickAddModal from '@/components/lernpfade/LernpfadeQuickAddModal';
import AufgabePreviewDialog from '@/components/lernpfade/AufgabePreviewDialog';
import ReleaseBlockerModal from '@/components/lernpfade/ReleaseBlockerModal';
import DidaktischerGuidePanel from '@/components/lernpfade/DidaktischerGuidePanel';
import { LERN_TYPEN } from '@/components/lernpfade/LernpfadeArchitekt';
import { useLernpfadStatus } from '@/hooks/useLernpfadStatus';
import { PFAD_STATUS } from '@/lib/pfadStatus';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { AMPEL } from '@/lib/ampelLogic';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';
import {
  getUsedAufgabenIds,
  createNewSektor,
  addSektor,
  patchSektor,
  removeSektor,
  insertAufgabeInSektor,
  insertSystemBausteinInSektor,
  removeAufgabeFromLernTyp,
  moveAufgabe,
  copySektorenBetweenLernTypen,
  applyDashboardTemplate,
} from '@/lib/lernpfadeUtils';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { getAmpelStatus } from '@/lib/ampelLogic';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';

// Drag-IDs aus dem Pool:
//   • Aufgabe-Pool   → draggableId = <aufgabe.id>            (UUID)
//   • System-Pool    → draggableId = "system-<baustein_id>"  (Präfix)
const SYSTEM_DRAG_PREFIX = 'system-';

const DEFAULT_KONFIG = { minimalist: [], pragmatiker: [], ehrgeizig: [], passioniert: [] };
const DEBOUNCE_MS = 800;

export default function LernpfadeCockpit({
  einheit,
  isStructuralEditingActive,
  isLockedByOther,
  acquiringStructLock,
  releasingStructLock,
  onAcquireLock,
  onReleaseLock,
  kannBearbeiten,
}) {
  // ── State ───────────────────────────────────────────────────────────
  const [konfiguration, setKonfiguration] = useState(
    () => einheit?.lernpfade_konfiguration || DEFAULT_KONFIG
  );
  const [activeLernTyp, setActiveLernTyp] = useState('pragmatiker');
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Magic-Raster Phase 3: Slide-Over für den Didaktischen Guide.
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Monitor-Selection: zentral – wird sowohl vom Pool (links) als auch vom Architekt (rechts) gesetzt.
  // Genau eins von beidem ist gesetzt; das jeweils andere wird beim Setzen geleert.
  const [selectedAufgabeId, setSelectedAufgabeIdState] = useState(null);
  const [selectedSystemBausteinId, setSelectedSystemBausteinIdState] = useState(null);
  const [previewAufgabe, setPreviewAufgabe] = useState(null);

  const setSelectedAufgabeId = useCallback((id) => {
    setSelectedAufgabeIdState(id);
    if (id) setSelectedSystemBausteinIdState(null);
  }, []);
  const setSelectedSystemBausteinId = useCallback((id) => {
    setSelectedSystemBausteinIdState(id);
    if (id) setSelectedAufgabeIdState(null);
  }, []);

  // Tab-Wechsel: Monitor leeren (Item gehört evtl. nicht mehr zum sichtbaren Pfad).
  const handleActiveLernTypChange = useCallback((typKey) => {
    setActiveLernTyp(typKey);
    setSelectedAufgabeIdState(null);
    setSelectedSystemBausteinIdState(null);
  }, []);

  const queryClient = useQueryClient();

  // Aufgaben dieser Einheit – nötig, um IDs in den Sektoren zu echten Karten aufzulösen.
  const { data: aufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheit?.id],
    queryFn: () => (einheit?.id ? getAufgabenByEinheit(einheit.id) : Promise.resolve([])),
    enabled: !!einheit?.id,
  });
  const aufgabenById = useMemo(() => {
    const map = new Map();
    (aufgaben || []).forEach((a) => map.set(a.id, a));
    return map;
  }, [aufgaben]);

  // System-Bausteine (global) – inkl. inaktiver, damit alte Pfade bei deaktiviertem
  // Baustein noch eine Beschriftung im Sektor zeigen.
  const { data: systemBausteine = [] } = useQuery({
    queryKey: ['systemBausteine', 'all'],
    queryFn: () => base44.entities.SystemBausteine.list('reihenfolge'),
  });
  const systemBausteineById = useMemo(() => {
    const map = new Map();
    (systemBausteine || []).forEach((b) => map.set(b.baustein_id, b));
    return map;
  }, [systemBausteine]);

  // Lernpakete dieser Einheit – nur für die Ampel-Aggregation (Bündel-Rekursion).
  // Wird einmalig geladen, vermeidet so N+1-Queries pro Sektor-Item.
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete-by-einheit', einheit?.id],
    queryFn: () =>
      einheit?.id
        ? base44.entities.Lernpakete.filter({ einheit_id: einheit.id })
        : Promise.resolve([]),
    enabled: !!einheit?.id,
  });
  const lernpaketeById = useMemo(() => {
    const map = new Map();
    (lernpakete || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [lernpakete]);

  // Memoisierter Status-Resolver. Wird an LernpfadeArchitekt → LernpfadeSektor → AufgabePill
  // weitergereicht und liefert pro Item synchron 'green' | 'yellow' | 'red'.
  const ampelCtx = useMemo(
    () => ({ aufgabenById, lernpaketeById }),
    [aufgabenById, lernpaketeById]
  );
  const getAmpelStatusForItem = useCallback(
    (item) => getAmpelStatus(item, ampelCtx),
    [ampelCtx]
  );

  // Editor-Modal für „Klick auf rotes Badge → schnell ergänzen".
  const [editorAufgabe, setEditorAufgabe] = useState(null);
  const handleOpenAufgabeEditor = useCallback((aufgabe) => {
    if (aufgabe) setEditorAufgabe(aufgabe);
  }, []);

  // ── Phase 4A: Lernpfad-Status (locked_for_export ↔ draft) ─────────────
  // Status-Read + Berechtigungsableitung. Die Action-Handler (Lock/Unlock)
  // werden unten — nach flushSave — definiert, weil sie diesen referenzieren.
  const { data: pfadStatusData } = useLernpfadStatus(einheit?.id, activeLernTyp);
  const pfadStatus = pfadStatusData?.status || PFAD_STATUS.EMPTY;
  const istPfadGesperrt = pfadStatus === PFAD_STATUS.LOCKED;

  // RBAC: Wer darf freigeben/entsperren?
  // - Freigabe: Administrator, FACHSCHAFT (im Fach), LEHRKRAFT (im Fach – Unit-LEITUNG wird
  //   zusätzlich serverseitig akzeptiert; clientseitig genügt 'kannBearbeiten' als Proxy).
  // - Entsperren: STRENGER – nur Administrator + FACHSCHAFT (im Fach).
  const { rolle, faecher } = useRBAC();
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaftFuerFach =
    rolle === ROLLEN.FACHSCHAFT &&
    Array.isArray(faecher) && einheit?.fach && faecher.includes(einheit.fach);
  const darfFreigeben = kannBearbeiten === true; // identisch mit Edit-Berechtigung
  const darfEntsperren = istAdmin || istFachschaftFuerFach;

  // ── Pre-Flight Check + Blocker-Modal ──────────────────────────────────
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [blockers, setBlockers] = useState([]);
  const [statusBusy, setStatusBusy] = useState(false);

  // Re-Sync, wenn der Einheit-Snapshot sich ändert (z.B. nach Tab-Wechsel)
  // ABER NUR im Lesemodus – im Edit-Modus ist der lokale State führend.
  useEffect(() => {
    if (!isStructuralEditingActive) {
      setKonfiguration(einheit?.lernpfade_konfiguration || DEFAULT_KONFIG);
    }
  }, [einheit?.lernpfade_konfiguration, isStructuralEditingActive]);

  // ── Debounced Save ─────────────────────────────────────────────────
  const debounceTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  const flushSave = useCallback(async () => {
    if (!einheit?.id || !pendingPayloadRef.current) return;
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    setSaveState('saving');
    try {
      await base44.entities.Einheiten.update(einheit.id, { lernpfade_konfiguration: payload });
      // Junction-Table synchron halten (idempotent, fire-and-forget Logging).
      // Wenn der Sync fehlschlägt, ist das KEIN Save-Fehler – die Konfiguration
      // selbst liegt schon korrekt in der DB. Wir loggen nur und cachen invalidieren.
      try {
        await base44.functions.invoke('syncLernpfadMembership', { einheitId: einheit.id });
        // Ampel- und Lock-Daten könnten sich geändert haben.
        // exact: false → invalidiert ALLE ['aufgabeLock', <id>]-Queries,
        // damit ein in einem anderen Tab offener Editor frisch lädt.
        queryClient.invalidateQueries({ queryKey: ['aufgabeLock'], exact: false });
      } catch (syncErr) {
        console.warn('[LernpfadeCockpit] Membership-Sync fehlgeschlagen:', syncErr);
        toast.warning(
          'Echtzeit-Sync der Aufgaben-Sperre verzögert. Status in der Bearbeitungsansicht könnte abweichen.'
        );
      }
      setSaveState('saved');
      // Nach 1.5s zurück auf 'idle' – nur visuelles Feedback.
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (err) {
      setSaveState('error');
      toast.error('Lernpfad-Konfiguration konnte nicht gespeichert werden.');
      console.error('[LernpfadeCockpit] Save-Fehler:', err);
    }
  }, [einheit?.id, queryClient]);

  const scheduleSave = useCallback(
    (next) => {
      pendingPayloadRef.current = next;
      setSaveState('pending');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        flushSave();
      }, DEBOUNCE_MS);
    },
    [flushSave]
  );

  // Beim Unmount: pending save flushen, Timer säubern.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (pendingPayloadRef.current) {
        flushSave();
      }
    };
  }, [flushSave]);

  // Wenn der Lock verloren geht (kein Edit-Modus mehr): pending save flushen.
  useEffect(() => {
    if (!isStructuralEditingActive && pendingPayloadRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      flushSave();
    }
  }, [isStructuralEditingActive, flushSave]);

  // ── Update-API für die Architekt-Subkomponente ────────────────────
  const updateKonfiguration = useCallback(
    (updater) => {
      setKonfiguration((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  // ── Phase 4A: Lock/Unlock-Aktionen ─────────────────────────────────
  // Sammelt alle Items des aktiven Lerntyps, die NICHT grün sind. System-Bausteine
  // sind per Definition immer grün und werden nicht aufgenommen.
  const collectBlockers = useCallback(() => {
    const sektoren = konfiguration?.[activeLernTyp] || [];
    const result = [];
    sektoren.forEach((sektor, sektorIndex) => {
      const items = Array.isArray(sektor.items) ? sektor.items : [];
      items.forEach((item) => {
        if (!item || item.type !== ITEM_TYPE.AUFGABE) return;
        const status = getAmpelStatusForItem(item);
        if (status === AMPEL.GREEN) return;
        result.push({
          aufgabe: aufgabenById.get(item.ref_id) || { id: item.ref_id, titel: 'Unbekannte Aufgabe' },
          status,
          sektorTitel: sektor.titel,
          sektorIndex,
        });
      });
    });
    return result;
  }, [konfiguration, activeLernTyp, aufgabenById, getAmpelStatusForItem]);

  const handleReleasePath = useCallback(async () => {
    if (!einheit?.id || !darfFreigeben || istPfadGesperrt || statusBusy) return;

    // 1. Pre-Flight: alle Items grün?
    const sektoren = konfiguration?.[activeLernTyp] || [];
    const totalItems = sektoren.reduce(
      (acc, s) => acc + (Array.isArray(s.items) ? s.items.length : 0),
      0
    );
    if (totalItems === 0) {
      toast.error('Der Lernpfad ist leer und kann nicht freigegeben werden.');
      return;
    }

    const found = collectBlockers();
    if (found.length > 0) {
      setBlockers(found);
      setBlockerOpen(true);
      return;
    }

    // 2. Vor dem Lock: pending Save flushen, damit die Junction-Table garantiert aktuell ist.
    if (pendingPayloadRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      await flushSave();
    }

    // 3. Lock-Aufruf
    setStatusBusy(true);
    try {
      const res = await base44.functions.invoke('setLernpfadStatus', {
        einheitId: einheit.id,
        lerntyp: activeLernTyp,
        newStatus: PFAD_STATUS.LOCKED,
      });
      if (res?.data?.ok) {
        const label = LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label || activeLernTyp;
        toast.success(`Lernpfad „${label}" erfolgreich freigegeben und gesperrt.`);
        queryClient.invalidateQueries({ queryKey: ['lernpfadStatus', einheit.id, activeLernTyp] });
        // exact: false → trifft alle Aufgaben-Lock-Queries (auch in anderen Tabs/Editoren).
        queryClient.invalidateQueries({ queryKey: ['aufgabeLock'], exact: false });
      } else {
        toast.error(res?.data?.error || 'Freigabe fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Freigabe fehlgeschlagen.');
      console.error('[setLernpfadStatus] lock', err);
    } finally {
      setStatusBusy(false);
    }
  }, [
    einheit?.id,
    darfFreigeben,
    istPfadGesperrt,
    statusBusy,
    konfiguration,
    activeLernTyp,
    collectBlockers,
    queryClient,
    flushSave,
  ]);

  const handleUnlockPath = useCallback(async () => {
    if (!einheit?.id || !darfEntsperren || !istPfadGesperrt || statusBusy) return;
    const label = LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label || activeLernTyp;
    const ok = window.confirm(
      `Lernpfad „${label}" wirklich entsperren? Aufgaben werden in Tab 5 wieder bearbeitbar.`
    );
    if (!ok) return;

    setStatusBusy(true);
    try {
      const res = await base44.functions.invoke('setLernpfadStatus', {
        einheitId: einheit.id,
        lerntyp: activeLernTyp,
        newStatus: PFAD_STATUS.DRAFT,
      });
      if (res?.data?.ok) {
        toast.success(`Lernpfad „${label}" entsperrt.`);
        queryClient.invalidateQueries({ queryKey: ['lernpfadStatus', einheit.id, activeLernTyp] });
        // exact: false → trifft alle Aufgaben-Lock-Queries (auch in anderen Tabs/Editoren).
        queryClient.invalidateQueries({ queryKey: ['aufgabeLock'], exact: false });
      } else {
        toast.error(res?.data?.error || 'Entsperren fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Entsperren fehlgeschlagen.');
      console.error('[setLernpfadStatus] unlock', err);
    } finally {
      setStatusBusy(false);
    }
  }, [einheit?.id, darfEntsperren, istPfadGesperrt, statusBusy, activeLernTyp, queryClient]);

  // ── Magic-Raster Phase 4: Template anwenden ────────────────────────
  // Pre-Flight-Check schließt die Race Condition zwischen "Pfad ist im
  // Cockpit als 'draft' bekannt" und "ein anderer User hat soeben
  // freigegeben". Wir bypassen daher den Cache und holen die Memberships
  // frisch via queryClient.fetchQuery — exakt mit derselben queryFn wie
  // useLernpfadStatus, damit die Logik konsistent bleibt.
  const handleApplyTemplate = useCallback(async () => {
    if (!einheit?.id || !activeLernTyp) return;

    // 1. Pre-Flight: frischen Status laden, niemals aus Cache.
    let liveStatus = PFAD_STATUS.EMPTY;
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: ['lernpfadStatus', einheit.id, activeLernTyp],
        queryFn: async () => {
          const list = await base44.entities.LernpfadAufgabeMembership.filter({
            einheit_id: einheit.id,
            lerntyp: activeLernTyp,
          });
          if (!list || list.length === 0) {
            return { status: PFAD_STATUS.EMPTY, count: 0 };
          }
          const hasLocked = list.some((m) => m.pfad_status === PFAD_STATUS.LOCKED);
          return {
            status: hasLocked ? PFAD_STATUS.LOCKED : PFAD_STATUS.DRAFT,
            count: list.length,
          };
        },
        staleTime: 0,
      });
      liveStatus = fresh?.status || PFAD_STATUS.EMPTY;
    } catch (err) {
      console.error('[handleApplyTemplate] Status-Refetch fehlgeschlagen:', err);
      toast.error('Pfad-Status konnte nicht geprüft werden. Bitte erneut versuchen.');
      return;
    }

    // 2. Race Condition: in der Zwischenzeit gesperrt → Abbruch.
    if (liveStatus === PFAD_STATUS.LOCKED) {
      toast.error(
        'Abbruch: Der Lernpfad wurde in der Zwischenzeit freigegeben und gesperrt.'
      );
      setIsGuideOpen(false);
      return;
    }

    // 3. Bestätigungsdialog (nativ – wir wollen keinen weiteren Modal-Stack).
    const ok = window.confirm(
      'Achtung: Dies überschreibt den kompletten aktuellen Aufbau dieses Dashboards. ' +
      'Bestehende Aufgaben werden aus den Sektoren entfernt. Fortfahren?'
    );
    if (!ok) return;

    // 4. Template laden und anwenden. scheduleSave (in updateKonfiguration)
    //    übernimmt automatisch Persistierung + Junction-Sync.
    const template = DASHBOARD_TEMPLATES[activeLernTyp];
    if (!Array.isArray(template)) {
      toast.error(`Für „${activeLernTyp}" ist kein Standard-Raster definiert.`);
      return;
    }

    updateKonfiguration((prev) => applyDashboardTemplate(prev, activeLernTyp, template));
    setSelectedAufgabeId(null);
    setSelectedSystemBausteinId(null);
    setIsGuideOpen(false);
    toast.success('Standard-Raster geladen.');
  }, [
    einheit?.id,
    activeLernTyp,
    queryClient,
    updateKonfiguration,
    setSelectedAufgabeId,
    setSelectedSystemBausteinId,
  ]);

  // ── Render-Helfer ──────────────────────────────────────────────────
  // Phase 4A: Wenn der Pfad freigegeben ist (locked_for_export), wird der
  // gesamte Canvas dieses Lerntyps read-only – auch wenn der User den
  // Strukturlock hält. Drag&Drop/Sektor-Editieren sind dann unmöglich,
  // bis ein Berechtigter den Pfad explizit entsperrt.
  const readOnly = !isStructuralEditingActive || isLockedByOther || istPfadGesperrt;

  // Set aller Aufgaben-IDs, die im aktuell aktiven Lerntyp bereits in einem Sektor stecken.
  // Wird an den Pool gereicht (visuelle Sperre) UND als Fallback im onDragEnd geprüft.
  const usedAufgabenIds = useMemo(
    () => getUsedAufgabenIds(konfiguration, activeLernTyp),
    [konfiguration, activeLernTyp]
  );

  // ── Sektor-Handler ─────────────────────────────────────────────────
  const handleAddSektor = useCallback(() => {
    if (readOnly) return;
    updateKonfiguration((prev) => addSektor(prev, activeLernTyp, createNewSektor()));
  }, [readOnly, activeLernTyp, updateKonfiguration]);

  const handlePatchSektor = useCallback(
    (sektorId, patch) => {
      if (readOnly) return;
      updateKonfiguration((prev) => patchSektor(prev, activeLernTyp, sektorId, patch));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleRemoveSektor = useCallback(
    (sektorId) => {
      if (readOnly) return;
      updateKonfiguration((prev) => removeSektor(prev, activeLernTyp, sektorId));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleRemoveAufgabeFromPath = useCallback(
    (aufgabeId) => {
      if (readOnly) return;
      updateKonfiguration((prev) => removeAufgabeFromLernTyp(prev, activeLernTyp, aufgabeId));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // System-Bausteine werden POSITIONS-genau entfernt (nicht per ref_id), weil
  // derselbe Baustein mehrfach in einem Sektor vorkommen darf.
  const handleRemoveSystemItem = useCallback(
    (sektorId, itemIndex) => {
      if (readOnly) return;
      updateKonfiguration((prev) => {
        const sektoren = prev?.[activeLernTyp] || [];
        const next = sektoren.map((s) => {
          if (s.sektor_id !== sektorId) return s;
          const items = [...(s.items || [])];
          if (itemIndex < 0 || itemIndex >= items.length) return s;
          if (items[itemIndex]?.type !== 'system') return s; // safety: nicht versehentlich Aufgaben löschen
          items.splice(itemIndex, 1);
          return { ...s, items };
        });
        return { ...prev, [activeLernTyp]: next };
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // ── Pfad kopieren ──────────────────────────────────────────────────
  // Tiefe Kopie von Quell-Lerntyp → aktuellem Lerntyp; jeder Sektor erhält neue UUID.
  // Geht ganz normal durch updateKonfiguration → Debounce-Save triggert automatisch.
  const handleCopyFromLernTyp = useCallback(
    (sourceLernTyp) => {
      if (readOnly || !sourceLernTyp || sourceLernTyp === activeLernTyp) return;
      const sourceCount = (konfiguration?.[sourceLernTyp] || []).length;
      if (sourceCount === 0) {
        toast.info('Der gewählte Lerntyp enthält keine Sektoren.');
        return;
      }
      const targetCount = (konfiguration?.[activeLernTyp] || []).length;
      if (targetCount > 0) {
        const ok = window.confirm(
          `Aktuelle Struktur (${targetCount} Sektor${targetCount === 1 ? '' : 'en'}) wird durch ${sourceCount} Sektor${sourceCount === 1 ? '' : 'en'} ersetzt. Fortfahren?`
        );
        if (!ok) return;
      }
      updateKonfiguration((prev) => copySektorenBetweenLernTypen(prev, sourceLernTyp, activeLernTyp));
      setSelectedAufgabeId(null);
      toast.success('Pfad kopiert.');
    },
    [readOnly, activeLernTyp, konfiguration, updateKonfiguration]
  );

  // ── Drag & Drop ────────────────────────────────────────────────────
  // Pool → Sektor (Aufgabe ODER System-Baustein), Sektor → Sektor (Reorder/Move).
  const handleDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (readOnly) return;

      const srcId = source.droppableId;
      const dstId = destination.droppableId;

      // Drop zurück in einen Pool → keine Aktion (Items werden über X-Button entfernt).
      if (dstId === 'pool' || dstId === 'pool-system') return;

      // ── Pool → Sektor ──
      if ((srcId === 'pool' || srcId === 'pool-system') && dstId.startsWith('sektor-')) {
        const sektorId = dstId.replace('sektor-', '');

        // System-Baustein: kein Duplikat-Check, kein Limit.
        if (srcId === 'pool-system' && draggableId.startsWith(SYSTEM_DRAG_PREFIX)) {
          const bausteinId = draggableId.slice(SYSTEM_DRAG_PREFIX.length);
          updateKonfiguration((prev) =>
            insertSystemBausteinInSektor(prev, activeLernTyp, sektorId, bausteinId, destination.index)
          );
          return;
        }

        // Reguläre Aufgabe: Anti-Duplikat (Sicherheits-Check zur visuellen Drag-Sperre).
        if (srcId === 'pool') {
          if (usedAufgabenIds.has(draggableId)) {
            toast.error('Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.');
            return;
          }
          updateKonfiguration((prev) =>
            insertAufgabeInSektor(prev, activeLernTyp, sektorId, draggableId, destination.index)
          );
          return;
        }
      }

      // ── Sektor → Sektor (oder gleicher Sektor = Reorder) ──
      // Funktioniert für Aufgaben- UND System-Items gleichermaßen, weil moveAufgabe
      // rein index-basiert das gesamte Item (inkl. type) verschiebt.
      if (srcId.startsWith('sektor-') && dstId.startsWith('sektor-')) {
        const fromSektorId = srcId.replace('sektor-', '');
        const toSektorId = dstId.replace('sektor-', '');
        if (fromSektorId === toSektorId && source.index === destination.index) return;
        updateKonfiguration((prev) =>
          moveAufgabe(prev, activeLernTyp, fromSektorId, source.index, toSektorId, destination.index)
        );
        return;
      }
    },
    [readOnly, activeLernTyp, usedAufgabenIds, updateKonfiguration]
  );

  // ── Monitor-Selection ──────────────────────────────────────────────
  const selectedAufgabe = useMemo(
    () => (selectedAufgabeId ? aufgabenById.get(selectedAufgabeId) || null : null),
    [aufgabenById, selectedAufgabeId]
  );
  const selectedSystemBaustein = useMemo(
    () =>
      selectedSystemBausteinId
        ? systemBausteineById.get(selectedSystemBausteinId) || null
        : null,
    [systemBausteineById, selectedSystemBausteinId]
  );

  // ── Quick-Add ──────────────────────────────────────────────────────
  // Nach erfolgreicher Erstellung: ID in den letzten Sektor einfügen
  // (oder einen neuen Sektor anlegen, falls noch keiner existiert) und Pool-Cache invalidieren.
  const handleQuickAddCreated = useCallback(
    (created) => {
      if (!created?.id) return;
      updateKonfiguration((prev) => {
        const sektoren = prev?.[activeLernTyp] || [];
        if (sektoren.length === 0) {
          // Neuer Sektor wird leer angelegt, dann via Util um die Aufgabe ergänzt.
          const sek = createNewSektor();
          const withSektor = addSektor(prev, activeLernTyp, sek);
          return insertAufgabeInSektor(withSektor, activeLernTyp, sek.sektor_id, created.id, undefined);
        }
        const lastSektor = sektoren[sektoren.length - 1];
        return insertAufgabeInSektor(prev, activeLernTyp, lastSektor.sektor_id, created.id, undefined);
      });
      // Re-Fetch der Pool-Liste, damit die neue Aufgabe dort (direkt als "verwendet") erscheint.
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheit?.id] });
    },
    [activeLernTyp, updateKonfiguration, queryClient, einheit?.id]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top-Bar: Lock-Status + Save-Indicator */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/40 flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">Lernpfad-Architekt</h2>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          Phase 4 – Vorschau &amp; Kopie
        </span>

        {/* Save-Indicator */}
        <div className="ml-auto flex items-center gap-2">
          {saveState === 'pending' && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Änderung registriert…
            </span>
          )}
          {saveState === 'saving' && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Speichere…
            </span>
          )}
          {saveState === 'saved' && (
            <span className="text-[11px] text-emerald-700 flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Gespeichert
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-[11px] text-destructive flex items-center gap-1">
              <CloudOff className="w-3 h-3" /> Fehler
            </span>
          )}

          {/* Lock-Steuerung */}
          {kannBearbeiten && !isLockedByOther && (
            isStructuralEditingActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onReleaseLock}
                disabled={releasingStructLock}
                className="gap-1.5 h-7 text-xs"
              >
                {releasingStructLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                Bearbeitung beenden
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onAcquireLock}
                disabled={acquiringStructLock}
                className="gap-1.5 h-7 text-xs"
              >
                {acquiringStructLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                Bearbeiten starten
              </Button>
            )
          )}

          {isLockedByOther && (
            <span className="text-[11px] text-orange-700 flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              <Lock className="w-3 h-3" /> Gesperrt von {einheit?.structural_lock}
            </span>
          )}
        </div>
      </div>

      {/* Freigabe-Bar (Phase 4A): zeigt Status des aktiven Lerntyps + CTA.
          Magic-Raster Phase 3: Trigger-Button für den Didaktischen Guide
          links, damit er auch im Lese-Modus jederzeit erreichbar ist. */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-card flex items-center gap-3 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsGuideOpen(true)}
          className="gap-1.5 h-7 text-xs"
          title="Didaktische Erklärung & Standard-Raster für diesen Lerntyp"
        >
          <BookOpen className="w-3 h-3" />
          Didaktischer Guide
        </Button>

        {istPfadGesperrt ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <ShieldCheck className="w-3 h-3" />
              Pfad „{LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label}" freigegeben &amp; gesperrt
            </span>
            <span className="text-[11px] text-muted-foreground">
              Aufgaben sind in Tab 5 read-only.
            </span>
            {darfEntsperren && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnlockPath}
                disabled={statusBusy}
                className="ml-auto gap-1.5 h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
              >
                {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                Lernpfad entsperren
              </Button>
            )}
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
              Pfad „{LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label}" – Entwurf
            </span>
            {darfFreigeben && (
              <Button
                size="sm"
                onClick={handleReleasePath}
                disabled={statusBusy || !isStructuralEditingActive || isLockedByOther}
                className="ml-auto gap-1.5 h-7 text-xs"
                title={
                  !isStructuralEditingActive
                    ? 'Bitte zuerst Bearbeiten starten'
                    : 'Validieren und freigeben'
                }
              >
                {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                Lernpfad prüfen &amp; freigeben
              </Button>
            )}
          </>
        )}
      </div>

      {/* Layout: 30/70-Split – DragDropContext umschließt beide Spalten,
          damit Aufgaben aus dem Pool in die rechten Sektoren gezogen werden können. */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Pool (links, ca. 30%) */}
          <aside className="w-full lg:w-[30%] lg:min-w-[280px] lg:max-w-[420px] border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col overflow-hidden h-72 lg:h-auto shrink-0">
            <LernpfadeAufgabenPool
              einheitId={einheit?.id}
              usedAufgabenIds={usedAufgabenIds}
              selectedAufgabe={selectedAufgabe}
              selectedSystemBaustein={selectedSystemBaustein}
              onSelectAufgabe={setSelectedAufgabeId}
              onSelectSystemBaustein={setSelectedSystemBausteinId}
              onPreviewAufgabe={setPreviewAufgabe}
            />
          </aside>

          {/* Architekt (rechts, ca. 70%) */}
          <main className="flex-1 overflow-hidden min-h-0">
            <LernpfadeArchitekt
              konfiguration={konfiguration}
              activeLernTyp={activeLernTyp}
              onActiveLernTypChange={handleActiveLernTypChange}
              readOnly={readOnly}
              aufgabenById={aufgabenById}
              systemBausteineById={systemBausteineById}
              onAddSektor={handleAddSektor}
              onPatchSektor={handlePatchSektor}
              onRemoveSektor={handleRemoveSektor}
              onRemoveAufgabeFromPath={handleRemoveAufgabeFromPath}
              onRemoveSystemItem={handleRemoveSystemItem}
              onQuickAddOpen={() => setQuickAddOpen(true)}
              onSelectAufgabe={setSelectedAufgabeId}
              onSelectSystemBaustein={setSelectedSystemBausteinId}
              selectedAufgabeId={selectedAufgabeId}
              selectedSystemBausteinId={selectedSystemBausteinId}
              onCopyFromLernTyp={handleCopyFromLernTyp}
              getAmpelStatusForItem={getAmpelStatusForItem}
              onOpenAufgabeEditor={handleOpenAufgabeEditor}
            />
          </main>
        </div>
      </DragDropContext>

      <LernpfadeQuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        einheitId={einheit?.id}
        onCreated={handleQuickAddCreated}
      />

      <AufgabePreviewDialog
        open={!!previewAufgabe}
        onOpenChange={(v) => !v && setPreviewAufgabe(null)}
        aufgabe={previewAufgabe}
      />

      {/* Pre-Flight-Blocker (Phase 4A): listet rote/gelbe Items mit Quick-Fix. */}
      <ReleaseBlockerModal
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
        blockers={blockers}
        lerntypLabel={LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label}
        onOpenEditor={(aufgabe) => {
          setBlockerOpen(false);
          handleOpenAufgabeEditor(aufgabe);
        }}
      />

      {/* Magic-Raster Phase 3: Didaktischer Guide. Apply-Click ist hier
          bewusst eine Dummy-Funktion — die echte Template-Apply-Logik
          folgt in Phase 4 und wird dann unter onApplyClick verkabelt. */}
      <DidaktischerGuidePanel
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lerntyp={activeLernTyp}
        isLocked={istPfadGesperrt}
        onApplyClick={handleApplyTemplate}
      />

      {/* Inline-Editor: Klick auf rotes Ampel-Badge öffnet die Aufgabe direkt zur Korrektur.
          Greift dieselbe Lock-Logik wie Tab 5. */}
      <AufgabeCreateView
        open={!!editorAufgabe}
        onOpenChange={(v) => !v && setEditorAufgabe(null)}
        einheitId={einheit?.id}
        themenfelder={[]}
        initialData={editorAufgabe}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheit?.id] });
        }}
      />
    </div>
  );
}