import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Draggable, Droppable, DragDropContext } from '@hello-pangea/dnd';
import { GripVertical, Trash2, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import LernzielBadge from '@/components/allgemeineAufgaben/LernzielBadge';

// ── Draggable Lernziel ──
function DraggableLernziel({ lernziel, isHighlighted, index }) {
  return (
    <Draggable draggableId={`lz-${lernziel.id}`} index={index}>
      {(provided, snapshot) =>
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`flex items-center gap-2 p-2 rounded border cursor-grab active:cursor-grabbing transition-all ${
        snapshot.isDragging ?
        'opacity-50 ring-2 ring-primary' :
        isHighlighted ?
        'bg-primary/10 border-primary/40' :
        'bg-white hover:bg-muted'}`
        }>
        
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-medium truncate">{lernziel.formulierung_fachsprache}</p>
            {lernziel.kategorie &&
          <Badge variant="secondary" className="text-[10px] mt-1">
                {lernziel.kategorie}
              </Badge>
          }
          </div>
        </div>
      }
    </Draggable>);

}

// ── Dropzone für Lernziele ──
function LernzielDropzone({
  aufgabeId,
  mappedLernziele,
  onMappingAdded,
  onMappingRemoved,
  removingIds = new Set()
}) {
  return (
    <Droppable droppableId={`dropzone-${aufgabeId}`}>
      {(provided, snapshot) =>
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={`p-4 rounded-lg border-2 transition-all ${
        snapshot.isDraggingOver ?
        'border-primary/60 bg-primary/5' :
        'border-dashed border-muted-foreground/30 bg-muted/20'} min-h-32 flex flex-col gap-3`
        }>
        
          <p className="text-xs text-muted-foreground font-medium">
          {mappedLernziele.length === 0 ?
          'Benötigte Lernziele hier ablegen' :
          `${mappedLernziele.length} Lernziel(e) zugeordnet`}
          </p>

          {mappedLernziele.length > 0 &&
        <div className="space-y-2">
              {mappedLernziele.map((lz) =>
          <LernzielBadge
            key={lz.id}
            lernziel={lz}
            onRemove={onMappingRemoved}
            isRemoving={removingIds.has(lz.id)} />

          )}
            </div>
        }
          {provided.placeholder}
        </div>
      }
    </Droppable>);

}

