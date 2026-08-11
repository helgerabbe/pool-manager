import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLernpaketStatus } from '@/lib/statusLogic';
import { cn } from '@/lib/utils';
import { useLernpaketLock } from '@/hooks/useLocks';
import { StatusBadge, kategorieColors } from './SharedUI';
import LernpaketLebenszyklusBadge from './LernpaketLebenszyklusBadge';
import PhaseContent from './PhaseContent';
import LernpaketWizardModal from '@/components/workspace/lernpaketWizard/LernpaketWizardModal';
import LernpaketPreviewModal from '@/components/workspace/preview/LernpaketPreviewModal';
import LernpaketAnbietenButton from '@/components/workspace/integration/LernpaketAnbietenButton';


import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Lock, Plus, Edit, Trash2, Clock, AlertTriangle, PenLine, Loader2, ChevronRight, Menu, Target, Save, Wand2, ArrowRight, CheckCircle2, Eye, PencilRuler
} from 'lucide-react';
import { useLernpaketReleaseReadiness } from '@/hooks/useCompleteness';
import { useCanToggleLernpaketRelease } from '@/hooks/useReleaseLock';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';

export default function LernpaketPanel({
  paket,
  lernziele,
  aufgaben,
  kannBearbeiten,
  userEmail,
  istAdmin,
  onNavigate: onNavigateRaw,
  onNewLernziel,
  onDelete,
  // Phase 8: optional, für Hierarchie-Sperre. Wenn nicht übergeben, läuft
  // alles wie vorher — die Sperre evaluiert dann „Einheit nicht final".
  einheit = null,
}) {
  const onNavigate = onNavigateRaw;
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [localTitel, setLocalTitel] = useState(paket.titel_des_pakets || '');
  const [localPhasenConfig, setLocalPhasenConfig] = useState(paket.phasen_konfiguration || {});
  const [isSavingDialog, setIsSavingDialog] = useState(false);

  // Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.1). Nur sichtbar, solange
  // der Edit-Dialog offen ist UND der Nutzer den Lock hält.
  const [wizardOpen, setWizardOpen] = useState(false);
  // Schüler-Vorschau des gesamten Pakets (aus Tab 5 hierher gewandert).
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: lernpaketAktivitaeten = [], isFetched: aktivitaetenFetched } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    // Tombstones (sync_status='to_delete') ausblenden, sonst erscheinen
    // gelöschte Aktivitäten weiterhin in der Inhaltsseite.
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      sync_status: { $ne: 'to_delete' },
    }),
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  // Master-Aufgaben — für die Schüler-Vorschau des gesamten Pakets.
  const { data: alleMasters = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
  });

  const { canEdit, isLockedByOther, lockedByEmail, lockErrorMessage, isLoading: isLockLoading, acquireLock, releaseLock } = useLernpaketLock(paket.id);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);

  // Release-Logik für den kompakten Button in der Aktions-Leiste
  const paketAktivitaetenForRelease = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id);
  // Freigabe-Bereitschaft: alle aktiven (nicht deaktivierten) Aktivitäten freigegeben?
  const phasenCfgForRelease = paket.phasen_konfiguration || {};
  const activeAktivitaetenForRelease = paketAktivitaetenForRelease.filter(
    a => (phasenCfgForRelease[a.phase] || {}).disabled !== true
  );
  // Vereinfachter Freigabe-Workflow (2026-08-11): Aktivitäten werden nicht mehr
  // einzeln freigegeben — sie müssen nur vollständig sein.
  const canReleaseLernpaket =
    activeAktivitaetenForRelease.length > 0 &&
    activeAktivitaetenForRelease.every(a => a.is_complete === true);
  // Status-Badge: mit Aktivitäten berechnen, damit inhaltliche
  // Unvollständigkeit (is_complete=false) das Paket ehrlich rot zeigt.
  const pStatus = getLernpaketStatus(paket, paketZiele, aufgaben, userEmail, [], lernpaketAktivitaeten);
  const releaseReadiness = useLernpaketReleaseReadiness(paket, paketAktivitaetenForRelease);
  const canToggleRelease = useCanToggleLernpaketRelease(paket, einheit);
  // Entkopplung (2026-08-11): Die Freigabe eines Arbeitsplans/Dashboards
  // bezieht sich nur noch auf seine STRUKTUR. Inhaltliche Freigaben von
  // Lernpaketen sind davon unabhängig und werden ausschließlich durch die
  // finale Einheits-Freigabe gesperrt.
  const canToggleLernpaketRelease = canToggleRelease.allowed;
  const releaseLockTitle = !canToggleRelease.allowed
    ? 'Einheit ist final freigegeben — Freigabe gesperrt'
    : '';
  const { setReleaseStatus, isPending: isReleasePending } = useSetReleaseStatus();
  const isReleased = paket.content_status === 'approved' && !!paket.released_at;
  // Freigegebenes Lernpaket → Inhalte gesperrt, Bearbeiten/KI-Füllen deaktiviert.
  const releasedLockTitle = '🔒 Lernpaket ist freigegeben – Inhalte können nicht mehr bearbeitet werden.';

  const handleLernpaketRelease = (next) => {
    setReleaseStatus({ targetType: 'lernpaket', targetId: paket.id, release: next });
  };

  // ── Sonderrolle "Kompaktwissen" (2026-07-28) ────────────────────────
  // Jedes Lernpaket enthält verpflichtend genau EINE Kompaktwissen-Aktivität.
  // Sie wird jetzt serverseitig direkt bei der Erstellung des Lernpakets
  // angelegt (Automation → ensureKompaktwissen), nicht mehr hier im Frontend.
  // Das verhindert Doppelungen durch parallel gemountete Panels.

  // Lock-Lifecycle-Audit-Fix (2026-05-12):
  // Der Dialog wird ERST geöffnet, wenn der Lock sicher erworben ist, und der
  // Lock wird IMMER wieder freigegeben (Save-Erfolg, Save-Fehler, Cancel,
  // Outside-Click). isAcquiringLock wird in allen Pfaden korrekt zurückgesetzt.
  const handleOpenEditDialog = async () => {
    if (isAcquiringLock || canEdit || isLockedByOther) return;
    setIsAcquiringLock(true);
    try {
      const ok = await acquireLock();
      if (!ok) {
        const msg = lockErrorMessage || (lockedByEmail
          ? `🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`
          : 'Lock konnte nicht erworben werden.');
        toast.error(msg);
        return;
      }
      setLocalPhasenConfig(paket.phasen_konfiguration || {});
      // Kein Dialog mehr: Bearbeitungsmodus wird direkt inline aktiviert.
      // canEdit wird durch acquireLock() automatisch true (Hook-State).
    } catch (err) {
      console.error('[LernpaketPanel] acquireLock failed:', err);
      toast.error('Fehler beim Sperren des Lernpakets.');
    } finally {
      setIsAcquiringLock(false);
    }
  };

  // Wizard: Lock erwerben, dann Modal öffnen. Beim Schließen Lock freigeben –
  // gleicher Lifecycle wie Bearbeiten, damit kein Paralleledit möglich ist.
  const handleOpenWizard = async () => {
    if (isAcquiringLock || canEdit || isLockedByOther) return;
    setIsAcquiringLock(true);
    try {
      const ok = await acquireLock();
      if (!ok) {
        const msg = lockErrorMessage || (lockedByEmail
          ? `🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`
          : 'Lock konnte nicht erworben werden.');
        toast.error(msg);
        return;
      }
      setWizardOpen(true);
    } catch (err) {
      console.error('[LernpaketPanel] acquireLock (wizard) failed:', err);
      toast.error('Fehler beim Sperren des Lernpakets.');
    } finally {
      setIsAcquiringLock(false);
    }
  };

  const handleCloseWizard = async () => {
    setWizardOpen(false);
    try {
      await releaseLock();
    } catch (err) {
      console.warn('[LernpaketPanel] releaseLock (wizard) failed:', err);
    }
  };

  // Abbrechen: Drafts verwerfen, Lock garantiert freigeben.
  const handleCancelEditDialog = async () => {
    setLocalPhasenConfig(paket.phasen_konfiguration || {});
    try {
      await releaseLock();
    } catch (err) {
      console.warn('[LernpaketPanel] releaseLock on cancel failed:', err);
    } finally {
      setIsAcquiringLock(false);
    }
  };

  // Speichern: secure-Function nutzen, danach Lock garantiert freigeben –
  // auch im Fehlerfall, sonst bleibt das Lernpaket für den User verriegelt
  // und die OCC-Version ist beim nächsten Versuch veraltet.
  //
  // Hinweis (2026-05-12, Bug-Fix "Speichern reagiert nicht"):
  // - `canEdit` aus dem useLernpaketLock-Hook kann durch SSE/Re-Mount
  //   zwischenzeitlich auf `false` fallen, OBWOHL der Lock im Backend noch
  //   gültig dem Nutzer gehört. Wir verlassen uns deshalb nicht auf das
  //   Frontend-Flag — das Backend prüft `is_locked && locked_by_email ===
  //   user.email` ohnehin als Single Source of Truth.
  // - Leere/None-Werte in `lernzielDrafts` und `localPhasenConfig` werden
  //   defensiv normalisiert, damit kein TypeError die Funktion still abbricht.
  const handleSaveEditDialog = async () => {
    if (isSavingDialog) return;
    setIsSavingDialog(true);
    let saveSucceeded = false;
    try {
      // Lernziele werden nicht mehr hier gespeichert (Pflege erfolgt in Tab 3).
      const lernzielUpdates = [];

      // Atomic Save via secure-Function (nur Lernpaket-Felder).
      //
      // WICHTIG (Bug-Fix 2026-05-14, "Speichern reagiert nicht"):
      // Das Base44-SDK wirft bei HTTP-Non-2xx-Antworten NICHT zuverlässig
      // eine Exception, sondern liefert `{ data, status }` mit Status-Code
      // zurück. Wir müssen den Status und ein eventuell vorhandenes
      // `error`-Feld im Body daher explizit auswerten — sonst landet der
      // Save in einem stummen "Erfolg ohne Wirkung".
      let response;
      try {
        response = await base44.functions.invoke('updateLernpaketSecure', {
          paketId: paket.id,
          updates: { phasen_konfiguration: localPhasenConfig || {} },
          lernzielUpdates,
        });
      } catch (invokeErr) {
        const apiMsg =
          invokeErr?.response?.data?.error ||
          invokeErr?.response?.data?.message ||
          invokeErr?.message ||
          'Unbekannter Netzwerkfehler';
        throw new Error(apiMsg);
      }

      const respData = response?.data ?? response;
      const respStatus = response?.status;
      const hasError =
        (respStatus !== undefined && respStatus >= 400) ||
        (respData && (respData.success === false || respData.error));
      if (hasError) {
        const code = respData?.code ? ` (${respData.code})` : '';
        throw new Error((respData?.error || 'Speichern fehlgeschlagen.') + code);
      }

      saveSucceeded = true;
      queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      toast.success('Änderungen gespeichert.');
    } catch (err) {
      console.error('[LernpaketPanel] Save failed:', err);
      const apiMsg = err?.response?.data?.error || err?.message;
      toast.error(apiMsg ? `Fehler beim Speichern: ${apiMsg}` : 'Fehler beim Speichern.');
    } finally {
      setIsSavingDialog(false);
      // Lock wird in finally freigegeben; canEdit fällt dadurch automatisch auf false.
      try {
        await releaseLock();
      } catch (releaseErr) {
        console.warn('[LernpaketPanel] releaseLock after save failed:', releaseErr);
      }
      setIsAcquiringLock(false);
    }
  };

  React.useEffect(() => {
    setLocalTitel(paket.titel_des_pakets || '');
    // localPhasenConfig nur übernehmen, wenn nicht gerade bearbeitet wird
    if (!canEdit) {
      setLocalPhasenConfig(paket.phasen_konfiguration || {});
    }
  }, [paket.titel_des_pakets, paket.phasen_konfiguration, canEdit]);

  const PHASES = [
    { key: 'Input', label: 'Erarbeitung', icon: '📚', defaultDisabled: false },
    { key: 'Übung', label: 'Übung', icon: '✏️', defaultDisabled: false },
    { key: 'Abschluss', label: 'Abschluss', icon: '🎯', defaultDisabled: false },
  ];

  // Toggle nur lokal; Persistenz erfolgt erst beim "Speichern"-Button im Dialog-Footer.
  const handlePhaseToggle = (phaseKey) => {
    setLocalPhasenConfig((prev) => {
      const phaseConfig = prev[phaseKey] || {};
      return {
        ...prev,
        [phaseKey]: { ...phaseConfig, disabled: !phaseConfig.disabled },
      };
    });
  };

  const handleEnterEditMode = async () => {
    const ok = await acquireLock();
    if (!ok) {
      const errMsg = lockErrorMessage || (lockedByEmail
        ? `🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`
        : 'Lock konnte nicht erworben werden.');
      toast.error(errMsg);
    }
  };

  const handleExitEditMode = async () => {
    await releaseLock();
  };

  return (
    <div className="space-y-6">
      {isLockedByOther && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm">
            🔒 Wird gerade von <strong>{lockedByEmail}</strong> bearbeitet. Sobald die Bearbeitung beendet ist, wird dieses Lernpaket automatisch wieder freigegeben.
          </span>
        </div>
      )}

      {/* Bearbeitungs-Banner: sichtbar, sobald der Nutzer den Lock hält
          (Bearbeiten-Klick → Lock erworben → Dialog wird gleichzeitig
          geöffnet). Bleibt sichtbar, bis der Save/Cancel den Lock
          wieder freigibt. */}
      {canEdit && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-orange-300 bg-orange-50 text-orange-900">
          <PenLine className="w-4 h-4 shrink-0" />
          <span className="text-sm">
            <strong>Bearbeitungsmodus aktiv.</strong> Du bearbeitest dieses Lernpaket gerade — andere können es solange nicht ändern.
          </span>
        </div>
      )}

      {/* Überschrift + Aktions-Buttons – einheitliches Tab-3-Muster:
          Titel → feine Trennlinie → Buttons (rechtsbündig, knapp unter der
          Linie) → Inhalt. Header und Buttons stehen in EINEM Wrapper, damit
          der space-y-6-Abstand des Containers sie nicht auseinanderzieht. */}
      <div className="space-y-3">
      <div className="pb-3 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold">{paket.titel_des_pakets}</h2>
          <StatusBadge status={isReleased ? 'released' : pStatus} />
          <LernpaketLebenszyklusBadge syncStatus={paket.sync_status} />
          {isLockedByOther && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium">
              <Lock className="w-3 h-3" />
              Gesperrt von {paket.locked_by_email}
            </div>
          )}
          {canEdit && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium">
              <PenLine className="w-3 h-3" />
              In Bearbeitung
            </div>
          )}
          {(() => {
            const phasenConfig = paket.phasen_konfiguration || {};
            const hasIncomplete = Object.values(phasenConfig).some(
              phase => phase && phase.selected_aktivitaet_id && !phase.is_complete
            );
            return hasIncomplete ? (
              <span title="Aktivität-Inhalte unvollständig" className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Inhalt unvollständig
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Aktions-Leiste (unter der Überschrift). Bearbeiten + Mit KI füllen
          + Freigeben. Der Löschen-Button wurde absichtlich entfernt: das
          Löschen von Lernpaketen erfolgt zentral durch die Fachschaftsleitung
          im Strukturboard. */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Schüler-Vorschau des gesamten Lernpakets (aus Tab 5 übernommen) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
          className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:text-violet-900"
          title="Das gesamte Lernpaket in der Schüler-Ansicht anzeigen"
        >
          <Eye className="w-3.5 h-3.5" /> Vorschau
        </Button>
        {/* Privatbereich: fertiges Lernpaket einer gemeinschaftlichen Einheit anbieten */}
        {einheit?.sichtbarkeit === 'privat' && kannBearbeiten && (
          <LernpaketAnbietenButton paket={paket} einheit={einheit} />
        )}
        {kannBearbeiten && (
          <>
          {canEdit ? (
            /* Im Bearbeitungsmodus: Button zum Speichern & Beenden */
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEditDialog}
                disabled={isSavingDialog}
                className="gap-2"
              >
                Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditDialog}
                disabled={isSavingDialog}
                className="gap-2"
              >
                {isSavingDialog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditDialog}
              disabled={isAcquiringLock || isLockedByOther || isReleased}
              title={isReleased ? releasedLockTitle : isLockedByOther ? `🔒 Wird gerade von ${paket.locked_by_email} bearbeitet` : ''}
              className="gap-2 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900"
            >
              {isAcquiringLock ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Öffne...</>
              ) : (
                <><PenLine className="w-3.5 h-3.5" />Bearbeiten</>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWizard}
            disabled={isAcquiringLock || canEdit || isLockedByOther || isReleased}
            title={isReleased ? releasedLockTitle : isLockedByOther ? `🔒 Wird gerade von ${paket.locked_by_email} bearbeitet` : 'Aufgabeneditor öffnen — Überblick und KI-Unterstützung für die Aufgaben dieses Pakets'}
            className="gap-2 bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:text-blue-900"
          >
            <Wand2 className="w-3.5 h-3.5 text-blue-600" />
            Aufgabeneditor
          </Button>

          {/* Freigabe des Lernpakets — im vereinten Lernpakete-Tab lebt der
              Freigabe-Workflow direkt hier in der Paket-Ansicht. */}
          {isReleased ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLernpaketRelease(false)}
              disabled={isReleasePending || !canToggleLernpaketRelease}
              title={releaseLockTitle || 'Freigabe zurücknehmen'}
              className="gap-2 bg-green-50 border-green-400 text-green-800 hover:bg-green-100"
            >
              {isReleasePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Freigabe zurücknehmen
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => canReleaseLernpaket && canToggleLernpaketRelease && handleLernpaketRelease(true)}
              disabled={!canReleaseLernpaket || !canToggleLernpaketRelease || isReleasePending || canEdit}
              title={
                releaseLockTitle ||
                (!canReleaseLernpaket
                  ? 'Lernpaket kann erst freigegeben werden, wenn alle Aktivitäten freigegeben sind.'
                  : 'Lernpaket freigeben')
              }
              className="gap-2"
            >
              {isReleasePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Lernpaket freigeben
            </Button>
          )}

          {isLockedByOther && (
            <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-medium">
              🔒 Gesperrt
            </span>
          )}
          </>
        )}
      </div>
      </div>

      {/* Aktivitäten-Phasen: Im Bearbeitungsmodus inline editierbar,
          sonst read-only Übersicht. */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Aktivitäten</h3>

        {PHASES.map(phase => {
          const phaseConfig = (canEdit ? localPhasenConfig : (paket.phasen_konfiguration || {}))[phase.key] || {};
          const isDisabled = phaseConfig.disabled === true;
          const phaseActivities = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id && a.phase === phase.key);
          const hasReleasedActivity = phaseActivities.some(a => a.content_status === 'approved');
          const isExpanded = expandedPhase === phase.key;

          if (!canEdit && isDisabled) return null;

          const phaseBg = {
            'Input':     'border-green-200 bg-green-50',
            'Übung':     'border-pink-200 bg-pink-50',
            'Abschluss': 'border-blue-200 bg-blue-50',
          }[phase.key] || 'border-border bg-card';

          return (
            <div key={phase.key} className={cn('rounded-lg border-2 overflow-hidden', phaseBg)}>
              {/* Phase-Header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-base">{phase.icon}</span>
                <span className="font-semibold text-sm flex-1">{phase.label}</span>
                <Badge variant="secondary" className="text-xs">{phaseActivities.length}</Badge>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Aktiv</span>
                    <Switch
                      checked={!isDisabled}
                      onCheckedChange={() => handlePhaseToggle(phase.key)}
                      disabled={hasReleasedActivity}
                      title={hasReleasedActivity ? '🔒 Phase enthält freigegebene Aktivitäten' : ''}
                    />
                  </div>
                )}
              </div>

              {/* Phase-Inhalt */}
              {!isDisabled && (
                <div className="px-3 pb-3">
                  {canEdit ? (
                    /* Bearbeitungsmodus: PhaseContent inline */
                    <PhaseContent
                      paket={paket}
                      phaseKey={phase.key}
                      phaseLabel={phase.label}
                      kannBearbeiten={kannBearbeiten}
                      userEmail={userEmail}
                      queryClient={queryClient}
                      inEditMode={true}
                      onNavigate={onNavigate}
                      onGoToTaskWorkshop={(activityId) => {
                        onNavigate({ type: 'goto-task-workshop', activityId });
                      }}
                    />
                  ) : (
                    /* Lesemodus: kompakte Aktivitätenliste */
                    <div className="space-y-1.5 mt-1">
                      {phaseActivities.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">Noch keine Aktivität zugeordnet</p>
                      ) : (
                        [...phaseActivities]
                          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
                          .map(activity => {
                            const katalogEntry = aktivitaetenKatalog.find(a => a.id === activity.aktivitaet_id);
                            const isComplete = activity.is_complete === true;
                            return (
                              <button
                                key={activity.id}
                                onClick={() => onNavigate({ type: 'goto-task-workshop', activityId: activity.id })}
                                className="group w-full flex items-center gap-2 p-2 rounded border border-black/10 bg-white/70 text-xs text-left hover:ring-1 hover:ring-primary/40 hover:shadow-sm transition-all"
                                title="Zur Aufgaben-Werkstatt (Tab 4) springen"
                              >
                                <span className="text-primary font-semibold shrink-0">▸</span>
                                <span className="flex-1 text-foreground">{katalogEntry?.name || 'Unbekannte Aktivität'}</span>
                                {katalogEntry?.name === 'Kompaktwissen' && (
                                  <span
                                    title="Kompaktwissen ist ein festes Standardelement: Es ist automatisch in jedem Lernpaket enthalten und kann nicht entfernt werden."
                                    className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300"
                                  >
                                    <Lock className="w-2.5 h-2.5" />Standardelement
                                  </span>
                                )}
                                {activity.braucht_nacharbeit === true && (
                                  <span
                                    title={activity.nacharbeit_notiz || 'Für Nacharbeit vorgemerkt'}
                                    className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300"
                                  >
                                    <PencilRuler className="w-2.5 h-2.5" />Nacharbeit
                                  </span>
                                )}
                                {isComplete ? (
                                  <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Vollständig</span>
                                ) : (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                    <AlertTriangle className="w-2.5 h-2.5" />Unvollständig
                                  </span>
                                )}
                                <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                              </button>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Speichern-Button: nur im Bearbeitungsmodus sichtbar */}
      {canEdit && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelEditDialog}
            disabled={isSavingDialog}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSaveEditDialog}
            disabled={isSavingDialog}
            className="gap-1.5"
          >
            {isSavingDialog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Speichern & Beenden
          </Button>
        </div>
      )}

      <LernpaketWizardModal
        open={wizardOpen}
        onClose={handleCloseWizard}
        paket={paket}
      />

      <LernpaketPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        paket={paket}
        aktivitaeten={paketAktivitaetenForRelease}
        katalog={aktivitaetenKatalog}
        masters={alleMasters}
        lernziele={paketZiele}
      />

      {/* Bildschirm-Sperre während der Freigabe-Aktion (aus Tab 5 übernommen) */}
      {isReleasePending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-xl bg-card border border-border shadow-lg">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Freigabe wird übernommen…</p>
          </div>
        </div>
      )}
    </div>
  );
}