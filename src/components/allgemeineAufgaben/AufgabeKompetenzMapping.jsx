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
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`flex items-center gap-2 p-2 rounded border cursor-grab active:cursor-grabbing transition-all ${
            snapshot.isDragging
              ? 'opacity-50 ring-2 ring-primary'
              : isHighlighted
                ? 'bg-primary/10 border-primary/40'
                : 'bg-white hover:bg-muted'
          }`}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-medium truncate">{lernziel.formulierung_fachsprache}</p>
            {lernziel.kategorie && (
              <Badge variant="secondary" className="text-[10px] mt-1">
                {lernziel.kategorie}
              </Badge>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ── Dropzone für Lernziele ──
function LernzielDropzone({
  aufgabeId,
  mappedLernziele,
  onMappingAdded,
  onMappingRemoved,
  removingIds = new Set(),
}) {
  return (
    <Droppable droppableId={`dropzone-${aufgabeId}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-4 rounded-lg border-2 transition-all ${
            snapshot.isDraggingOver
              ? 'border-primary/60 bg-primary/5'
              : 'border-dashed border-muted-foreground/30 bg-muted/20'
          } min-h-32 flex flex-col gap-3`}
        >
          <p className="text-xs text-muted-foreground font-medium">
            {mappedLernziele.length === 0
              ? 'Benötigte Kompetenzen hier ablegen'
              : `${mappedLernziele.length} Kompetenz(en) zugeordnet`}
          </p>

          {mappedLernziele.length > 0 && (
            <div className="space-y-2">
              {mappedLernziele.map((lz) => (
                <LernzielBadge
                  key={lz.id}
                  lernziel={lz}
                  onRemove={onMappingRemoved}
                  isRemoving={removingIds.has(lz.id)}
                />
              ))}
            </div>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

// ── Akkordeon für Themenfelder + Lernpakete ──
function ThemenfeldGroup({ themenfeld, lernziele }) {
  const [isOpen, setIsOpen] = useState(true);

  if (lernziele.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200 hover:bg-amber-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-amber-800">{themenfeld.titel}</span>
        <span className={`text-xs text-amber-600 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="p-2 space-y-1.5 bg-white">
          {lernziele.map((lz, index) => (
            <DraggableLernziel key={lz.id} lernziel={lz} isHighlighted={false} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Component ──
export default function AufgabeKompetenzMapping({ aufgabe, einheitId, onComplete }) {
  const queryClient = useQueryClient();
  const [mappedLernziele, setMappedLernziele] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());

  // Fetch Lernpakete der Einheit
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId,
  });

  // Fetch Lernziele (gefiltert über Lernpakete)
  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['lernziele', einheitId],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!einheitId,
  });

  // Fetch Themenfelder
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () =>
      einheitId
        ? base44.entities.Themenfeld.filter({ einheit_id: einheitId })
        : Promise.resolve([]),
    enabled: !!einheitId,
  });

  // Fetch bestehende Mappings
  const { data: existingMappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings', aufgabe?.id],
    queryFn: () =>
      aufgabe?.id
        ? base44.entities.AllgemeineAufgabeLernzielMapping.filter({
            aufgabe_id: aufgabe.id,
          })
        : Promise.resolve([]),
    enabled: !!aufgabe?.id,
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
        queryKey: ['allgemeineAufgabeMappings'],
      });
    },
  });

  const deleteMapping = useMutation({
    mutationFn: (mappingId) =>
      base44.entities.AllgemeineAufgabeLernzielMapping.delete(mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeMappings'],
      });
    },
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
        toast.info('Kompetenz ist bereits zugeordnet');
        return;
      }

      // Hinzufügen
      setMappedLernziele((prev) => [...prev, lernziel]);
      setSavingIds((prev) => new Set([...prev, lernziel.id]));

      try {
        await createMapping.mutateAsync({
          aufgabe_id: aufgabe.id,
          lernziel_id: lernziel.id,
        });
        toast.success('Kompetenz zugeordnet');
      } catch (err) {
        setMappedLernziele((prev) =>
          prev.filter((lz) => lz.id !== lernziel.id)
        );
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
    setSavingIds((prev) => new Set([...prev, lernzielId]));

    try {
      // Nur API call, wenn ein Mapping existiert
      if (mapping) {
        await deleteMapping.mutateAsync(mapping.id);
      }
      toast.success('Verknüpfung aufgehoben');
    } catch (err) {
      // Rollback: Bei Fehler zurück in Dropzone
      const lernziel = alleLernziele.find((lz) => lz.id === lernzielId);
      if (lernziel) {
        setMappedLernziele((prev) => [...prev, lernziel]);
      }
      toast.error('Fehler beim Löschen');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(lernzielId);
        return next;
      });
    }
  };

  // Gruppiere Lernziele nach Themenfeld (alle Kompetenzen der Einheit)
  const paketeFuerEinheit = lernpakete.filter((p) => p.einheit_id === einheitId);
  const paketIdsFuerEinheit = paketeFuerEinheit.map((p) => p.id);
  
  // Alle Lernziele der Einheit (unabhängig vom Themenfeld)
  const alleLernzieleEinheit = alleLernziele.filter((lz) =>
    paketIdsFuerEinheit.includes(lz.lernpaket_id)
  );
  
  // Gruppiere nach Themenfeld
  const themenfeldMitLernzielen = themenfelder.map((tf) => ({
    themenfeld: tf,
    lernziele: alleLernzieleEinheit.filter((lz) => {
      const paket = paketeFuerEinheit.find((p) => p.id === lz.lernpaket_id);
      return paket?.themenfeld_id === tf.id;
    }),
  }));
  
  // Lernziele ohne Themenfeld
  const lernzieleOhneThemenfeld = alleLernzieleEinheit.filter((lz) => {
    const paket = paketeFuerEinheit.find((p) => p.id === lz.lernpaket_id);
    return !paket?.themenfeld_id;
  });
  
  // Nur non-empty Gruppen + optional ohne Themenfeld
  const themenfeldMitLernzielenGefiltert = [
    ...themenfeldMitLernzielen.filter((item) => item.lernziele.length > 0),
    ...(lernzieleOhneThemenfeld.length > 0
      ? [{ themenfeld: { id: '_none', titel: 'Ohne Themenfeld' }, lernziele: lernzieleOhneThemenfeld }]
      : [])
  ];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col gap-4 p-6 overflow-y-auto">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold">Schritt 2: Kompetenzen zuordnen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ziehen Sie die benötigten Kompetenzen aus der linken Liste auf die Dropzone rechts.
          </p>
        </div>

        {/* Split-Screen Layout */}
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
          {/* Linke Seite: Quellen-Liste */}
          <Droppable droppableId="lernziele-source" isDropDisabled={true}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col min-h-0 overflow-hidden border rounded-lg"
              >
                <div className="px-4 py-3 bg-slate-100 border-b sticky top-0 z-10">
                  <h3 className="text-sm font-semibold">Verfügbare Kompetenzen</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {themenfeldMitLernzielenGefiltert.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Keine Kompetenzen vorhanden
                    </p>
                  ) : (
                    themenfeldMitLernzielenGefiltert.map((item) => (
                      <div key={item.themenfeld.id}>
                        <ThemenfeldGroup
                          themenfeld={item.themenfeld}
                          lernziele={item.lernziele}
                        />
                      </div>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              </div>
            )}
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
                removingIds={savingIds}
              />
            </div>
          </div>
        </div>

        {/* Footer: Aktionen */}
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {mappedLernziele.length === 0
              ? 'Noch keine Kompetenzen zugeordnet'
              : `${mappedLernziele.length} Kompetenz(en) zugeordnet`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onComplete?.(false)}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={() => onComplete?.(true)}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Fertig
            </Button>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}