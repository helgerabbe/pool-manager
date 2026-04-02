import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Save, X, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ActivityDetailView({ activityRecord, kannBearbeiten, queryClient }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const catalog = aktivitaetenKatalog?.find(a => a.id === activityRecord?.aktivitaet_id);

  useEffect(() => {
    setFormData(activityRecord?.field_values || {});
  }, [activityRecord?.field_values]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
        field_values: formData,
        is_complete: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['lernpaketPhaseAktivitaeten'],
      });
      setEditMode(false);
      toast.success('Aktivität gespeichert.');
    } catch (err) {
      toast.error('Fehler beim Speichern.');
    } finally {
      setSaving(false);
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
      <div className="shrink-0 flex items-start justify-between gap-3 p-4 border-b">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{catalog.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Phase: {activityRecord.phase}</p>
          {!activityRecord.is_complete && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Inhalt unvollständig
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!editMode ? (
            <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-2">
              <Edit className="w-3.5 h-3.5" />
              Bearbeiten
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} disabled={saving}>
                <X className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
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
    </div>
  );
}