// ── Akkordeon für Themenfelder + Lernpakete ──
function ThemenfeldGroup({ themenfeld, lernziele }) {
  const [isOpen, setIsOpen] = useState(true);

  if (lernziele.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200 hover:bg-amber-100 transition-colors text-left">
        
        <span className="text-xs font-semibold text-amber-800">{themenfeld.titel}</span>
        <span className={`text-xs text-amber-600 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          ▼
        </span>
      </button>
      {isOpen &&
      <div className="p-2 space-y-1.5 bg-white">
          {lernziele.map((lz, index) =>
        <DraggableLernziel key={lz.id} lernziel={lz} isHighlighted={false} index={index} />
        )}
        </div>
      }
    </div>);

}

// ── Haupt-Component ──
export default function AufgabeKompetenzMapping({ aufgabe, einheitId, onComplete }) {
  const queryClient = useQueryClient();
  const [mappedLernziele, setMappedLernziele] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Lernziele der Einheit
  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!einheitId
  });

  // Fetch Themenfelder
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () =>
    einheitId ?
    base44.entities.Themenfeld.filter({ einheit_id: einheitId }) :
    Promise.resolve([]),
    enabled: !!einheitId
  });

  // Fetch Lernpakete
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId
  });

  // Fetch bestehende Mappings
  const { data: existingMappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings', aufgabe?.id],
    queryFn: () =>
    aufgabe?.id ?
    base44.entities.AllgemeineAufgabeLernzielMapping.filter({
      aufgabe_id: aufgabe.id
    }) :
    Promise.resolve([]),
    enabled: !!aufgabe?.id
  });

  // Initialisiere mappedLernziele aus bestehenden Mappings
  useEffect(() => {
    const mapped = alleLernziele.filter((lz) =>
    existingMappings.some((m) => m.lernziel_id === lz.id)
    );
    setMappedLernziele(mapped);
  }, [alleLernziele, existingMappings]);

  // Mutation für Mapping erstellen/löschen
  const createMapping = useMutation({
    mutationFn: (data) =>
    base44.entities.AllgemeineAufgabeLernzielMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeMappings']
      });
    }
  });

  const deleteMapping = useMutation({
    mutationFn: (mappingId) =>
    base44.entities.AllgemeineAufgabeLernzielMapping.delete(mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeMappings']
      });
    }
  });

  // Drag-End-Handler
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId.startsWith('dropzone-')) {
      // Extrahiere Lernziel-ID aus draggableId (format: "lz-{id}")
      const lernzielId = draggableId.replace('lz-', '');
      const lernziel = alleLernziele.find((lz) => lz.id === lernzielId);

      if (!lernziel) return;

      // Bereits gemappt?
      if (mappedLernziele.some((lz) => lz.id === lernziel.id)) {
        toast.info('Lernziel ist bereits zugeordnet');
        return;
      }

      // Hinzufügen
      setMappedLernziele((prev) => [...prev, lernziel]);
      setHasChanges(true);
      setSavingIds((prev) => new Set([...prev, lernziel.id]));

      try {
        await createMapping.mutateAsync({
          aufgabe_id: aufgabe.id,
          lernziel_id: lernziel.id
        });
      } catch (err) {
        setMappedLernziele((prev) =>
        prev.filter((lz) => lz.id !== lernziel.id)
        );
        setHasChanges(false);
        toast.error('Fehler beim Speichern');
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(lernziel.id);
          return next;
        });
      }
    }
  };

  // Mapping entfernen (Optimistic Update)
  const handleRemoveMapping = async (lernzielId) => {
    const mapping = existingMappings.find(
      (m) => m.lernziel_id === lernzielId
    );

    // Optimistic UI: Sofort aus Dropzone entfernen
    setMappedLernziele((prev) =>
    prev.filter((lz) => lz.id !== lernzielId)
    );
    setHasChanges(true);
    setSavingIds((prev) => new Set([...prev, lernzielId]));

    try {
      // Nur API call, wenn ein Mapping existiert
      if (mapping) {
        await deleteMapping.mutateAsync(mapping.id);
      }
    } catch (err) {
      // Rollback: Bei Fehler zurück in Dropzone
      const lernziel = alleLernziele.find((lz) => lz.id === lernzielId);
      if (lernziel) {
        setMappedLernziele((prev) => [...prev, lernziel]);
      }
      setHasChanges(false);
      toast.error('Fehler beim Löschen');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(lernzielId);
        return next;
      });
    }
  };

  // Filtere ALLE Lernziele der Einheit (unabhängig vom Themenfeld)
  const lernzieleDeEinheit = alleLernziele.filter((lz) => {
    const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
    return paket?.einheit_id === einheitId;
  });

  // Gruppiere diese nach Themenfeld
  const themenfeldMitLernzielen = themenfelder.map((tf) => ({
    themenfeld: tf,
    lernziele: lernzieleDeEinheit.filter((lz) => {
      const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
      return paket?.themenfeld_id === tf.id;
    })
  }));

  // Unzugeordnete: Lernziele ohne Lernpaket oder Lernpaket nicht in Einheit
  const unzugeordneteLernziele = alleLernziele.filter((lz) => {
    const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
    return !paket || paket.einheit_id !== einheitId;
  });

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Alle ausstehenden Speicherungen sind bereits durch Drag&Drop abgeschlossen
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success('Änderungen gespeichert');
      setHasChanges(false);
    } catch (err) {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col gap-4 p-6 overflow-y-auto">
        {/* Split-Screen Layout */}
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
          {/* Linke Seite: Quellen-Liste */}
          <Droppable droppableId="lernziele-source" isDropDisabled={true}>
            {(provided) =>
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col min-h-0 overflow-hidden border rounded-lg">
              
                <div className="px-4 py-3 bg-slate-100 border-b sticky top-0 z-10">
                  <h3 className="text-sm font-semibold">Verfügbare Lernziele</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {themenfeldMitLernzielen.length === 0 ?
                <p className="text-xs text-muted-foreground text-center py-4">
                    Keine Lernziele vorhanden
                  </p> :

                themenfeldMitLernzielen.
                filter((item) => item.lernziele.length > 0).
                map((item) =>
                <div key={item.themenfeld.id}>
                          <ThemenfeldGroup
                    themenfeld={item.themenfeld}
                    lernziele={item.lernziele} />
                  
                        </div>
                )
                }
                {unzugeordneteLernziele.length > 0 &&
                <div className="border rounded-lg overflow-hidden">
                  <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-left">
                    <span className="text-xs font-semibold text-slate-700">Nicht zugeordnete Lernziele</span>
                  </div>
                  <div className="p-2 space-y-1.5 bg-white">
                    {unzugeordneteLernziele.map((lz, index) =>
                      <DraggableLernziel key={lz.id} lernziel={lz} isHighlighted={false} index={index} />
                    )}
                  </div>
                </div>
                }
                  {provided.placeholder}
                </div>
              </div>
            }
          </Droppable>

          {/* Rechte Seite: Aufgabe + Dropzone */}
          <div className="flex flex-col min-h-0 overflow-hidden border rounded-lg bg-card p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1 truncate">
                {aufgabe?.titel || 'Aufgabe'}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {aufgabe?.aufgabenstellung}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <LernzielDropzone
                aufgabeId={aufgabe?.id}
                mappedLernziele={mappedLernziele}
                onMappingAdded={() => {}}
                onMappingRemoved={handleRemoveMapping}
                removingIds={savingIds} />
              
            </div>
          </div>
        </div>

        {/* Footer: Aktionen */}
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {mappedLernziele.length === 0 ?
            'Noch keine Lernziele zugeordnet' :
            `${mappedLernziele.length} Lernziel(e) zugeordnet`}
          </p>
          <Button
            size="sm"
            onClick={handleSaveChanges}
            disabled={!hasChanges || isSaving}
            className="gap-2">
            
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Speichern
              </>
            )}
          </Button>
        </div>
      </div>
    </DragDropContext>);

}