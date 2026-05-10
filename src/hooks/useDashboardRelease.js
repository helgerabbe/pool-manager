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
  // Phase E: Themenfelder der Einheit – werden an applyDashboardTemplate
  // durchgereicht, damit Arbeitsphase-Sektoren pro Themenfeld expandiert
  // werden. Optional, leeres Array => Fallback auf 1 Arbeitsphase-Sektor.
  themenfelder = [],
  // Killer-Switch: sobald die Einheit `final_freigegeben` oder
  // `export_running` ist, sind ALLE Schreibaktionen aus diesem Hook
  // gesperrt — auch für Admin/Fachschaft. Aufhebung nur über das
  // Freigabe-Cockpit (oder das MBK-Lock, falls 'export_running').
  isEinheitContentLocked = false,
}) {
  const queryClient = useQueryClient();
  const [statusBusy, setStatusBusy] = useState(false);
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [blockers, setBlockers] = useState([]);
  // Confirm-Dialog (Erfolgsfall): wird geöffnet, wenn die Pre-Flight-Prüfung
  // sauber durchläuft. Nutzer sieht das Prüfergebnis und bestätigt explizit.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSummary, setConfirmSummary] = useState({
    sektorCount: 0,
    itemCount: 0,
    aufgabenCount: 0,
  });
  // Reset-Confirm-Dialog: Da neue Einheiten dank Default-Templates schon
  // mit befüllten Dashboards starten, ist der Guide-Button keine reine
  // „Raster laden"-Aktion mehr, sondern überschreibt potenziell bereits
  // vorgenommene Zuweisungen. Wir öffnen daher einen expliziten
  // Bestätigungsdialog statt eines stillen window.confirm.
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

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
    if (isEinheitContentLocked) {
      toast.error('Die Einheit ist final freigegeben — einzelne Dashboards können nicht mehr verändert werden.');
      return;
    }

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

    // 2. Pre-Flight ok → Confirm-Dialog mit Prüfergebnis öffnen.
    let aufgabenCount = 0;
    let itemCount = 0;
    sektoren.forEach((s) => {
      const items = Array.isArray(s.items) ? s.items : [];
      itemCount += items.length;
      items.forEach((it) => {
        if (it?.type === ITEM_TYPE.AUFGABE) aufgabenCount += 1;
      });
    });
    setConfirmSummary({
      sektorCount: sektoren.length,
      itemCount,
      aufgabenCount,
    });
    setConfirmOpen(true);
  }, [
    einheitId,
    darfFreigeben,
    istPfadGesperrt,
    statusBusy,
    konfiguration,
    activeLernTyp,
    collectBlockers,
    isEinheitContentLocked,
  ]);

  // Wird vom Confirm-Dialog ausgelöst, nachdem der Nutzer das Prüfergebnis
  // gesehen und „Jetzt freigeben & sperren" gedrückt hat.
  const confirmReleasePath = useCallback(async () => {
    if (!einheitId || statusBusy) return;
    if (isEinheitContentLocked) {
      toast.error('Die Einheit ist final freigegeben — einzelne Dashboards können nicht mehr verändert werden.');
      return;
    }
    const label = lerntypLabel || activeLernTyp;

    // Vor dem Lock: pending Save flushen, damit die Junction-Table garantiert aktuell ist.
    if (hasPendingSave?.()) {
      await flushSave();
    }

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
        // Toolbar-Pills (Dot grün/grau) + „Einheit final freigeben"-Button hängen
        // am einheitFreigabeStatus-Hook → unbedingt mit-invalidieren, sonst
        // aktualisiert sich die UI erst nach Tab-Wechsel/Reload.
        queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheitId] });
        // exact: false → trifft alle Aufgaben-Lock-Queries (auch in anderen Tabs/Editoren).
        queryClient.invalidateQueries({ queryKey: ['aufgabeLock'], exact: false });
        setConfirmOpen(false);
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
    statusBusy,
    activeLernTyp,
    queryClient,
    flushSave,
    hasPendingSave,
    lerntypLabel,
    isEinheitContentLocked,
  ]);

  const handleUnlockPath = useCallback(async () => {
    if (!einheitId || !darfEntsperren || !istPfadGesperrt || statusBusy) return;
    if (isEinheitContentLocked) {
      toast.error('Die Einheit ist final freigegeben — einzelne Dashboards können nicht mehr entsperrt werden. Bitte zuerst die Einheit-Freigabe im Freigabe-Cockpit aufheben.');
      return;
    }
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
        // Pill-Dot + „Einheit final freigeben"-Button aktuell halten.
        queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheitId] });
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
  }, [einheitId, darfEntsperren, istPfadGesperrt, statusBusy, activeLernTyp, queryClient, lerntypLabel, isEinheitContentLocked]);

  // „Auf Standard zurücksetzen" – Schritt 1 (Trigger):
  // Pre-Flight-Check schließt die Race Condition zwischen „Pfad ist im
  // Cockpit als 'draft' bekannt" und „ein anderer User hat soeben
  // freigegeben". Wir bypassen daher den Cache und holen die
  // Memberships frisch via fetchQuery. Bei Erfolg öffnet sich der
  // Reset-Confirm-Dialog (eigentliches Anwenden in `confirmResetTemplate`).
  const handleApplyTemplate = useCallback(async () => {
    if (!einheitId || !activeLernTyp) return;
    if (isEinheitContentLocked) {
      toast.error('Die Einheit ist final freigegeben — Standard-Raster können nicht mehr angewendet werden.');
      return;
    }

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

    // 3. Reset-Confirm-Dialog öffnen. Eigentliches Anwenden geschieht
    //    im `confirmResetTemplate`-Handler nach Nutzer-Bestätigung.
    setResetConfirmOpen(true);
  }, [einheitId, activeLernTyp, queryClient, onTemplateApplied, isEinheitContentLocked]);

  // „Auf Standard zurücksetzen" – Schritt 2 (Anwenden nach Bestätigung):
  // Lädt das Template für den aktiven Lerntyp und schreibt es über
  // `updateKonfiguration` in den State. scheduleSave kümmert sich um
  // Persistierung + Junction-Sync.
  const confirmResetTemplate = useCallback(() => {
    if (!activeLernTyp) return;
    const template = DASHBOARD_TEMPLATES[activeLernTyp];
    if (!Array.isArray(template)) {
      toast.error(`Für „${activeLernTyp}" ist kein Standard-Raster definiert.`);
      setResetConfirmOpen(false);
      return;
    }
    updateKonfiguration((prev) =>
      applyDashboardTemplate(prev, activeLernTyp, template, themenfelder)
    );
    setResetConfirmOpen(false);
    onTemplateApplied?.();
    toast.success(`Dashboard „${lerntypLabel || activeLernTyp}" auf Standard zurückgesetzt.`);
  }, [activeLernTyp, updateKonfiguration, onTemplateApplied, lerntypLabel, themenfelder]);

  return {
    statusBusy,
    blockerOpen,
    setBlockerOpen,
    blockers,
    handleReleasePath,
    handleUnlockPath,
    handleApplyTemplate,
    // Confirm-Dialog (Erfolgsfall der Pre-Flight-Prüfung)
    confirmOpen,
    setConfirmOpen,
    confirmSummary,
    confirmReleasePath,
    // Reset-Confirm-Dialog (Guide-Button → „Auf Standard zurücksetzen")
    resetConfirmOpen,
    setResetConfirmOpen,
    confirmResetTemplate,
  };
}