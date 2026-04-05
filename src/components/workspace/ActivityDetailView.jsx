import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { useCollaborationLock } from '@/hooks/useCollaborationLock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Save, X, FileText, AlertTriangle, Lock, WifiOff, RotateCcw, PenLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ApprovalStatusBadge from '@/components/workspace/ApprovalStatusBadge';
import ApprovalActionButton from '@/components/workspace/ApprovalActionButton';
import UnsavedChangesExitModal from '@/components/workspace/UnsavedChangesExitModal';

export default function ActivityDetailView({ activityRecord, kannBearbeiten, queryClient, einheitFach }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [originalFormData, setOriginalFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [acquiringLock, setAcquiringLock] = useState(false);

  const { permissions } = useRBAC();

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email || null));
  }, []);

  // Collaboration Lock mit Offline-Support
  const { acquireLock, releaseLock, isLocked: lockedByOther, retryCount, isOffline, lockLost } = useCollaborationLock(
    'LernpaketPhaseAktivitaet',
    ['lernpaketPhaseAktivitaeten'],
    activityRecord?.id,
    userEmail,
    editMode
  );

  // Dirty-State: hat der Nutzer etwas geändert?
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData);

  // beforeunload: native Browser-Warnung
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (editMode && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    // unload: Lock via Beacon freigeben
    const handleUnload = () => {
      if (editMode && activityRecord?.id) {
        base44.functions.invoke('releaseLockSecure', {
          entityName: 'LernpaketPhaseAktivitaet',
          entityId: activityRecord.id,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [editMode, isDirty, activityRecord?.id]);

  // Auto-Save zu localStorage bei Änderungen (Offline-Fallback)
  useEffect(() => {
    if (!editMode || !activityRecord?.id || !formData || Object.keys(formData).length === 0) return;

    const draftKey = `draft_activity_${activityRecord.id}`;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        formData,
        timestamp: new Date().toISOString(),
        userEmail
      }));
      setHasDraft(true);
    } catch (e) {
      console.warn('[ActivityDetailView] localStorage write failed:', e);
    }
  }, [formData, editMode, activityRecord?.id, userEmail]);

  // Prüfe ob Draft existiert beim Mount/Edit-Mode Wechsel
  useEffect(() => {
    if (!editMode || !activityRecord?.id) {
      setHasDraft(false);
      return;
    }

    const draftKey = `draft_activity_${activityRecord.id}`;
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        setHasDraft(true);
        // Nur anzeigen, nicht automatisch laden
      }
    } catch (e) {
      console.warn('[ActivityDetailView] localStorage read failed:', e);
    }
  }, [editMode, activityRecord?.id]);

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const catalog = aktivitaetenKatalog?.find(a => a.id === activityRecord?.aktivitaet_id);

  useEffect(() => {
    const values = activityRecord?.field_values || {};
    setFormData(values);
    setOriginalFormData(values);
  }, [activityRecord?.field_values]);

  // Permission check: Admins OR Fachlehrkräfte mit relevanter Berechtigung dürfen bearbeiten
   const kannInhalteBearbeiten = permissions.istAdmin || (einheitFach && permissions.kannInhalteBearbeiten(einheitFach));
   if (!kannInhalteBearbeiten) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <AlertTriangle className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Kein Zugriff</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sie dürfen keine Aktivitäten bearbeiten. Nur Fachlehrkräfte, Fachschaftsleitung und Administratoren haben diese Berechtigung.
          </p>
        </div>
      </div>
    );
   }

  // Bearbeitungsmodus aktivieren (Lock erwerben)
  const handleEnterEditMode = async () => {
    setAcquiringLock(true);
    try {
      const ok = await acquireLock();
      if (ok) {
        setEditMode(true);
        setOriginalFormData({ ...formData });
      } else {
        const lockedBy = activityRecord?.locked_by_user;
        toast.error(
          lockedBy
            ? `Diese Aktivität wird gerade von ${lockedBy} bearbeitet.`
            : 'Diese Aktivität kann gerade nicht gesperrt werden. Bitte versuchen Sie es erneut.'
        );
      }
    } finally {
      setAcquiringLock(false);
    }
  };

  // Zwischenspeichern: Lock bleibt aktiv
  const handleSave = async (andExit = false) => {
    if (lockLost) {
      toast.error('Lock verloren. Bitte Seite neu laden.');
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke('updateActivitySecure', {
        activityId: activityRecord.id,
        fieldValues: formData,
        einheitId: activityRecord.lernpaket_id
          ? (await base44.entities.Lernpakete.filter({ id: activityRecord.lernpaket_id }))[0]?.einheit_id
          : null,
        targetFach: einheitFach,
      });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setOriginalFormData({ ...formData });
      try { localStorage.removeItem(`draft_activity_${activityRecord.id}`); setHasDraft(false); } catch {}
      toast.success('Aktivität gespeichert.');
      if (andExit) await doExitEditMode();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) toast.error('Versionskollision – bitte Seite neu laden.');
      else if (status === 403) toast.error('Zugriff verweigert.');
      else if (status === 429) toast.error('Zu viele Anfragen. Bitte warten.');
      else toast.error('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  const doExitEditMode = async () => {
    await releaseLock();
    setEditMode(false);
    setExitModalOpen(false);
  };

  // Bearbeitungsmodus beenden: mit Dirty-Check
  const handleExitEditMode = () => {
    if (isDirty) {
      setExitModalOpen(true);
    } else {
      doExitEditMode();
    }
  };

  const handleRestoreDraft = () => {
    const draftKey = `draft_activity_${activityRecord.id}`;
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        setFormData(parsed.formData);
        toast.success('Entwurf wiederhergestellt.');
      }
    } catch (e) {
      toast.error('Fehler beim Wiederherstellen des Entwurfs.');
      console.error('[ActivityDetailView] Draft restore failed:', e);
    }
  };

  const handleClearDraft = () => {
    const draftKey = `draft_activity_${activityRecord.id}`;
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      toast.info('Entwurf gelöscht.');
    } catch (e) {
      console.warn('[ActivityDetailView] Draft clear failed:', e);
    }
  };

  if (!activityRecord || !catalog) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Keine Aktivität ausgewählt.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Offline/Connection Warning */}
      {(isOffline || retryCount > 0 || hasDraft) && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 space-y-2">
          {isOffline && (
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <WifiOff className="w-4 h-4" />
              <span>Offline-Modus aktiv. Änderungen werden lokal gespeichert.</span>
            </div>
          )}
          {retryCount > 0 && !isOffline && (
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Verbindung instabil ({retryCount}/3 Versuche). Auto-Speichern verzögert...</span>
            </div>
          )}
          {lockLost && (
            <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 rounded p-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Lock verloren. Formular ist schreibgeschützt.</span>
            </div>
          )}
          {hasDraft && !editMode && (
            <div className="flex items-center justify-between gap-2 text-blue-800 text-sm bg-blue-50 rounded p-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Entwurf vorhanden. Möchten Sie wiederherstellen?</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="text-xs" onClick={handleRestoreDraft}>
                  Wiederherstellen
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearDraft}>
                  Löschen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{catalog.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Phase: {activityRecord.phase}</p>
          {!activityRecord.is_complete && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Inhalt unvollständig
            </div>
          )}
          <div className="mt-2">
            <ApprovalStatusBadge contentStatus={activityRecord.content_status} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-col items-end">
          <div className="flex gap-2 flex-wrap justify-end">
            {!editMode ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnterEditMode}
                disabled={activityRecord.content_status === 'approved' || lockedByOther || lockLost || acquiringLock}
                title={
                  lockLost ? 'Lock verloren. Seite neu laden.'
                  : activityRecord.content_status === 'approved' ? 'Freigabe zuerst aufheben'
                  : lockedByOther ? `Wird bearbeitet von ${activityRecord.locked_by_user}`
                  : undefined
                }
                className="gap-2"
              >
                {acquiringLock
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sperren…</>
                  : lockLost
                    ? <><Lock className="w-3.5 h-3.5 text-red-500" /> Lock verloren</>
                    : lockedByOther
                      ? <><Lock className="w-3.5 h-3.5 text-amber-500" /> Gesperrt</>
                      : <><PenLine className="w-3.5 h-3.5" /> Bearbeitungsmodus aktivieren</>
                }
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving || lockLost || isOffline || !isDirty}
                  className="gap-2"
                  title={lockLost ? 'Lock verloren' : isOffline ? 'Offline' : !isDirty ? 'Keine Änderungen' : ''}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Zwischenspeichern
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExitEditMode}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="w-3.5 h-3.5" /> Bearbeitungsmodus beenden
                </Button>
              </>
            )}
          </div>
          {isDirty && editMode && (
            <span className="text-xs text-amber-600">Ungespeicherte Änderungen</span>
          )}
          <ApprovalActionButton 
            entityId={activityRecord.id} 
            entityType="activity" 
            contentStatus={activityRecord.content_status}
            missingFields={!activityRecord.is_complete ? ['Inhalt der Aktivität unvollständig'] : []}
            kannBearbeiten={true}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-5">
        {/* Aufgabenstellung (immer zuerst) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenstellung</label>
          {editMode ? (
            <Textarea
              value={formData.task_description || ''}
              onChange={e => setFormData({ ...formData, task_description: e.target.value })}
              placeholder="Beschreibe hier, was der Schüler tun soll..."
              className="min-h-20"
            />
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>{formData.task_description || <span className="italic text-muted-foreground">Nicht ausgefüllt</span>}</p>
            </div>
          )}
        </div>

        {/* Schema-basierte Felder rendern */}
        {catalog.form_schema?.map(field => {
          const fieldValue = formData[field.field_name];
          const isRequired = field.required;
          const isEmpty = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0) || (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);

          if (editMode) {
            return (
              <div key={field.field_name} className="space-y-2">
                <label className="text-sm font-medium">
                  {field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <Input
                    value={fieldValue || ''}
                    onChange={e => setFormData({ ...formData, [field.field_name]: e.target.value })}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    value={fieldValue || ''}
                    onChange={e => setFormData({ ...formData, [field.field_name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="min-h-24"
                  />
                )}

                {field.type === 'url' && (
                  <Input
                    type="url"
                    value={fieldValue || ''}
                    onChange={e => setFormData({ ...formData, [field.field_name]: e.target.value })}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'select' && (
                  <Select value={fieldValue || ''} onValueChange={v => setFormData({ ...formData, [field.field_name]: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'number' && (
                  <Input
                    type="number"
                    value={fieldValue || ''}
                    onChange={e => setFormData({ ...formData, [field.field_name]: e.target.value })}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'file' && (
                  <div className="space-y-2">
                    {fieldValue && (
                      <div className="p-2 rounded bg-muted text-sm">
                        <FileText className="w-3.5 h-3.5 inline mr-2" />
                        <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {typeof fieldValue === 'string' ? fieldValue.split('/').pop() : 'Datei'}
                        </a>
                        <button
                          onClick={() => setFormData({ ...formData, [field.field_name]: null })}
                          className="ml-2 text-destructive text-xs hover:underline"
                        >
                          Entfernen
                        </button>
                      </div>
                    )}
                    <Input type="file" onChange={e => {
                      // File upload would be handled here
                    }} />
                  </div>
                )}

                {isEmpty && isRequired && (
                  <p className="text-xs text-amber-600">Dieses Feld ist erforderlich.</p>
                )}
              </div>
            );
          } else {
            // Read-only mode
            return (
              <div key={field.field_name} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</label>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  {field.type === 'url' && fieldValue ? (
                    <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                      {fieldValue}
                    </a>
                  ) : field.type === 'file' && fieldValue ? (
                    <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      {typeof fieldValue === 'string' ? fieldValue.split('/').pop() : 'Datei'}
                    </a>
                  ) : Array.isArray(fieldValue) ? (
                    <div className="space-y-1">
                      {fieldValue.map((item, idx) => (
                        <div key={idx} className="text-xs">{typeof item === 'string' ? item : JSON.stringify(item)}</div>
                      ))}
                    </div>
                  ) : typeof fieldValue === 'object' ? (
                    <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(fieldValue, null, 2)}</pre>
                  ) : (
                    <p>{fieldValue || <span className="italic text-muted-foreground">Nicht ausgefüllt</span>}</p>
                  )}
                </div>
              </div>
            );
          }
        })}

        {(!catalog.form_schema || catalog.form_schema.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Keine Felder für diese Aktivität konfiguriert.</p>
          </div>
        )}
      </div>

      {/* Exit-Modal */}
      <UnsavedChangesExitModal
        open={exitModalOpen}
        onOpenChange={setExitModalOpen}
        onSaveAndExit={() => handleSave(true)}
        onDiscard={doExitEditMode}
        saving={saving}
      />
    </div>
  );
}