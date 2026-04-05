import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLernpaketLock } from '@/hooks/useLernpaketLock';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Save, X, FileText, AlertTriangle, Lock, Unlock, PenLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ApprovalStatusBadge from '@/components/workspace/ApprovalStatusBadge';
import ApprovalActionButton from '@/components/workspace/ApprovalActionButton';
import UnsavedChangesExitModal from '@/components/workspace/UnsavedChangesExitModal';

export default function ActivityDetailView({ activityRecord, kannBearbeiten, queryClient, einheitFach }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  const { permissions } = useRBAC();
  const istAdminOderFachschaft = permissions?.istAdmin;

  // Single Source of Truth: Lock vom übergeordneten Lernpaket
  const { 
    canEdit: canEditFromLock, 
    isLockedByOther, 
    lockedByEmail,
    acquireLock,
    releaseLock 
  } = useLernpaketLock(activityRecord?.lernpaket_id);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email || null));
  }, []);

  // Laden des Aktivitäts-Katalogs
  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const catalog = aktivitaetenKatalog?.find(a => a.id === activityRecord?.aktivitaet_id);

  // Form-Daten initialisieren
  useEffect(() => {
    const values = activityRecord?.field_values || {};
    setFormData(values);
    setIsDirty(false);
  }, [activityRecord?.field_values]);

  // Permission: darf dieser User überhaupt bearbeiten?
  const kannInhalteBearbeiten = permissions?.istAdmin || kannBearbeiten;

  // Bearbeitungsmodus aktivieren
  const handleEnterEditMode = async () => {
    if (!canEditFromLock) {
      const ok = await acquireLock();
      if (!ok) {
        toast.error(`Aktivität ist bereits gesperrt von ${lockedByEmail}`);
        return;
      }
    }
    setEditMode(true);
  };

  // Speichern
  const handleSave = async (andExit = false) => {
    setSaving(true);
    try {
      await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
        field_values: formData,
      });

      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setIsDirty(false);
      toast.success('Aktivität gespeichert.');

      if (andExit) {
        await releaseLock();
        setEditMode(false);
      }
    } catch (err) {
      console.error('[ActivityDetailView] Save error:', err);
      toast.error('Fehler beim Speichern: ' + (err?.message || 'Unbekannter Fehler'));
    } finally {
      setSaving(false);
    }
  };

  // Bearbeitungsmodus beenden
  const handleExitEditMode = async () => {
    if (isDirty) {
      setExitModalOpen(true);
    } else {
      // Fall A: Keine Änderungen → direkt Lock freigeben
      await releaseLock();
      setEditMode(false);
    }
  };

  // Modal: Verwerfen (Datensatz neu laden + Lock freigeben)
  const handleDiscardChanges = async () => {
    setFormData(activityRecord?.field_values || {});
    setIsDirty(false);
    await releaseLock();
    setEditMode(false);
    setExitModalOpen(false);
  };

  // Admin Force-Unlock
  const handleForceUnlock = async () => {
    try {
      await base44.functions.invoke('forceReleaseLockAdmin', {
        lernpaketId: activityRecord?.lernpaket_id,
      });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      toast.success('Lock wurde aufgehoben.');
    } catch (err) {
      toast.error('Lock konnte nicht aufgehoben werden.');
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between gap-3 p-4 border-b">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{catalog.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Phase: {activityRecord.phase}</p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {editMode && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium">
                <PenLine className="w-3 h-3" />
                In Bearbeitung
              </div>
            )}
            {!activityRecord.is_complete && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Inhalt unvollständig
              </div>
            )}
            <ApprovalStatusBadge contentStatus={activityRecord.content_status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0 flex-col items-end">
          <div className="flex gap-2 flex-wrap justify-end">
            {/* Admin Force-Unlock */}
            {isLockedByOther && istAdminOderFachschaft && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceUnlock}
                className="gap-2 border-amber-400 text-amber-800 hover:bg-amber-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                Sperre aufheben
              </Button>
            )}

            {!editMode ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnterEditMode}
                disabled={isLockedByOther || !kannInhalteBearbeiten}
                className="gap-2"
              >
                <PenLine className="w-3.5 h-3.5" />
                Bearbeitungsmodus aktivieren
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleSave(false)}
                  disabled={saving || !isDirty}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Speichern
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExitEditMode}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Beenden
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
            kannBearbeiten={kannInhalteBearbeiten}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Aufgabenstellung */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenstellung</label>
          {editMode ? (
            <Textarea
              value={formData.task_description || ''}
              onChange={e => {
                setFormData({ ...formData, task_description: e.target.value });
                setIsDirty(true);
              }}
              placeholder="Beschreibe hier, was der Schüler tun soll..."
              className="min-h-20"
            />
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>{formData.task_description || <span className="italic text-muted-foreground">Nicht ausgefüllt</span>}</p>
            </div>
          )}
        </div>

        {/* Schema-basierte Felder */}
        {catalog.form_schema?.map(field => {
          const fieldValue = formData[field.field_name];
          const isRequired = field.required;
          const isEmpty = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);

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
                    onChange={e => {
                      setFormData({ ...formData, [field.field_name]: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    value={fieldValue || ''}
                    onChange={e => {
                      setFormData({ ...formData, [field.field_name]: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder={field.placeholder}
                    className="min-h-24"
                  />
                )}

                {field.type === 'url' && (
                  <Input
                    type="url"
                    value={fieldValue || ''}
                    onChange={e => {
                      setFormData({ ...formData, [field.field_name]: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'select' && (
                  <Select value={fieldValue || ''} onValueChange={v => {
                    setFormData({ ...formData, [field.field_name]: v });
                    setIsDirty(true);
                  }}>
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

                {isEmpty && isRequired && (
                  <p className="text-xs text-amber-600">Dieses Feld ist erforderlich.</p>
                )}
              </div>
            );
          } else {
            // Read-only
            return (
              <div key={field.field_name} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</label>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  {field.type === 'url' && fieldValue ? (
                    <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                      {fieldValue}
                    </a>
                  ) : (
                    <p>{fieldValue || <span className="italic text-muted-foreground">Nicht ausgefüllt</span>}</p>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Exit Modal */}
      <UnsavedChangesExitModal
        open={exitModalOpen}
        onOpenChange={setExitModalOpen}
        onSaveAndExit={() => handleSave(true)}
        onDiscard={handleDiscardChanges}
        saving={saving}
      />
    </div>
  );
}