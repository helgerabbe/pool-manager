import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLernpaketStatus } from '@/lib/statusLogic';
import { cn } from '@/lib/utils';
import { useLernpaketLock } from '@/hooks/useLocks';
import { StatusBadge, kategorieColors } from './SharedUI';
import PhaseContent from './PhaseContent';
import LernpaketWizardModal from '@/components/workspace/lernpaketWizard/LernpaketWizardModal';


import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Lock, Plus, Edit, Trash2, Clock, AlertTriangle, PenLine, Loader2, ChevronRight, Menu, Target, Save, Wand2, ArrowRight, CheckCircle2
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
  const pStatus = getLernpaketStatus(paket, paketZiele, aufgaben, userEmail);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [localTitel, setLocalTitel] = useState(paket.titel_des_pakets || '');
  const [localPhasenConfig, setLocalPhasenConfig] = useState(paket.phasen_konfiguration || {});
  const [isSavingDialog, setIsSavingDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.1). Nur sichtbar, solange
  // der Edit-Dialog offen ist UND der Nutzer den Lock hält.
  const [wizardOpen, setWizardOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: lernpaketAktivitaeten = [] } = useQuery({
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

  const { canEdit, isLockedByOther, lockedByEmail, lockErrorMessage, isLoading: isLockLoading, acquireLock, releaseLock } = useLernpaketLock(paket.id);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);

  // Release-Logik für den kompakten Button in der Aktions-Leiste
  const paketAktivitaetenForRelease = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id);
  const releaseReadiness = useLernpaketReleaseReadiness(paket, paketAktivitaetenForRelease);
  const canToggleRelease = useCanToggleLernpaketRelease(paket, einheit);
  const { data: lockedDashboardMemberships = [] } = useQuery({
    queryKey: ['lernpaket-dashboard-locks', paket.id],
    queryFn: () => base44.entities.LernpfadAufgabeMembership.filter({
      aufgabe_id: paket.id,
      pfad_status: 'locked_for_export',
    }),
    enabled: !!paket?.id,
  });
  const isDashboardLocked = lockedDashboardMemberships.length > 0;
  const canToggleLernpaketRelease = canToggleRelease.allowed && !isDashboardLocked;
  const releaseLockTitle = isDashboardLocked
    ? 'Lernpaket liegt in einem freigegebenen Dashboard — bitte erst das Dashboard entsperren'
    : !canToggleRelease.allowed
      ? 'Einheit ist final freigegeben — Freigabe gesperrt'
      : '';
  const { setReleaseStatus, isPending: isReleasePending } = useSetReleaseStatus();
  const isReleased = paket.content_status === 'approved' && !!paket.released_at;
  // Freigegebenes Lernpaket → Inhalte gesperrt, Bearbeiten/KI-Füllen deaktiviert.
  const releasedLockTitle = '🔒 Lernpaket ist freigegeben – Inhalte können nicht mehr bearbeitet werden.';

  const handleLernpaketRelease = (next) => {
    setReleaseStatus({ targetType: 'lernpaket', targetId: paket.id, release: next });
  };

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
      setEditDialogOpen(true);
    } catch (err) {
      console.error('[LernpaketPanel] acquireLock failed:', err);
      toast.error('Fehler beim Sperren des Lernpakets.');
    } finally {
      // WICHTIG: in ALLEN Pfaden zurücksetzen, sonst bleibt der Button hängen.
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

  // Abbrechen: Drafts verwerfen, Dialog schließen, Lock garantiert freigeben.
  const handleCancelEditDialog = async () => {
    setEditDialogOpen(false);
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
      if (saveSucceeded) {
        setEditDialogOpen(false);
      }
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
    // localPhasenConfig wird NUR beim Öffnen des Dialogs aus paket geseedet
    // (siehe handleOpenEditDialog). Hintergrund-Refetches dürfen die laufende
    // User-Eingabe nicht überschreiben.
    if (!editDialogOpen) {
      setLocalPhasenConfig(paket.phasen_konfiguration || {});
    }
  }, [paket.titel_des_pakets, paket.phasen_konfiguration, editDialogOpen]);

  const PHASES = [
    { key: 'Input', label: 'Input (Erarbeitung)', icon: '📚', defaultDisabled: false },
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
      {kannBearbeiten && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditDialog}
            disabled={isAcquiringLock || canEdit || isLockedByOther || isReleased}
            title={isReleased ? releasedLockTitle : isLockedByOther ? `🔒 Wird gerade von ${paket.locked_by_email} bearbeitet` : ''}
            className="gap-2 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900"
          >
            {isAcquiringLock ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Öffne...
              </>
            ) : (
              <>
                <PenLine className="w-3.5 h-3.5" />
                Bearbeiten
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWizard}
            disabled={isAcquiringLock || canEdit || isLockedByOther || isReleased}
            title={isReleased ? releasedLockTitle : isLockedByOther ? `🔒 Wird gerade von ${paket.locked_by_email} bearbeitet` : 'Lernpaket mit KI-Assistent füllen'}
            className="gap-2 bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:text-blue-900"
          >
            <Wand2 className="w-3.5 h-3.5 text-blue-600" />
            Mit KI füllen
          </Button>

          {/* Freigabe-Button bewusst NICHT mehr hier: Die Freigabe von
              Lernpaketen erfolgt zentral in Tab 5 (Ende der Werkbank-Reihe),
              damit der Freigabe-Workflow an genau einer Stelle lebt. */}

          {isLockedByOther && (
            <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-medium">
              🔒 Gesperrt
            </span>
          )}
        </div>
      )}
      </div>

      {/* Zugeordnete Aktivitäten (informativ, nur lesend).
          Wir zeigen IMMER alle aktiven Phasen als Baum an — auch wenn sie noch
          leer sind. So sieht die Lehrkraft sofort, welche Phasen für dieses
          Lernpaket konfiguriert sind, und welche Phase noch Inhalt braucht.
          Deaktivierte Phasen (phasen_konfiguration[phase].disabled === true)
          werden ausgeblendet, damit der Baum die tatsächliche Konfiguration
          widerspiegelt. */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Aktivitäten</h3>
        {(() => {
          const paketAktivitaeten = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id);
          const phasenConfig = paket.phasen_konfiguration || {};

          // Gruppiere bestehende Aktivitäten nach Phase
          const byPhase = {};
          paketAktivitaeten.forEach(a => {
            if (!byPhase[a.phase]) byPhase[a.phase] = [];
            byPhase[a.phase].push(a);
          });

          const phaseMeta = {
            'Input':     { icon: '📚', bg: 'bg-green-50 border-green-200' },
            'Übung':     { icon: '✏️', bg: 'bg-pink-50 border-pink-200' },
            'Abschluss': { icon: '🎯', bg: 'bg-blue-50 border-blue-200' },
          };

          const activePhases = ['Input', 'Übung', 'Abschluss'].filter(
            phase => (phasenConfig[phase] || {}).disabled !== true
          );

          if (activePhases.length === 0) {
            return (
              <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                Alle Phasen wurden deaktiviert.
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {activePhases.map(phase => {
                const activities = byPhase[phase] || [];
                const meta = phaseMeta[phase];
                return (
                  <div key={phase} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                      <span>{meta.icon}</span>
                      <span>{phase}</span>
                      <span className="text-muted-foreground/60">
                        ({activities.length})
                      </span>
                    </p>
                    {activities.length === 0 ? (
                      <div className="p-2.5 rounded border border-dashed border-border text-xs text-muted-foreground italic">
                        Noch keine Aktivität zugeordnet
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {[...activities]
                          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
                          .map(activity => {
                          const katalogEntry = aktivitaetenKatalog.find(a => a.id === activity.aktivitaet_id);
                          const aktivitaetName = katalogEntry?.name || 'Unbekannte Aktivität';
                          // Vollständig = is_complete; KI-Briefing zählt analog
                          // zur Sidebar-Logik (SidebarTree.jsx) ebenfalls als
                          // fertig zur Übergabe an die MBK.
                          const isKiBriefed =
                            activity.erstellungs_modus === 'ki' &&
                            !!activity.ki_briefing &&
                            typeof activity.ki_briefing === 'object' &&
                            Object.keys(activity.ki_briefing).length > 0;
                          const isComplete = activity.is_complete === true || (isKiBriefed && activity.is_complete === true);
                          return (
                            <button
                              key={activity.id}
                              onClick={() => onNavigate({ type: 'goto-task-workshop', activityId: activity.id })}
                              className={`group w-full flex items-center gap-2 p-2 rounded border text-xs text-left ${meta.bg} hover:ring-1 hover:ring-primary/40 hover:shadow-sm transition-all cursor-pointer`}
                              title="Zur Aufgaben-Werkstatt (Tab 4) springen"
                            >
                              <span className="text-primary font-semibold shrink-0">▸</span>
                              <span className="flex-1 text-foreground">{aktivitaetName}</span>
                              {activity.content_status === 'approved' ? (
                                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                                  <Lock className="w-2.5 h-2.5" />
                                  Freigegeben
                                </span>
                              ) : isComplete ? (
                                <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                  Vollständig
                                </span>
                              ) : (
                                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Unvollständig
                                </span>
                              )}
                              <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) handleCancelEditDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>📦 {paket.titel_des_pakets} bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4 flex-1 overflow-y-auto min-h-0">
            {/* Lernziele werden zentral in Tab 3 ("Lernziele") gepflegt. Hier nur lesender Hinweis. */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Lernziele</h3>
                <span className="text-xs text-muted-foreground">{paketZiele.length} Ziel{paketZiele.length !== 1 ? 'e' : ''}</span>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <Target className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Lernziele werden zentral im Tab <strong>„Lernziele"</strong> angelegt und bearbeitet.</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Lernphasen</h3>
              {PHASES.map(phase => {
                const phaseConfig = localPhasenConfig[phase.key] || {};
                const isDisabled = phaseConfig.disabled === true;
                const isExpanded = expandedPhase === phase.key;
                const phaseActivities = lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id && a.phase === phase.key);
                // Phase darf nicht deaktiviert werden, wenn sie freigegebene
                // Aktivitäten enthält — sonst würde der Toggle die Aktivität
                // (und damit eine freigegebene Inhaltseinheit) unsichtbar
                // schalten.
                const hasReleasedActivity = phaseActivities.some(a => a.content_status === 'approved');

                return (
                  <div key={phase.key} className="space-y-0">
                    <div className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all',
                      isDisabled
                        ? 'opacity-60'
                        : 'hover:bg-muted hover:border-primary/30'
                    )}>
                      <button
                        onClick={() => !isDisabled && setExpandedPhase(isExpanded ? null : phase.key)}
                        disabled={isDisabled}
                        className="flex items-center gap-3 flex-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight
                          className={cn(
                            'w-5 h-5 text-muted-foreground transition-transform shrink-0',
                            isExpanded && 'rotate-90'
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{phase.icon}</span>
                          <p className={cn('font-medium text-sm', isDisabled && 'opacity-60')}>
                            {phase.label}
                          </p>
                        </div>
                        {!isDisabled && phaseActivities.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {phaseActivities.length}
                          </Badge>
                        )}
                      </button>

                      {kannBearbeiten && (
                        <Switch
                          checked={!isDisabled}
                          onCheckedChange={() => handlePhaseToggle(phase.key)}
                          onClick={e => e.stopPropagation()}
                          disabled={hasReleasedActivity}
                          title={hasReleasedActivity ? '🔒 Phase enthält freigegebene Aktivitäten und kann nicht deaktiviert werden.' : ''}
                          className="shrink-0"
                        />
                      )}
                    </div>

                    {isExpanded && !isDisabled && (
                      <div className="mt-2">
                        <PhaseContent
                          paket={paket}
                          phaseKey={phase.key}
                          phaseLabel={phase.label}
                          kannBearbeiten={kannBearbeiten}
                          userEmail={userEmail}
                          queryClient={queryClient}
                          inEditMode={true}
                          onNavigate={(data) => {
                            onNavigate(data);
                          }}
                          onGoToTaskWorkshop={(activityId) => {
                            onNavigate({ type: 'goto-task-workshop', activityId });
                            handleCancelEditDialog();
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
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
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LernpaketWizardModal
        open={wizardOpen}
        onClose={handleCloseWizard}
        paket={paket}
        existingActivityCount={lernpaketAktivitaeten.filter(a => a.lernpaket_id === paket.id).length}
      />
    </div>
  );
}