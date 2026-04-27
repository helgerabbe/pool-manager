/**
 * ActivityMasterPanel.jsx
 *
 * Hauptbereich für eine ausgewählte Aktivität in Tab 4.
 * Zeigt:
 *   1. Basisangaben der Aktivität (ActivityDetailView)
 *   2. Sektor "Masteraufgaben-Vorlagen" mit n Karten + "Neue Masteraufgabe"-Button
 *      (nur wenn supports_master === true)
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLernpaketLock } from '@/hooks/useLocks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Plus, Loader2, ChevronRight, Save, Pencil, Check, ExternalLink } from 'lucide-react';
import MasterAufgabeCard from '@/components/workspace/MasterAufgabeCard';
import StandardInput from '@/components/workspace/inputs/StandardInput';
import KITutorMasterForm from '@/components/workspace/KITutorMasterForm';
import TextLesenModal from '@/components/workspace/TextLesenModal';
import OffeneAufgabeModal from '@/components/workspace/OffeneAufgabeModal';
import MoodleSyncStatusBadge from '@/components/workspace/MoodleSyncStatusBadge';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import { toast } from 'sonner';

// Inline-editierbares Aufgabentext-Feld mit Standardtext
function DefaultTextareaFieldInline({ field, value, onChange, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const defaultText = field.default_text || 'Bearbeite die folgende Aufgabe sorgfältig.';
  const displayValue = value || defaultText;
  const isDefault = !value;

  if (!editing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{field.label}</Label>
          {!readOnly && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Pencil className="w-3 h-3" />
              {isDefault ? 'Anpassen' : 'Bearbeiten'}
            </button>
          )}
        </div>
        <div
          className={`rounded-lg border px-3 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors ${
            isDefault ? 'bg-blue-50 border-blue-200 text-blue-800 italic' : 'bg-muted/40 border-border text-foreground'
          }`}
          onClick={() => setEditing(true)}
        >
          {isDefault && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 block mb-0.5 not-italic">
              Standardtext
            </span>
          )}
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{field.label}</Label>
        <div className="flex items-center gap-3">
          {!isDefault && (
            <button
              onClick={() => { onChange(''); setEditing(false); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Standardtext wiederherstellen
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Check className="w-3 h-3" />
            Fertig
          </button>
        </div>
      </div>
      <textarea
        value={value || field.default_text}
        onChange={(e) => {
          const newVal = e.target.value;
          onChange(newVal === field.default_text ? '' : newVal);
        }}
        rows={4}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm"
        autoFocus
      />
    </div>
  );
}

export default function ActivityMasterPanel({
  activityRecord,
  catalogEntry,
  supportsMaster,
  kannBearbeiten,
  userEmail,
  userRole,
  einheitId,
  parentLernpaketName = null,
  onMasterSelected = null,
  onKlonSelected = null,
  selectedMasterId = null,
  onEditModeChange = null,
  globalEditActive = false,
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [focusedMasterId, setFocusedMasterId] = useState(selectedMasterId);
  // Implizites Locking für "Neue Master-Aufgabe"
  const { acquireLock, releaseLock } = useLernpaketLock(activityRecord?.lernpaket_id);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  // Wenn selectedMasterId von außen übergeben wird, setze focusedMasterId
  useEffect(() => {
    if (selectedMasterId) {
      setFocusedMasterId(selectedMasterId);
    }
  }, [selectedMasterId]);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUserEmail(u?.email || null));
  }, []);

  // Lock-Status direkt aus DB auslesen (Single Source of Truth)
  // refetchInterval: 5000ms (5 Sek) um sofortige UI-Aktualisierung nach Moodle-Sync zu ermöglichen
  const { data: lernpaket } = useQuery({
    queryKey: ['lernpakete', activityRecord?.lernpaket_id],
    queryFn: () => base44.entities.Lernpakete.filter({ id: activityRecord.lernpaket_id }),
    select: (data) => data[0],
    enabled: !!activityRecord?.lernpaket_id,
    refetchInterval: 5000,
  });

  const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
  const lernpaketLockActive =
    lernpaket?.is_locked &&
    lernpaket?.locked_by_email === currentUserEmail &&
    lernpaket?.locked_at &&
    Date.now() - new Date(lernpaket.locked_at).getTime() < LOCK_TIMEOUT_MS;

  const isInEditMode = kannBearbeiten && lernpaketLockActive;

  // Formular-State für Aktivitäten ohne supports_master
  const [fieldValues, setFieldValues] = useState(activityRecord?.field_values || {});
  const [isDirty, setIsDirty] = useState(false);
  // Modal-State für "Text lesen" und ähnliche Aktivitäten
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [acquiringLock, setAcquiringLock] = useState(false);

  // field_values neu laden NUR wenn sich die Aktivität selbst wechselt (ID-Wechsel)
  // NICHT bei field_values-Änderung – das würde Hintergrund-Refetches die lokale Eingabe überschreiben
  useEffect(() => {
    if (activityRecord?.field_values) {
      setFieldValues(JSON.parse(JSON.stringify(activityRecord.field_values)));
    } else {
      setFieldValues({});
    }
    setIsDirty(false);
  }, [activityRecord?.id]);

  const saveFieldsMutation = useMutation({
    mutationFn: (values) => {
      const formSchema = catalogEntry?.form_schema || [];
      // content_status aus values extrahieren (nicht in field_values speichern)
      const { content_status, moodle_sync_status, is_dirty_since_export, ...rest } = values;
      const enrichedValues = { ...rest };
      
      formSchema.forEach(f => {
        if (f.field_name === 'aufgabentext' && f.default_text && !enrichedValues[f.field_name]) {
          enrichedValues[f.field_name] = f.default_text;
        }
      });
      const requiredFilled = formSchema
        .filter(f => f.required && f.field_name !== 'aufgabentext')
        .every(f => enrichedValues[f.field_name]?.toString().trim());
      
      const updatePayload = {
        field_values: enrichedValues,
        is_complete: requiredFilled,
        ...(content_status ? { content_status } : {}),
        ...(moodle_sync_status ? { moodle_sync_status } : {}),
        ...(is_dirty_since_export !== undefined ? { is_dirty_since_export } : {}),
      };
      
      return base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, updatePayload);
    },
    onSuccess: () => {
      // Invalidiere BEIDE Queries: Aktivitäten + Sidebar-Status
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] }); // Sidebar-Refresh
      setIsDirty(false);
      toast.success('Gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);
  };

  // Modal-Workflow: Lock erwerben → Modal öffnen
  // HARD-LOCK: Prüfe Export-Sperre vor Modal-Öffnung
  const handleOpenEditModal = async () => {
    // Check 1: Ist das Lernpaket von anderem User gesperrt?
    if (isParentPaketLockedByOther) {
      toast.error(`🔒 Dieses Lernpaket wird gerade von ${lernpaket?.locked_by_email} bearbeitet. Sie können erst Änderungen vornehmen, wenn die Bearbeitung abgeschlossen ist.`);
      return;
    }

    // Check 2: Ist die Einheit zur Moodle-Synchronisation gesperrt?
    if (lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked) {
      toast.error('Einheit ist zur Moodle-Synchronisation gesperrt. Bitte später erneut versuchen.');
      return;
    }

    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) {
      const msg = lernpaket?.locked_by_email
        ? `🔒 Dieses Lernpaket wird gerade von ${lernpaket.locked_by_email} bearbeitet.`
        : 'Bearbeitungsmodus konnte nicht gestartet werden. Bitte laden Sie die Seite neu.';
      toast.error(msg);
      return;
    }
    // Übergebe releaseLock als zweites Argument damit TaskCreationView den Lock freigeben kann
    onEditModeChange?.(true, releaseLock);
    setEditModalOpen(true);
  };

  // Modal abbrechen: Lock freigeben, Modal schließen
  // Abbrechen bleibt immer enabled, da keine Daten verändert werden
  const handleModalCancel = async () => {
    setEditModalOpen(false);
    await releaseLock();
    onEditModeChange?.(false, null);
  };

  // Reset: Setzt alle Eingaben dieser Aktivität zurück.
  // Die LernpaketPhaseAktivitaet selbst bleibt erhalten (in der Phase),
  // nur field_values werden geleert und der Status auf "draft" gesetzt.
  const handleModalReset = async () => {
    await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
      field_values: {},
      is_complete: false,
      content_status: 'draft',
      ...(activityRecord?.moodle_sync_status === 'synced'
        ? { moodle_sync_status: 'modified', is_dirty_since_export: true }
        : {}),
    });
    setFieldValues({});
    setEditModalOpen(false);
    setIsRefreshingAfterSave(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    } finally {
      setIsRefreshingAfterSave(false);
      await releaseLock();
      onEditModeChange?.(false, null);
      toast.success('Aktivitäts-Inhalte zurückgesetzt.');
    }
  };

  // Loading-State während des Refetchs nach dem Speichern
  const [isRefreshingAfterSave, setIsRefreshingAfterSave] = useState(false);

  // Modal speichern: Daten persistieren, Lock freigeben, Modal schließen
  // AUTO-RESET: Wenn bereits exportiert, markiere als needs_reexport
  // Nach dem Speichern: aktiv auf neue Server-Daten warten, damit die
  // Inhaltsansicht sofort die aktuellste Version zeigt.
  const handleModalSave = async (values) => {
    // Wenn Aktivität bereits exportiert ist (synced) und jetzt geändert wird,
    // setze moodle_sync_status auf 'modified' für Re-Export-Anforderung
    let enrichedValues = { ...values };
    if (activityRecord?.moodle_sync_status === 'synced') {
      enrichedValues.moodle_sync_status = 'modified';
      enrichedValues.is_dirty_since_export = true;
    }

    await saveFieldsMutation.mutateAsync(enrichedValues);

    // Modal sofort schließen, dann aktiv auf frische Server-Daten warten.
    const { content_status, ...fieldOnly } = enrichedValues;
    setFieldValues(fieldOnly);
    setEditModalOpen(false);
    setIsRefreshingAfterSave(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    } finally {
      setIsRefreshingAfterSave(false);
      await releaseLock();
      onEditModeChange?.(false, null);
    }
  };

  // Alle MasterAufgaben für diese Aktivität
  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', activityRecord.id],
    queryFn: () => base44.entities.MasterAufgabe.filter({ activity_id: activityRecord.id }),
    select: (data) => data.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
  });

  // Alle Klone für diese Aktivität (gruppiert nach master_aufgabe_id)
  const { data: alleKlone = [] } = useQuery({
    queryKey: ['klone', activityRecord.id],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
  });

  const kloneByMasterId = alleKlone
    .filter(k => masterAufgaben.some(m => m.id === k.master_aufgabe_id))
    .reduce((acc, k) => {
      if (!acc[k.master_aufgabe_id]) acc[k.master_aufgabe_id] = [];
      acc[k.master_aufgabe_id].push(k);
      return acc;
    }, {});

  const handleAddMaster = async () => {
    setCreating(true);
    // Lock erwerben bevor Karte erstellt wird
    const lockOk = await acquireLock();
    if (!lockOk) {
      setCreating(false);
      const msg = lernpaket?.locked_by_email
        ? `🔒 Dieses Lernpaket wird gerade von ${lernpaket.locked_by_email} bearbeitet.`
        : 'Bearbeitungsmodus konnte nicht gestartet werden. Bitte laden Sie die Seite neu.';
      toast.error(msg);
      return;
    }
    onEditModeChange?.(true);
    try {
      const neu = await base44.entities.MasterAufgabe.create({
        activity_id: activityRecord.id,
        lernpaket_id: activityRecord.lernpaket_id,
        reihenfolge: masterAufgaben.length + 1,
      });
      await queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] }); // Invalidiert alle masterAufgaben-Queries (inkl. Sidebar)
      setFocusedMasterId(neu.id); // direkt zur neuen Karte scrollen/fokussieren
      toast.success('Neue Masteraufgabe erstellt.');
    } finally {
      // Lock wieder freigeben – MasterAufgabeCard übernimmt beim Bearbeiten ihren eigenen Lock
      await releaseLock();
      onEditModeChange?.(false);
      setCreating(false);
    }
  };

  // Prüfe ob das Parent-Lernpaket von anderem User gesperrt ist
  const isParentPaketLockedByOther = lernpaket?.is_locked && lernpaket?.locked_by_email !== currentUserEmail;

  // Single Source of Truth: DB-Aggregat `is_complete` (vom
  // lernpaketAggregateGuardian aktiv berechnet). Damit zeigen Inhaltsbereich
  // und Sidebar denselben Wert.
  const effectivelyComplete = activityRecord.is_complete === true;

  // Aufgabentext-State (für supports_master Block)
  const [aufgabentext, setAufgabentext] = useState(activityRecord?.field_values?.aufgabentext || '');
  const [aufgabentextDirty, setAufgabentextDirty] = useState(false);

  useEffect(() => {
    setAufgabentext(activityRecord?.field_values?.aufgabentext || '');
    setAufgabentextDirty(false);
  }, [activityRecord?.id]);

  const AUFGABENTEXT_DEFAULTS = {
    'Lückentext': 'Fülle die Lücken mit den passenden Wörtern aus der Wortbank aus.',
    'Begriffe zuordnen': 'Ordne die Begriffe den richtigen Kategorien zu.',
    'Reihenfolge / Sortierung': 'Bringe die Elemente in die richtige Reihenfolge.',
    'Kurzantwort': 'Beantworte die Frage mit einem kurzen Satz oder Stichwort.',
    'KI-Tutor Aufgabe': 'Bearbeite die folgende Aufgabe und erkläre deinen Lösungsweg.',
    'Bildbeschreibung': 'Beschreibe das Bild möglichst genau mit eigenen Worten.',
    'Quiz': 'Beantworte die Quiz-Fragen so vollständig wie möglich.',
    'Begriffe zuordnen': 'Ordne jeden Begriff der richtigen Erklärung zu.',
    'Offene Aufgabe': 'Bearbeite die folgende Aufgabe detailliert und vollständig.',
  };

  const defaultAufgabentext = AUFGABENTEXT_DEFAULTS[catalogEntry?.name] || 'Bearbeite die folgende Aufgabe sorgfältig.';

  const saveAufgabentextMutation = useMutation({
    mutationFn: (text) => {
      const newFieldValues = { ...(activityRecord?.field_values || {}), aufgabentext: text || defaultAufgabentext };
      return base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
        field_values: newFieldValues,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setAufgabentextDirty(false);
      toast.success('Aufgabentext gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  // Bestimme ob aktueller Aktivitätstyp KI-Tutor ist
  const isKITutor = catalogEntry?.name?.toLowerCase().includes('ki-tutor');

  return (
    <div className="space-y-6 overflow-visible h-auto">
      {/* ── Aktivitäts-Header (Tab 4: nur Info, KEIN Lock-Toggle-Button) ──────── */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-0.5 truncate">
              {parentLernpaketName}
            </p>
          )}
          <h2 className="text-base font-semibold truncate">{catalogEntry?.name || 'Aktivität'}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Phase: {activityRecord?.phase}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MoodleSyncStatusBadge
            status={activityRecord?.moodle_sync_status || 'new'}
            lastSyncedAt={activityRecord?.last_synced_at}
            isDirtySinceExport={activityRecord?.is_dirty_since_export}
            exportLocked={lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked}
          />
          {effectivelyComplete
            ? <span className="text-xs font-medium text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">✓ Vollständig</span>
            : <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">Noch unvollständig</span>
          }
        </div>
      </div>

      {/* ── Read-Only-Ansicht für Aktivitäten ohne Masteraufgaben (z.B. "Text lesen") ── */}
      {!supportsMaster && (() => {
        const schema = catalogEntry?.form_schema || [];
        const inhaltTyp = fieldValues?.inhalt_typ;
        const isImageLabeling = catalogEntry?.name?.toLowerCase().includes('bildbeschriftung');

        const renderValue = (field) => {
          const val = fieldValues[field.field_name];
          if (!val) return <span className="italic text-muted-foreground/60">Noch nicht ausgefüllt.</span>;
          if (field.type === 'select' && field.options?.length) {
            const opt = field.options.find(o => o.value === val);
            return <span>{opt?.label || val}</span>;
          }
          if (field.type === 'url') {
            return <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{val}</a>;
          }
          if (['file', 'image', 'audio'].includes(field.type)) {
            return <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs break-all">{val}</a>;
          }
          return <p className="whitespace-pre-wrap leading-relaxed">{val}</p>;
        };

        return (
          <>
            {kannBearbeiten && (
              <div className="flex justify-end">
                <Button
                  onClick={handleOpenEditModal}
                  disabled={acquiringLock || isParentPaketLockedByOther || lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked || globalEditActive}
                  title={isParentPaketLockedByOther ? `🔒 Lernpaket wird gerade von ${lernpaket?.locked_by_email} bearbeitet` : globalEditActive ? '🔒 Lernpaket wird gerade bearbeitet – bitte warten bis diese abgeschlossen ist.' : lernpaket?.moodle_sync_status === 'locked' ? 'Einheit ist zur Moodle-Synchronisation gesperrt' : ''}
                  className="gap-2"
                >
                    {acquiringLock
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sperren…</>
                      : <><Pencil className="w-4 h-4" /> Inhalt bearbeiten</>}
                  </Button>
                </div>
              )}

            {/* Spezielle Vorschau für Bildbeschriftung */}
            {isImageLabeling ? (
              <div className="rounded-xl border border-border bg-card p-5 relative">
                <ImageLabelingEditor
                  initialData={fieldValues}
                  readOnly={true}
                />
                {isRefreshingAfterSave && (
                  <div className="absolute inset-0 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card border border-border shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">Aktivität wird in der DB aktualisiert…</span>
                    </div>
                  </div>
                )}
              </div>
            ) : catalogEntry?.name?.toLowerCase().includes('offene') ? (
              <>
                {/* Read-Only Preview für Offene Aufgabe */}
                {!editModalOpen && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aufgabenbeschreibung</p>
                      <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed border border-border">
                        {fieldValues.description || <span className="text-muted-foreground italic">Noch keine Beschreibung vorhanden.</span>}
                      </div>
                    </div>
                  </div>
                )}
                {/* Offene Aufgabe Modal */}
                <OffeneAufgabeModal
                  open={editModalOpen}
                  onOpenChange={(isOpen) => { if (!isOpen) handleModalCancel(); }}
                  initialData={fieldValues}
                  isSaving={saveFieldsMutation.isPending}
                  onSave={handleModalSave}
                  onCancel={handleModalCancel}
                  onReset={handleModalReset}
                  exportLocked={lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked}
                />
              </>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                {schema.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Keine Felder konfiguriert.</p>
                )}
                {schema.find(f => f.field_name === 'aufgabentext') && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenstellung</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
                      {fieldValues.aufgabentext
                        ? <p className="whitespace-pre-wrap leading-relaxed">{fieldValues.aufgabentext}</p>
                        : <span className="italic text-blue-600/60">Noch nicht ausgefüllt.</span>}
                    </div>
                  </div>
                )}
                {schema.map(field => {
                  if (field.field_name === 'aufgabentext') return null;
                  if (field.type === 'info') return null;
                  if (field.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return null;
                  if (field.field_name === 'dokument_url' && inhaltTyp !== 'datei') return null;
                  return (
                    <div key={field.field_name} className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
                      <div className="text-sm text-foreground">{renderValue(field)}</div>
                    </div>
                  );
                })}
              </div>
            )}

              <TextLesenModal
              open={editModalOpen && !catalogEntry?.name?.toLowerCase().includes('offene')}
              onOpenChange={(isOpen) => { if (!isOpen) handleModalCancel(); }}
              catalogEntry={catalogEntry}
              initialFieldValues={{ ...fieldValues, content_status: activityRecord?.content_status, moodle_sync_status: activityRecord?.moodle_sync_status }}
              onSave={handleModalSave}
              onCancel={handleModalCancel}
              onReset={handleModalReset}
              isSaving={saveFieldsMutation.isPending}
              exportLocked={lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked}
            />
          </>
        );
      })()}

      {/* ── Edit-Mode Banner entfernt — wird global in TaskCreationView gerendert ── */}

      {/* ── Aufgabentext-Block (für supports_master Aktivitäten, NOT für KI-Tutor) ─ */}
      {supportsMaster && !isKITutor && (
        <div className="rounded-xl border border-border bg-card p-4">
          {/* Aufgabenstellung-Header mit dezent-Stift-Icon statt großem Button */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Aufgabenstellung
            </p>
            {kannBearbeiten && !isInEditMode && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleOpenEditModal}
                  disabled={acquiringLock || isParentPaketLockedByOther || lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked || globalEditActive}
                  className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isParentPaketLockedByOther ? `🔒 Lernpaket wird von ${lernpaket?.locked_by_email} bearbeitet` : globalEditActive ? 'Tab 4 ist in Bearbeitung – bitte warten bis diese abgeschlossen ist.' : 'Aufgabenstellung bearbeiten'}
                >
                  {acquiringLock
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Pencil className="w-3.5 h-3.5" />}
                </Button>
              )}
          </div>
          <DefaultTextareaFieldInline
            field={{
              field_name: 'aufgabentext',
              label: '',
              default_text: defaultAufgabentext,
            }}
            value={aufgabentext}
            onChange={(val) => {
              setAufgabentext(val);
              setAufgabentextDirty(true);
            }}
            readOnly={!isInEditMode}
          />
          {aufgabentextDirty && isInEditMode && (
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                onClick={() => saveAufgabentextMutation.mutate(aufgabentext)}
                disabled={saveAufgabentextMutation.isPending}
                className="gap-1.5 text-xs h-7"
              >
                {saveAufgabentextMutation.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichern…</>
                  : <><Save className="w-3.5 h-3.5" /> Speichern</>}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Masteraufgaben-Bereich (immer sichtbar wenn supports_master) ───────── */}
      {supportsMaster && (
        <div className="space-y-4">

          {/* Sektion-Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-primary" />
                Aufgaben
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Erstelle Vorlagen – die KI generiert daraus automatisch Aufgabenvarianten.
              </p>
            </div>
            {masterAufgaben.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                {masterAufgaben.length} Masteraufgabe{masterAufgaben.length !== 1 ? 'n' : ''}
              </span>
            )}
          </div>

          {/* Vorhandene Master-Karten */}
          {masterAufgaben.map((master, idx) => 
            isKITutor ? (
              // KI-Tutor-Spezialansicht
              <div key={master.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Aufgabe {idx + 1}</h3>
                    {master.content_status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 border border-green-300 rounded-full px-2 py-0.5 mt-1">
                        ✓ Freigegeben
                      </span>
                    )}
                  </div>
                  {kannBearbeiten && !isParentPaketLockedByOther && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm('Diese KI-Tutor-Aufgabe wird gelöscht.')) {
                          try {
                            await base44.entities.MasterAufgabe.delete(master.id);
                            queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] }); // Global refresh für Sidebar
                            toast.success('Aufgabe gelöscht.');
                          } catch (err) {
                            toast.error(err.message || 'Fehler beim Löschen.');
                          }
                        }
                      }}
                      className="text-xs h-7"
                    >
                      Löschen
                    </Button>
                    )}
                </div>
                <KITutorMasterForm
                  master={master}
                  isInEditMode={isInEditMode}
                  userEmail={userEmail}
                  einheitId={einheitId}
                  catalogEntry={catalogEntry}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] })}
                />
              </div>
            ) : (
              // Standard-Masteraufgaben für andere Typen
              <MasterAufgabeCard
                key={master.id}
                master={master}
                index={idx + 1}
                catalogName={catalogEntry?.name || ''}
                klone={kloneByMasterId[master.id] || []}
                kannBearbeiten={isInEditMode && !isParentPaketLockedByOther}
                userEmail={userEmail}
                userRole={userRole}
                autoExpand={master.id === focusedMasterId}
                onDeleted={() => {
                  setFocusedMasterId(null);
                  queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] }); // Global refresh für Sidebar
                }}
                onKlonesCreated={() => queryClient.invalidateQueries({ queryKey: ['klone', activityRecord.id] })}
                onKlonSelected={(klonId) => {
                  onKlonSelected?.(klonId);
                }}
                onEditModeChange={onEditModeChange}
              />
            )
          )}

          {/* Leerzustand */}
          {masterAufgaben.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-sm">Noch keine Aufgaben</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Erstelle jetzt die erste Masteraufgabe als Vorlage für KI-generierte Varianten.
                </p>
              </div>
              <Button onClick={handleAddMaster} disabled={creating || isParentPaketLockedByOther} title={isParentPaketLockedByOther ? `🔒 Lernpaket wird gerade von ${lernpaket?.locked_by_email} bearbeitet` : ''} className="gap-2">
                {creating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sperren & Erstellen…</>
                  : <><Plus className="w-4 h-4" /> Erste Aufgabe erstellen</>}
              </Button>
            </div>
          )}

          {/* Weitere Masteraufgabe hinzufügen */}
          {masterAufgaben.length > 0 && (
            <Button
              variant="default"
              onClick={handleAddMaster}
              disabled={creating || isParentPaketLockedByOther}
              title={isParentPaketLockedByOther ? `🔒 Lernpaket wird gerade von ${lernpaket?.locked_by_email} bearbeitet` : ''}
              className="w-full gap-2"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sperren & Erstellen…</>
                : <><Plus className="w-4 h-4" /> Weitere Aufgabe hinzufügen</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}