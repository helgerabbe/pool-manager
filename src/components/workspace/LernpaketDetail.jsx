import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, AlertCircle, Plus, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DynamicFieldRenderer from './DynamicFieldRenderer';

const PHASEN = [
  { key: 'input', label: 'Erarbeitung (Input)', color: 'border-blue-300 bg-blue-50', icon: '📚' },
  { key: 'uebung', label: 'Übung', color: 'border-green-300 bg-green-50', icon: '✏️' },
  { key: 'abschluss', label: 'Abschluss', color: 'border-purple-300 bg-purple-50', icon: '🎯' },
];

// Helper: Prüfe ob Metadaten vollständig sind
function isMetaDataComplete(formSchema, metaData) {
  if (!formSchema || !Array.isArray(formSchema)) return true;
  
  const requiredFields = formSchema.filter(f => f.required);
  return requiredFields.every(f => {
    const value = metaData?.[f.field_name];
    return value !== undefined && value !== null && value !== '';
  });
}

// Header mit Titel und Lernzielen
function LernpaketHeader({ lernpaket, lernziele }) {
  const paketZiele = lernziele?.filter(lz => lz.lernpaket_id === lernpaket?.id) || [];
  
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{lernpaket?.titel_des_pakets}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {lernpaket?.geschaetzte_dauer_minuten} Minuten
        </p>
      </div>
      
      {paketZiele.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Zugeordnete Lernziele</p>
          <div className="flex flex-wrap gap-2">
            {paketZiele.map(lz => (
              <Badge key={lz.id} variant="outline" className="text-xs">
                {lz.formulierung_fachsprache?.substring(0, 40)}...
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Activity Item mit Warn-Badge
function ActivityItem({ activity, formSchema, onEdit, onDelete, isLoading }) {
  const isComplete = isMetaDataComplete(formSchema, activity.meta_data);
  
  return (
    <div className={cn(
      'p-3 rounded-lg border flex items-start justify-between gap-3 transition-colors',
      !isComplete ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{activity.name}</span>
          {!isComplete && (
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 border-amber-300">
              <AlertCircle className="w-3 h-3" />
              Unvollständig
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onEdit}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Bearbeiten'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// Modal für Aktivitätswahl
function ActivitySelectionModal({ open, onOpenChange, phase, aktivitaeten, onSelect }) {
  const phaseAktivitaeten = aktivitaeten?.filter(a => a.phase === phase.label) || [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aktivität hinzufügen – {phase.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {phaseAktivitaeten.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Aktivitäten verfügbar.</p>
          ) : (
            phaseAktivitaeten.map(akt => (
              <button
                key={akt.id}
                onClick={() => onSelect(akt)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium">{akt.name}</p>
                {akt.description && (
                  <p className="text-xs text-muted-foreground mt-1">{akt.description}</p>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal für Metadaten-Eingabe
function MetaDataModal({ open, onOpenChange, activity, formSchema, initialData, onSubmit, isLoading }) {
  const [metaData, setMetaData] = useState(initialData || {});
  
  useEffect(() => {
    setMetaData(initialData || {});
  }, [initialData, open]);
  
  const handleSubmit = () => {
    onSubmit(metaData, true); // true = complete
    onOpenChange(false);
  };
  
  const handleLater = () => {
    onSubmit(metaData, false); // false = incomplete
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {formSchema && formSchema.length > 0 ? (
            <DynamicFieldRenderer
              formSchema={formSchema}
              metaData={metaData}
              onMetaDataChange={(fieldName, value) =>
                setMetaData(prev => ({ ...prev, [fieldName]: value }))
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">Keine Felder zu konfigurieren.</p>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleLater}
            disabled={isLoading}
          >
            Später ausfüllen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hauptkomponente
export default function LernpaketDetail({ lernpaketId, einheitId }) {
  const queryClient = useQueryClient();
  const [phasenState, setPhasenState] = useState({
    input: { active: true, activities: [] },
    uebung: { active: true, activities: [] },
    abschluss: { active: true, activities: [] },
  });
  
  const [selectionModalOpen, setSelectionModalOpen] = useState(null); // "input"|"uebung"|"abschluss"|null
  const [metaDataModalOpen, setMetaDataModalOpen] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: lernpaket, isLoading: lernpaketLoading } = useQuery({
    queryKey: ['lernpaket', lernpaketId],
    queryFn: async () => {
      const paket = await base44.entities.Lernpakete.get(lernpaketId);
      return paket;
    },
    enabled: !!lernpaketId,
  });

  const { data: aktivitaeten, isLoading: aktivitaetenLoading } = useQuery({
    queryKey: ['aktivitaeten'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const { data: lernziele } = useQuery({
    queryKey: ['lernziele', einheitId],
    queryFn: () => base44.entities.Lernziele.filter({ lernpaket_id: lernpaketId }),
    enabled: !!lernpaketId,
  });

  // Initialisiere State aus Lernpaket
  useEffect(() => {
    if (lernpaket?.phasen_konfiguration) {
      setPhasenState(lernpaket.phasen_konfiguration);
    }
  }, [lernpaket]);

  // Mutation zum Speichern
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Lernpakete.update(lernpaketId, {
        phasen_konfiguration: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaket', lernpaketId] });
      toast.success('Phasenkonfiguration gespeichert');
    },
    onError: (err) => {
      toast.error('Fehler: ' + err.message);
    },
  });

  const handleTogglePhase = (phaseKey) => {
    setPhasenState(prev => ({
      ...prev,
      [phaseKey]: {
        ...prev[phaseKey],
        active: !prev[phaseKey].active,
      },
    }));
  };

  const handleAddActivityClick = (phaseKey) => {
    setSelectionModalOpen(phaseKey);
  };

  const handleActivitySelected = (activity) => {
    setSelectedActivity(activity);
    setMetaDataModalOpen(true);
    setSelectionModalOpen(null);
  };

  const handleMetaDataSubmit = async (metaData, isComplete) => {
    setIsSubmitting(true);
    
    const newActivity = {
      id: Math.random().toString(36).substr(2, 9), // temp ID
      name: selectedActivity.name,
      type_id: selectedActivity.id,
      meta_data: metaData,
      complete: isComplete,
    };
    
    setPhasenState(prev => {
      const phaseKey = metaDataModalOpen || selectionModalOpen;
      return {
        ...prev,
        [phaseKey]: {
          ...prev[phaseKey],
          activities: [...(prev[phaseKey]?.activities || []), newActivity],
        },
      };
    });
    
    setMetaDataModalOpen(null);
    setSelectedActivity(null);
    setIsSubmitting(false);
    
    toast.success(`Aktivität hinzugefügt${!isComplete ? ' (später ausfüllen)' : ''}`);
  };

  const handleDeleteActivity = (phaseKey, activityId) => {
    setPhasenState(prev => ({
      ...prev,
      [phaseKey]: {
        ...prev[phaseKey],
        activities: prev[phaseKey].activities.filter(a => a.id !== activityId),
      },
    }));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync(phasenState);
  };

  if (lernpaketLoading || aktivitaetenLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <LernpaketHeader lernpaket={lernpaket} lernziele={lernziele} />

      {/* Phasen */}
      <div className="space-y-4">
        {PHASEN.map(phase => {
          const state = phasenState[phase.key];
          const activities = state?.activities || [];

          return (
            <Card
              key={phase.key}
              className={cn(
                'border-2 transition-all',
                !state?.active ? 'opacity-50 grayscale' : phase.color
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{phase.icon}</span>
                    <CardTitle className="text-lg">{phase.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Aktiv</span>
                    <Switch
                      checked={state?.active || false}
                      onCheckedChange={() => handleTogglePhase(phase.key)}
                    />
                  </div>
                </div>
              </CardHeader>

              {state?.active && (
                <CardContent className="space-y-4">
                  {/* Activities List */}
                  {activities.length > 0 && (
                    <div className="space-y-2">
                      {activities.map(activity => {
                        const aktivitaetDef = aktivitaeten?.find(a => a.id === activity.type_id);
                        return (
                          <ActivityItem
                            key={activity.id}
                            activity={activity}
                            formSchema={aktivitaetDef?.form_schema}
                            onEdit={() => {
                              setEditingActivityId(activity.id);
                              setSelectedActivity(aktivitaetDef);
                              setMetaDataModalOpen(phase.key);
                            }}
                            onDelete={() => handleDeleteActivity(phase.key, activity.id)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Add Activity Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleAddActivityClick(phase.key)}
                  >
                    <Plus className="w-4 h-4" />
                    Aktivität hinzufügen
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline">Abbrechen</Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Speichern
        </Button>
      </div>

      {/* Modals */}
      {selectionModalOpen && (
        <ActivitySelectionModal
          open={!!selectionModalOpen}
          onOpenChange={() => setSelectionModalOpen(null)}
          phase={PHASEN.find(p => p.key === selectionModalOpen) || {}}
          aktivitaeten={aktivitaeten}
          onSelect={handleActivitySelected}
        />
      )}

      {metaDataModalOpen && selectedActivity && (
        <MetaDataModal
          open={!!metaDataModalOpen}
          onOpenChange={() => {
            setMetaDataModalOpen(null);
            setSelectedActivity(null);
            setEditingActivityId(null);
          }}
          activity={selectedActivity}
          formSchema={selectedActivity.form_schema}
          initialData={editingActivityId ? undefined : {}}
          onSubmit={handleMetaDataSubmit}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}