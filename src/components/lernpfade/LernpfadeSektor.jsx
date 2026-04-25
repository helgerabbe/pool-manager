/**
 * LernpfadeSektor.jsx
 *
 * Eine Sektor-Karte im Lernpfad-Architekt.
 * - Bearbeitbarer Titel.
 * - Toggle für Modus ("sequenziell" ↔ "frei").
 * - Droppable-Bereich für Aufgaben (per @hello-pangea/dnd).
 * - Pro Aufgabe ein "X"-Button zum Entfernen.
 */

import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, X, ListOrdered, Shuffle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';

function ModusToggle({ modus, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-[11px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange?.('sequenziell')}
        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
          modus === 'sequenziell'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <ListOrdered className="w-3 h-3" /> Sequenziell
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange?.('frei')}
        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
          modus === 'frei'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <Shuffle className="w-3 h-3" /> Frei
      </button>
    </div>
  );
}

function AufgabePill({ aufgabe, aufgabeId, index, onRemove, disabled }) {
  // Fallback, falls die Aufgabe (noch) nicht im Cache ist.
  const titel = aufgabe?.titel || 'Aufgabe';
  const typMeta = getAufgabenTyp(aufgabe?.aufgaben_typ);
  const Icon = typMeta.icon;

  return (
    <Draggable draggableId={`pfad-${aufgabeId}`} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40' : 'border-border'
          }`}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <div className={`w-5 h-5 rounded ${typMeta.color.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3 h-3 ${typMeta.color.iconText}`} />
          </div>
          <span className="flex-1 min-w-0 truncate">
            {aufgabe ? titel : <span className="italic text-muted-foreground">Unbekannte Aufgabe</span>}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove?.(aufgabeId)}
              title="Aus Pfad entfernen"
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function LernpfadeSektor({
  sektor,
  index,
  aufgabenById,
  readOnly,
  onPatch,
  onRemove,
  onRemoveAufgabe,
}) {
  const aufgabenIds = sektor.aufgaben_ids || [];

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
          Sektor {index + 1}
        </span>
        <Input
          value={sektor.titel || ''}
          placeholder="Titel des Sektors"
          onChange={(e) => onPatch?.(sektor.sektor_id, { titel: e.target.value })}
          disabled={readOnly}
          className="h-7 text-sm flex-1 min-w-[140px]"
        />
        <ModusToggle
          modus={sektor.modus || 'sequenziell'}
          onChange={(m) => onPatch?.(sektor.sektor_id, { modus: m })}
          disabled={readOnly}
        />
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove?.(sektor.sektor_id)}
            className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Sektor löschen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Droppable Aufgaben-Liste */}
      <Droppable droppableId={`sektor-${sektor.sektor_id}`} type="AUFGABE" isDropDisabled={readOnly}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[48px] rounded-md border border-dashed p-2 space-y-1.5 transition-colors ${
              snapshot.isDraggingOver
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30'
            }`}
          >
            {aufgabenIds.length === 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1 px-1">
                <Plus className="w-3 h-3" />
                Aufgaben aus dem Pool hierher ziehen.
              </div>
            )}
            {aufgabenIds.map((aId, idx) => (
              <AufgabePill
                key={aId}
                aufgabeId={aId}
                aufgabe={aufgabenById?.get(aId)}
                index={idx}
                onRemove={onRemoveAufgabe}
                disabled={readOnly}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}