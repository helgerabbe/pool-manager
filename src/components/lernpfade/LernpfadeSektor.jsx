/**
 * LernpfadeSektor.jsx
 *
 * Eine Sektor-Karte im Lernpfad-Architekt.
 * - Bearbeitbarer Titel.
 * - Toggle für Modus ("sequenziell" ↔ "frei").
 * - Droppable-Bereich für Items (per @hello-pangea/dnd).
 * - Item-Rendering ist typgesteuert:
 *     • type === 'aufgabe' → AufgabePill
 *     • type === 'system'  → SystemBausteinPill
 *
 * Hinweis (Phase 2): Der Legacy-Fallback auf `sektor.aufgaben_ids` wurde
 * planmäßig entfernt — die Lazy-Migration in `lernpfadeUtils` stellt sicher,
 * dass beim Lesen UND Schreiben ausschließlich das `items`-Array verwendet
 * wird. Falls in der DB noch alte Datensätze liegen, werden sie beim ersten
 * Zugriff durch `normalizeSektor` transparent migriert, bevor sie hier
 * ankommen.
 */

import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, X, ListOrdered, Shuffle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAufgabenTyp, ITEM_TYPE } from '@/lib/aufgabenTypen';
import SystemBausteinPill from '@/components/lernpfade/SystemBausteinPill';
import AmpelBadge from '@/components/lernpfade/AmpelBadge';

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

// Dynamische Lernpaket-Variante je nach Lerntyp ("Chamäleon-Logik").
// Nur reguläre Lernpakete (buendel) zeigen ein Varianten-Label;
// Zwischentests (test_only) sind statisch und bekommen keines.
const LERNTYP_VARIANTE = {
  minimalist: { label: 'Standard', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  pragmatiker: { label: 'Fast-Track', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  ehrgeizig: { label: 'Fast-Track', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  passioniert: { label: 'Wissensspeicher', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
};

function AufgabePill({ aufgabe, refId, sektorId, index, onRemove, onSelect, isSelected, disabled, ampelStatus, onOpenEditor, activeLernTyp }) {
  // Fallback, falls die Aufgabe (noch) nicht im Cache ist.
  const titel = aufgabe?.titel || 'Aufgabe';
  const typMeta = getAufgabenTyp(aufgabe?.aufgaben_typ);
  const Icon = typMeta.icon;
  const draggableId = `pfaditem-aufgabe-${sektorId}-${index}-${refId}`;

  const isBuendel = aufgabe?.aufgaben_typ === 'buendel';
  const isZwischentest = isBuendel && aufgabe?.lernpaket_logik === 'test_only';
  const variante = isBuendel && !isZwischentest ? LERNTYP_VARIANTE[activeLernTyp] : null;

  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect?.(refId)}
          className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
            isSelected
              ? `${typMeta.color.border} ${typMeta.color.bg} shadow-sm`
              : 'border-border bg-card hover:border-primary/30'
          } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40' : ''}`}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <div className={`w-5 h-5 rounded ${typMeta.color.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3 h-3 ${typMeta.color.iconText}`} />
          </div>
          <span className="flex-1 min-w-0 truncate">
            {aufgabe ? titel : <span className="italic text-muted-foreground">Unbekannte Aufgabe</span>}
          </span>
          {variante && (
            <span
              className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${variante.cls}`}
              title={`Variante: ${variante.label}`}
            >
              {variante.label}
            </span>
          )}
          {isZwischentest && (
            <span
              className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-rose-500 text-white border-rose-600"
              title="Statischer Zwischentest"
            >
              Zwischentest
            </span>
          )}
          {ampelStatus && (
            <AmpelBadge
              status={ampelStatus}
              onFix={onOpenEditor && aufgabe ? () => onOpenEditor(aufgabe) : undefined}
            />
          )}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove?.(refId); }}
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
  systemBausteineById,
  readOnly,
  activeLernTyp,
  onPatch,
  onRemove,
  onRemoveAufgabe,
  onRemoveSystemItem,
  onSelectAufgabe,
  onSelectSystemBaustein,
  selectedAufgabeId,
  selectedSystemBausteinId,
  getAmpelStatusForItem,
  onOpenAufgabeEditor,
}) {
  const items = Array.isArray(sektor.items) ? sektor.items : [];

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

      {/* Droppable Item-Liste */}
      <Droppable droppableId={`sektor-${sektor.sektor_id}`} type="LERNPFAD_ITEM" isDropDisabled={readOnly}>
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
            {items.length === 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1 px-1">
                <Plus className="w-3 h-3" />
                Aufgaben oder Standard-Elemente hierher ziehen.
              </div>
            )}
            {items.map((item, idx) => {
              if (item.type === ITEM_TYPE.SYSTEM) {
                return (
                  <SystemBausteinPill
                    key={`sys-${idx}-${item.ref_id}`}
                    baustein={systemBausteineById?.get(item.ref_id)}
                    refId={item.ref_id}
                    sektorId={sektor.sektor_id}
                    index={idx}
                    isSelected={selectedSystemBausteinId === item.ref_id}
                    disabled={readOnly}
                    onSelect={onSelectSystemBaustein}
                    onRemove={(itemIndex) => onRemoveSystemItem?.(sektor.sektor_id, itemIndex)}
                  />
                );
              }
              return (
                <AufgabePill
                  key={`auf-${idx}-${item.ref_id}`}
                  aufgabe={aufgabenById?.get(item.ref_id)}
                  refId={item.ref_id}
                  sektorId={sektor.sektor_id}
                  index={idx}
                  onRemove={onRemoveAufgabe}
                  onSelect={onSelectAufgabe}
                  isSelected={selectedAufgabeId === item.ref_id}
                  disabled={readOnly}
                  ampelStatus={getAmpelStatusForItem ? getAmpelStatusForItem(item) : undefined}
                  onOpenEditor={onOpenAufgabeEditor}
                  activeLernTyp={activeLernTyp}
                />
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}