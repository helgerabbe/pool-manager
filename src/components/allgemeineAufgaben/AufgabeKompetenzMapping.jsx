import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllLernziele } from '@/services/LernzielService';
import { getAllLernpakete } from '@/services/LernpaketService';
import { getThemenfelderByEinheit } from '@/services/ThemenfeldService';
import { getMappingsByAufgabe, createMapping, deleteMapping, getBasisMappingsByAufgabe } from '@/services/AllgemeineAufgabeService';
import { getAllBasisLernziele } from '@/services/BasisLernzielService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Draggable, Droppable, DragDropContext } from '@hello-pangea/dnd';
import { GripVertical, Trash2, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useDraftState, useDraftRestore } from '@/hooks/useDraftState';
import { useSavedIndicator, SavedIndicator } from '@/hooks/useSavedIndicator.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LernzielBadge from '@/components/allgemeineAufgaben/LernzielBadge';
import InlineBasisLernzielSelector from '@/components/allgemeineAufgaben/InlineBasisLernzielSelector';
import KompetenzDropzoneWithBasis from '@/components/allgemeineAufgaben/KompetenzDropzoneWithBasis';

// ── Draggable Lernziel (memoized für Performance) ──
const DraggableLernziel = React.memo(function DraggableLernziel({ lernziel, isHighlighted, index }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs text-xs">
          {lernziel.formulierung_fachsprache}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ── Legacy Dropzone (wird nicht mehr verwendet) ──
const LernzielDropzone = React.memo(function LernzielDropzone({
  aufgabeId,
  mappedLernziele,
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
              ? 'Benötigte Lernziele hier ablegen'
              : `${mappedLernziele.length} Lernziel(e) zugeordnet`}
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
});

// ── Akkordeon für Themenfelder (memoized) ──
const ThemenfeldGroup = React.memo(function ThemenfeldGroup({ themenfeld, lernziele, searchTerm }) {
  const [isOpen, setIsOpen] = useState(true);
  const filtered = useMemo(() => {
    if (!searchTerm) return lernziele;
    return lernziele.filter((lz) =>
      lz.formulierung_fachsprache.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lernziele, searchTerm]);

  if (filtered.length === 0) return null;

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
          {filtered.map((lz, index) => (
            <DraggableLernziel key={lz.id} lernziel={lz} isHighlighted={false} index={index} />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Haupt-Component ──
export default function AufgabeKompetenzMapping({ aufgabe, einheit, einheitId, onComplete }) {
  const queryClient = useQueryClient();
  const draftKey = `aufgaben-mapping-${aufgabe?.id}`;
  
  // Lokaler State für die Arbeit (kein Draft-State nötig, da alles sofort gespeichert wird)
  const [mappedLernziele, setMappedLernziele] = useState([]);
  const [mappedBasisLernziele, setMappedBasisLernziele] = useState([]);
  const { showSavedIndicator, triggerSaved } = useSavedIndicator();

  const [savingIds, setSavingIds] = useState(new Set());
  const [savingBasisIds, setSavingBasisIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Daten
  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => getAllLernziele(),
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => einheitId ? getThemenfelderByEinheit(einheitId) : Promise.resolve([]),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => getAllLernpakete(),
    enabled: !!einheitId,
  });

  const { data: existingMappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings', aufgabe?.id],
    queryFn: () => aufgabe?.id ? getMappingsByAufgabe(aufgabe.id) : Promise.resolve([]),
    enabled: !!aufgabe?.id,
  });

  const { data: basisLernziele = [] } = useQuery({
    queryKey: ['basisLernziele'],
    queryFn: () => getAllBasisLernziele(),
  });

  const { data: existingBasisMappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeBasisMappings', aufgabe?.id],
    queryFn: () => aufgabe?.id ? getBasisMappingsByAufgabe(aufgabe.id) : Promise.resolve([]),
    enabled: !!aufgabe?.id,
  });

  // Sync DB-Mappings mit lokalen Daten (bei Tab-Wechsel)
  useEffect(() => {
    const mapped = alleLernziele.filter((lz) => existingMappings.some((m) => m.lernziel_id === lz.id));
    setMappedLernziele(mapped);

    const mappedBasis = basisLernziele.filter((lz) => existingBasisMappings.some((m) => m.basislernziel_id === lz.id));
    setMappedBasisLernziele(mappedBasis);
  }, [alleLernziele, existingMappings, basisLernziele, existingBasisMappings]);

  // Mutations
  const createMappingMutation = useMutation({
    mutationFn: (data) => createMapping(data.aufgabe_id, data.lernziel_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgabeMappings'] });
      triggerSaved();
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (mappingId) => deleteMapping(mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgabeMappings'] });
      triggerSaved();
    },
  });

  // Drag-Handler
  const handleDragEnd = useCallback(
    async (result) => {
      const { destination, draggableId } = result;
      if (!destination || !destination.droppableId.startsWith('dropzone-')) return;

      const lernzielId = draggableId.replace('lz-', '');
      const lernziel = alleLernziele.find((lz) => lz.id === lernzielId);

      if (!lernziel || mappedLernziele.some((lz) => lz.id === lernziel.id)) {
        toast.info('Lernziel ist bereits zugeordnet');
        return;
      }

      setMappedLernziele((prev) => [...prev, lernziel]);
      setSavingIds((prev) => new Set([...prev, lernziel.id]));

      try {
        await createMappingMutation.mutateAsync({
          aufgabe_id: aufgabe.id,
          lernziel_id: lernziel.id,
        });
      } catch (err) {
        setMappedLernziele((prev) => prev.filter((lz) => lz.id !== lernziel.id));
        toast.error('Fehler beim Speichern');
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(lernziel.id);
          return next;
        });
      }
    },
    [alleLernziele, mappedLernziele, aufgabe.id, createMappingMutation, setMappedLernziele]
  );

  const handleRemoveMapping = useCallback(
    async (lernzielId) => {
      const mapping = existingMappings.find((m) => m.lernziel_id === lernzielId);
      const lernziel = alleLernziele.find((lz) => lz.id === lernzielId);

      setMappedLernziele((prev) => prev.filter((lz) => lz.id !== lernzielId));
      setSavingIds((prev) => new Set([...prev, lernzielId]));

      try {
        if (mapping) {
          await deleteMappingMutation.mutateAsync(mapping.id);
        }
      } catch (err) {
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
    },
    [existingMappings, alleLernziele, deleteMappingMutation, setMappedLernziele]
  );

  const handleRemoveBasisMapping = useCallback(
    (basisLernzielId) => {
      // Handler wird direkt von InlineBasisLernzielSelector aufgerufen
      setMappedBasisLernziele((prev) => prev.filter((lz) => lz.id !== basisLernzielId));
      setSavingBasisIds((prev) => {
        const next = new Set(prev);
        next.delete(basisLernzielId);
        return next;
      });
    },
    []
  );

  // Gefilterte Listen (memoized)
  const lernzieleDeEinheit = useMemo(
    () =>
      alleLernziele.filter((lz) => {
        const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
        return paket?.einheit_id === einheitId;
      }),
    [alleLernziele, lernpakete, einheitId]
  );

  const themenfeldMitLernzielen = useMemo(
    () =>
      themenfelder.map((tf) => ({
        themenfeld: tf,
        lernziele: lernzieleDeEinheit.filter((lz) => {
          const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
          return paket?.themenfeld_id === tf.id;
        }),
      })),
    [themenfelder, lernzieleDeEinheit, lernpakete]
  );

  const unzugeordneteLernziele = useMemo(
    () =>
      alleLernziele.filter((lz) => {
        const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
        return !paket || paket.einheit_id !== einheitId;
      }),
    [alleLernziele, lernpakete, einheitId]
  );

  return (
    <>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-full flex flex-col gap-4 p-6 overflow-y-auto">
          {/* Split-Screen Layout - Responsiv */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
            {/* Linke Seite: Quellen-Liste */}
            <Droppable droppableId="lernziele-source" isDropDisabled={true}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col min-h-0 overflow-hidden border rounded-lg"
                >
                  <div className="px-4 py-3 bg-slate-100 border-b sticky top-0 z-20 space-y-2">
                    <h3 className="text-sm font-semibold">Verfügbare Kompetenzen</h3>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded border text-xs bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {/* Bereich 1: Lernziele der Einheit */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">Lernziele der Einheit</p>
                      {themenfeldMitLernzielen.filter((item) => item.lernziele.length > 0).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Keine Lernziele vorhanden</p>
                      ) : (
                        <div className="space-y-3">
                          {themenfeldMitLernzielen.map((item) => (
                            <ThemenfeldGroup
                              key={item.themenfeld.id}
                              themenfeld={item.themenfeld}
                              lernziele={item.lernziele}
                              searchTerm={searchTerm}
                            />
                          ))}
                        </div>
                      )}
                      {unzugeordneteLernziele.length > 0 && (
                        <div className="mt-3 border rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-slate-50 border-b text-left">
                            <span className="text-xs font-semibold text-slate-700">Nicht zugeordnete Lernziele</span>
                          </div>
                          <div className="p-2 space-y-1.5 bg-white">
                            {unzugeordneteLernziele.map((lz, index) => (
                              <DraggableLernziel key={lz.id} lernziel={lz} isHighlighted={false} index={index} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bereich 2: Basis-Vorwissen */}
                    <div className="border-t pt-3">
                      <InlineBasisLernzielSelector 
                        aufgabeId={aufgabe?.id}
                        einheitFach={einheit?.fach}
                        onLernzielAdded={() => {
                          triggerSaved();
                        }}
                        onLernzielRemoved={() => {
                          triggerSaved();
                        }}
                      />
                    </div>

                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>

            {/* Rechte Seite: Aufgabe + Dropzone */}
            <div className="flex flex-col min-h-0 overflow-hidden border rounded-lg bg-card p-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold truncate">{aufgabe?.titel || 'Aufgabe'}</h3>
                  <SavedIndicator show={showSavedIndicator} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{aufgabe?.aufgabenstellung}</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <KompetenzDropzoneWithBasis
                  aufgabeId={aufgabe?.id}
                  mappedLernziele={mappedLernziele}
                  mappedBasisLernziele={mappedBasisLernziele}
                  onMappingRemoved={handleRemoveMapping}
                  onBasisMappingRemoved={handleRemoveBasisMapping}
                  removingIds={savingIds}
                  removingBasisIds={savingBasisIds}
                />
              </div>
            </div>
          </div>

          {/* Footer: Info */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {mappedLernziele.length + mappedBasisLernziele.length === 0
                  ? 'Noch keine Kompetenzen zugeordnet'
                  : `${mappedLernziele.length} Lernziel(e) + ${mappedBasisLernziele.length} Basis-Ziel(e)`}
              </p>
              <SavedIndicator show={showSavedIndicator} />
            </div>
          </div>
        </div>
      </DragDropContext>
    </>
  );
}