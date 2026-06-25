import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Info, Eye, GripVertical, Trash2, AlertTriangle, Lock, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DeleteActivityConfirmDialog from '@/components/workspace/DeleteActivityConfirmDialog';
import AktivitaetPaletteChip from '@/components/workspace/AktivitaetPaletteChip';

// ────────────────────────────────────────────────────────────────────────────
// Aktivitäten-Palette (Werkzeugkasten) — erscheint über der Aktivitätsliste
// ────────────────────────────────────────────────────────────────────────────
function AktivitaetenPalette({ phaseAktivitaeten, droppableId }) {
  return (
    <Droppable droppableId={droppableId} isDropDisabled={true}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="rounded-lg border border-dashed border-primary/30 bg-primary/3 p-2"
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
            Aktivitäten ziehen ↓
          </p>
          {phaseAktivitaeten.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1">Keine Aktivitäten für diese Phase verfügbar.</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {phaseAktivitaeten.map((akt, idx) => (
                <AktivitaetPaletteChip key={akt.id} katalogEntry={akt} index={idx} />
              ))}
            </div>
          )}
          {/* Phantom-Placeholder — versteckt, da Palette kein echtes Drop-Ziel ist */}
          <div style={{ display: 'none' }}>{provided.placeholder}</div>
        </div>
      )}
    </Droppable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Einzelne Aktivitätskarte in der sortierbaren Liste
// ────────────────────────────────────────────────────────────────────────────
function AktivitaetCard({ activity, katalog, index, canEdit, onDelete, onGoToTaskWorkshop }) {
  return (
    <Draggable draggableId={activity.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'flex items-center gap-2 p-2.5 rounded-lg bg-white border transition-all',
            snapshot.isDragging
              ? 'border-primary shadow-lg ring-2 ring-primary/30'
              : 'border-border hover:border-primary/30 hover:shadow-sm'
          )}
        >
          {/* Drag-Handle */}
          {canEdit && (
            <div {...provided.dragHandleProps} className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Name + Status */}
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{katalog?.name || '…'}</span>
            {activity.content_status === 'approved' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                <Lock className="w-2.5 h-2.5" />Freigegeben
              </span>
            ) : !activity.is_complete && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                <AlertTriangle className="w-2.5 h-2.5" />Unvollständig
              </span>
            )}
          </div>

          {/* Aktions-Buttons */}
          <div className="shrink-0 flex items-center gap-1">
            {canEdit && onGoToTaskWorkshop && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                onClick={() => onGoToTaskWorkshop(activity.id)}
              >
                <ArrowRight className="w-3 h-3" />
                Aufgaben
              </Button>
            )}
            {canEdit && activity.content_status !== 'approved' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDelete(activity)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Haupt-Export: DnD-fähige Phase (Palette + sortierbare Aktivitätenliste)
// ────────────────────────────────────────────────────────────────────────────
export default function PhaseActivitiesDnD({
  paket,
  phase,
  phaseLabel,
  kannBearbeiten,
  inEditMode = false,
  onGoToTaskWorkshop = null,
}) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', paket.id, phase],
    queryFn: () =>
      base44.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: paket.id,
        phase,
        sync_status: { $ne: 'to_delete' },
      }),
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  // Palette: nur aktive Aktivitäten der richtigen Phase
  const phaseAktivitaeten = aktivitaetenKatalog.filter(a => a.phase === phase && a.is_active !== false);

  // Sortierte Liste der bereits zugeordneten Aktivitäten
  const sortedAktivitaeten = [...aktivitaeten].sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

  const canEdit = inEditMode && kannBearbeiten;

  // ── Neue Aktivität aus Palette hinzufügen ──
  const createMutation = useMutation({
    mutationFn: (aktivitaetId) =>
      base44.entities.LernpaketPhaseAktivitaet.create({
        lernpaket_id: paket.id,
        phase,
        aktivitaet_id: aktivitaetId,
        field_values: {},
        is_complete: false,
        reihenfolge: sortedAktivitaeten.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      toast.success('Aktivität hinzugefügt.');
    },
    onError: () => toast.error('Fehler beim Hinzufügen.'),
  });

  // ── Reihenfolge nach DnD-Drop speichern ──
  const reorderMutation = useMutation({
    mutationFn: async (newOrder) => {
      // newOrder = Array von activity-IDs in neuer Reihenfolge
      const updates = newOrder.map((id, i) =>
        base44.entities.LernpaketPhaseAktivitaet.update(id, { reihenfolge: i })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    },
    onError: () => toast.error('Reihenfolge konnte nicht gespeichert werden.'),
  });

  // ── Löschen ──
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('deleteActivityWithTombstoneAndCascade', { activity_id: id });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success('Aktivität gelöscht.');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err?.message || 'Fehler beim Löschen.'),
  });

  // ── DnD onDragEnd ──
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const srcId = result.source.droppableId;
    const dstId = result.destination.droppableId;
    const listId = `phase-list-${paket.id}-${phase}`;
    const paletteId = `palette-${paket.id}-${phase}`;

    // Aus Palette in Liste → Kopie anlegen
    if (srcId === paletteId && dstId === listId) {
      // draggableId = "palette-<katalogId>"
      const katalogId = result.draggableId.replace('palette-', '');
      createMutation.mutate(katalogId);
      return;
    }

    // Innerhalb der Liste → umsortieren
    if (srcId === listId && dstId === listId) {
      const reordered = Array.from(sortedAktivitaeten);
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);
      reorderMutation.mutate(reordered.map(a => a.id));
    }
  };

  const listDroppableId = `phase-list-${paket.id}-${phase}`;
  const paletteDroppableId = `palette-${paket.id}-${phase}`;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {/* Palette — nur im Bearbeitungsmodus */}
        {canEdit && (
          <AktivitaetenPalette
            phaseAktivitaeten={phaseAktivitaeten}
            droppableId={paletteDroppableId}
          />
        )}

        {/* Sortierbare Aktivitätenliste */}
        <Droppable droppableId={listDroppableId} isDropDisabled={!canEdit}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'min-h-[48px] space-y-2 rounded-lg transition-colors',
                snapshot.isDraggingOver && canEdit ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed p-1' : ''
              )}
            >
              {sortedAktivitaeten.length === 0 && !snapshot.isDraggingOver && (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  {canEdit
                    ? 'Ziehe eine Aktivität aus der Palette hierher.'
                    : 'Noch keine Aktivität zugeordnet.'}
                </p>
              )}
              {sortedAktivitaeten.map((activity, idx) => {
                const katalog = aktivitaetenKatalog.find(a => a.id === activity.aktivitaet_id);
                return (
                  <AktivitaetCard
                    key={activity.id}
                    activity={activity}
                    katalog={katalog}
                    index={idx}
                    canEdit={canEdit}
                    onDelete={(act) => setDeleteTarget({ id: act.id, name: katalog?.name || 'Aktivität' })}
                    onGoToTaskWorkshop={onGoToTaskWorkshop}
                  />
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      <DeleteActivityConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isDeleting={deleteMutation.isPending}
        activityName={deleteTarget?.name}
      />
    </DragDropContext>
  );
}