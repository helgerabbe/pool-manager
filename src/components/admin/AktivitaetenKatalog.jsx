import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit2, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AktivitaetThumbnailUpload from './AktivitaetThumbnailUpload';

const PHASEN = [
  { value: 'Input', label: 'Input (Erarbeitung)', color: 'bg-blue-100 text-blue-700', backendValue: 'Input' },
  { value: 'Übung', label: 'Übung', color: 'bg-green-100 text-green-700', backendValue: 'Übung' },
  { value: 'Abschluss', label: 'Abschluss', color: 'bg-purple-100 text-purple-700', backendValue: 'Abschluss' },
];

export default function AktivitaetenKatalog() {
  const queryClient = useQueryClient();
  const [selectedPhase, setSelectedPhase] = useState('Input');
  const [editDialog, setEditDialog] = useState({ open: false, aktivitaet: null });
  const [formSchemaText, setFormSchemaText] = useState('');
  const [formSchemaError, setFormSchemaError] = useState('');

  // ── Query ──
  const { data: aktivitaeten = [], isLoading } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  // ── Seed Mutation ──
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('seedAktivitaetenKatalog', {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      toast.success(`${data.count || 0} Standard-Aktivitäten geladen`);
    },
    onError: (err) => {
      toast.error('Seed fehlgeschlagen: ' + err.message);
    },
  });

  // ── Reset Mutation (komplett neu mit 16 Aktivitäten) ──
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('resetAktivitaetenKatalog', {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      toast.success(`✅ Katalog zurückgesetzt! ${data.createdCount} neue Aktivitäten geladen.`);
    },
    onError: (err) => {
      toast.error('Reset fehlgeschlagen: ' + err.message);
    },
  });

  // ── Mutations ──
  const updateToggle = useMutation({
    mutationFn: ({ id, isActive }) =>
      base44.entities.AktivitaetenKatalog.update(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      toast.success('Aktivität aktualisiert');
    },
  });

  const updateSupportsMaster = useMutation({
    mutationFn: ({ id, supportsMaster }) =>
      base44.entities.AktivitaetenKatalog.update(id, { supports_master: supportsMaster }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      toast.success('Master-Aufgaben-Einstellung aktualisiert');
    },
  });

  const updateFormSchema = useMutation({
    mutationFn: ({ id, formSchema }) =>
      base44.entities.AktivitaetenKatalog.update(id, { form_schema: formSchema }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      setEditDialog({ open: false, aktivitaet: null });
      toast.success('Form-Schema aktualisiert');
    },
  });

  const updateThumbnail = useMutation({
    mutationFn: ({ id, thumbnailUrl }) =>
      base44.entities.AktivitaetenKatalog.update(id, { thumbnail_url: thumbnailUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      toast.success('Thumbnail aktualisiert');
    },
  });

  const deleteAktivitaet = useMutation({
    mutationFn: (id) => base44.entities.AktivitaetenKatalog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aktivitaetenKatalog'] });
      toast.success('Aktivität gelöscht');
    },
  });

  // ── Handlers ──
  const handleEditClick = (aktivitaet) => {
    setFormSchemaText(JSON.stringify(aktivitaet.form_schema || [], null, 2));
    setFormSchemaError('');
    setEditDialog({ open: true, aktivitaet });
  };

  const handleSaveSchema = () => {
    try {
      const parsed = JSON.parse(formSchemaText);
      if (!Array.isArray(parsed)) throw new Error('Form-Schema muss ein Array sein');
      updateFormSchema.mutate({ id: editDialog.aktivitaet.id, formSchema: parsed });
    } catch (err) {
      setFormSchemaError(err.message);
    }
  };

  // ── Filter & Group ──
  const aktivitaeterForPhase = (phaseValue) => {
    const phaseMappings = {
      'Input': ['Input', 'Input (Erarbeitung)'],
      'Übung': ['Übung'],
      'Abschluss': ['Abschluss'],
    };
    return aktivitaeten
      .filter((a) => phaseMappings[phaseValue]?.includes(a.phase) && a.is_active !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aktivitäten-Katalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalten Sie die verfügbaren Aktivitäten für jede Lernpaket-Phase und deren Metadaten-Anforderungen.
          </p>
        </div>
        <Button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          variant="outline"
          className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
          title="Löscht alle Aktivitäten und lädt die 16 Standard-Aktivitäten mit korrekten Schemas"
        >
          {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <RefreshCw className="w-4 h-4" />
          Katalog zurücksetzen
        </Button>
      </div>

      <Tabs value={selectedPhase} onValueChange={setSelectedPhase}>
        <TabsList className="bg-muted">
          {PHASEN.map((phase) => (
            <TabsTrigger key={phase.value} value={phase.value}>
              {phase.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PHASEN.map((phase) => {
          const items = aktivitaeterForPhase(phase.value);
          return (
            <TabsContent key={phase.value} value={phase.value} className="mt-6 space-y-4">
              {items.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">
                      Keine Aktivitäten für diese Phase hinterlegt.
                    </p>
                    {aktivitaeten.length === 0 && (
                      <Button
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isPending}
                        className="gap-2"
                      >
                        {seedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        <RefreshCw className="w-4 h-4" />
                        Standard-Aktivitäten laden (Seed)
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {items.map((aktivitaet) => (
                    <Card key={aktivitaet.id} className="border shadow-sm overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-foreground">{aktivitaet.name}</h3>
                              <Badge className={cn('text-[10px]', phase.color)}>
                                {phase.label}
                              </Badge>
                            </div>

                            {aktivitaet.form_schema && aktivitaet.form_schema.length > 0 && (
                              <div className="text-xs text-muted-foreground mb-2">
                                <span className="font-medium">Felder:</span>{' '}
                                {aktivitaet.form_schema.map((f) => f.field_name).join(', ')}
                              </div>
                            )}

                            <AktivitaetThumbnailUpload
                              value={aktivitaet.thumbnail_url}
                              disabled={updateThumbnail.isPending}
                              onChange={(thumbnailUrl) =>
                                updateThumbnail.mutate({ id: aktivitaet.id, thumbnailUrl })
                              }
                            />
                          </div>

                          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {aktivitaet.is_active ? 'Aktiv' : 'Inaktiv'}
                              </span>
                              <Switch
                                checked={aktivitaet.is_active}
                                onCheckedChange={(checked) =>
                                  updateToggle.mutate({ id: aktivitaet.id, isActive: checked })
                                }
                                disabled={updateToggle.isPending}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {aktivitaet.supports_master ? 'Master ✓' : 'Master ✗'}
                              </span>
                              <Switch
                                checked={aktivitaet.supports_master || false}
                                onCheckedChange={(checked) =>
                                  updateSupportsMaster.mutate({ id: aktivitaet.id, supportsMaster: checked })
                                }
                                disabled={updateSupportsMaster.isPending}
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditClick(aktivitaet)}
                              >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deleteAktivitaet.mutate(aktivitaet.id)}
                                disabled={deleteAktivitaet.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form-Schema bearbeiten: {editDialog.aktivitaet?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Form-Schema (JSON-Array)
              </Label>
              <Textarea
                value={formSchemaText}
                onChange={(e) => {
                  setFormSchemaText(e.target.value);
                  setFormSchemaError('');
                }}
                placeholder='[{"field_name": "url", "type": "url", "label": "Video-URL"}]'
                className="font-mono text-xs min-h-[300px]"
              />
              {formSchemaError && (
                <p className="text-xs text-destructive mt-2">{formSchemaError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Verfügbare Feldtypen: text, textarea, url, file, image, audio, number, select, json, info
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, aktivitaet: null })}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveSchema}
              disabled={updateFormSchema.isPending}
              className="gap-2"
            >
              {updateFormSchema.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}