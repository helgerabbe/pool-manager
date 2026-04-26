/**
 * useDashboardRelease.js
 *
 * Bündelt die Lock/Unlock-Logik für einen Lernpfad-Lerntyp:
 *   - Pre-Flight `collectBlockers` (gelb/rot Items sammeln).
 *   - Race-Condition-sicherer `handleApplyTemplate` (frischen Status fetchen).
 *   - `handleReleasePath`  (DRAFT → LOCKED, mit Blocker-Modal).
 *   - `handleUnlockPath`   (LOCKED → DRAFT, mit Confirm).
 *   - State für das Blocker-Modal (offen/geschlossen + Liste).
 *
 * Nicht Teil dieses Hooks:
 *   - Konfigurations-State (lebt im Cockpit).
 *   - debounced Save (kommt aus useDashboardSync, wird nur über `flushSave`-Prop genutzt).
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { PFAD_STATUS } from '@/lib/pfadStatus';
import { AMPEL } from '@/lib/ampelLogic';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';
import { applyDashboardTemplate } from '@/lib/lernpfadeUtils';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';

export function useDashboardRelease({
  einheitId,
  activeLernTyp,
  konfiguration,
  aufgabenById,
  getAmpelStatusForItem,
  istPfadGesperrt,
  darfFreigeben,
  darfEntsperren,
  flushSave,
  hasPendingSave,
  updateKonfiguration,
  onTemplateApplied,
  lerntypLabel,
}) {
  const queryClient = useQueryClient();
  const [statusBusy, setStatusBusy] = useState(false);
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [blockers, setBlockers] = useState([]);

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
    if (!einheitId || !darfFreigeben || istPfadGesperrt || statusBusy) return;

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

    // 2. Sicherheitsabfrage: Lehrkräfte sollen sich nicht versehentlich aussperren.
    const label = lerntypLabel || activeLernTyp;
    const ok = window.confirm(
      `Lernpfad „${label}" jetzt freigeben und sperren?\n\n` +
      'Die Schüler sehen den Pfad danach. Änderungen sind erst nach „Entsperren" wieder möglich.'
    );
    if (!ok) return;

    // 3. Vor dem Lock: pending Save flushen, damit die Junction-Table garantiert aktuell ist.
    if (hasPendingSave?.()) {
      await flushSave();
    }

    // 4. Lock-Aufruf
    setStatusBusy(true);
    try {
      const res = await base44.functions.invoke('setLernpfadStatus', {
        einheitId,
        lerntyp: activeLernTyp,
        newStatus: PFAD_STATUS.LOCKED,
      });
      if (res?.data?.ok) {
        toast.success(`Lernpfad „${label}" erfolgreich freigegeben und gesperrt.`);
        queryClient.invalidateQueries({ queryKey: ['lernpfadStatus', einheitId, activeLernTyp] });
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
    einheitId,
    darfFreigeben,
    istPfadGesperrt,
    statusBusy,
    konfiguration,
    activeLernTyp,
    collectBlockers,
    queryClient,
    flushSave,
    hasPendingSave,
    lerntypLabel,
  ]);

  const handleUnlockPath = useCallback(async () => {
    if (!einheitId || !darfEntsperren || !istPfadGesperrt || statusBusy) return;
    const label = lerntypLabel || activeLernTyp;
    const ok = window.confirm(
      `Lernpfad „${label}" wirklich entsperren? Aufgaben werden in Tab 5 wieder bearbeitbar.`
    );
    if (!ok) return;

    setStatusBusy(true);
    try {
      const res = await base44.functions.invoke('setLernpfadStatus', {
        einheitId,
        lerntyp: activeLernTyp,
        newStatus: PFAD_STATUS.DRAFT,
      });
      if (res?.data?.ok) {
        toast.success(`Lernpfad „${label}" entsperrt.`);
        queryClient.invalidateQueries({ queryKey: ['lernpfadStatus', einheitId, activeLernTyp] });
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
  }, [einheitId, darfEntsperren, istPfadGesperrt, statusBusy, activeLernTyp, queryClient, lerntypLabel]);

  // Magic-Raster Phase 4: Standard-Raster anwenden.
  // Pre-Flight-Check schließt die Race Condition zwischen "Pfad ist im Cockpit
  // als 'draft' bekannt" und "ein anderer User hat soeben freigegeben". Wir
  // bypassen daher den Cache und holen die Memberships frisch via fetchQuery.
  const handleApplyTemplate = useCallback(async () => {
    if (!einheitId || !activeLernTyp) return;

    // 1. Pre-Flight: frischen Status laden, niemals aus Cache.
    let liveStatus = PFAD_STATUS.EMPTY;
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: ['lernpfadStatus', einheitId, activeLernTyp],
        queryFn: async () => {
          const list = await base44.entities.LernpfadAufgabeMembership.filter({
            einheit_id: einheitId,
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
      onTemplateApplied?.();
      return;
    }

    // 3. Bestätigungsdialog.
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
    onTemplateApplied?.();
    toast.success('Standard-Raster geladen.');
  }, [einheitId, activeLernTyp, queryClient, updateKonfiguration, onTemplateApplied]);

  return {
    statusBusy,
    blockerOpen,
    setBlockerOpen,
    blockers,
    handleReleasePath,
    handleUnlockPath,
    handleApplyTemplate,
  };
}