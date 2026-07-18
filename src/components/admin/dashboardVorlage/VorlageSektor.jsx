/**
 * VorlageSektor.jsx
 *
 * Ein Sektor im Standard-Vorlagen-Editor (Verwaltung → Dashboards).
 * Schlanke Variante des Cockpit-Sektors: nur System-Items (Bausteine,
 * Platzhalter, Bündel), keine Ampel, keine Aufgaben, kein Drift.
 *
 * - Droppable nimmt Bausteine aus dem Pool auf bzw. sortiert vorhandene um.
 * - Items sind als Pills mit Icon + Titel + Entfernen-Button dargestellt.
 * - Header erlaubt Titel-Edit, Sektor verschieben (hoch/runter) und löschen.
 */

import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Trash2, GripVertical, X } from 'lucide-react';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { isPlatzhalterBaustein, PLATZHALTER_CLASSES } from '@/lib/platzhalterUtils';
import { getSektorTypLabel, SEKTOR_TYP, getBundleKindByAcceptedTypes } from '@/lib/sektorTypen';
import SektorModusToggle from '@/components/lernpfade/SektorModusToggle';
import BundleModusToggle from '@/components/lernpfade/BundleModusToggle';
import LernpaketInnenModusToggle from '@/components/lernpfade/LernpaketInnenModusToggle';
import SektorFreischaltControl from '@/components/lernpfade/SektorFreischaltControl';

function ItemPill({ item, baustein, index, readOnly, onRemove, onSetBundleModus, onSetLernpaketModus }) {
  const Icon = getSystemBausteinIcon(baustein?.icon);
  const titel = baustein?.titel || item.ref_id;
  const isPlatzhalter = isPlatzhalterBaustein(baustein || item.ref_id);
  const isBundle = baustein?.baustein_modus === 'bundle_1ton';
  // Nur am Lernpaketebündel: zweiter Toggle für die Bearbeitung INNERHALB
  // eines einzelnen Lernpakets (sequenziell | frei).
  const isLernpaketeBundle =
    isBundle && getBundleKindByAcceptedTypes(baustein?.accepted_types) === 'lernpakete';

  let cls;
  if (isBundle) {
    cls = 'border-dashed border-2 border-bundle-border bg-bundle-soft';
  } else if (isPlatzhalter) {
    cls = PLATZHALTER_CLASSES.container;
  } else {
    cls = 'border-slate-200 bg-slate-50';
  }

  const iconBoxCls = isBundle
    ? 'bg-bundle text-bundle-foreground'
    : isPlatzhalter
    ? PLATZHALTER_CLASSES.iconBox
    : 'bg-slate-200';
  const iconCls = isBundle
    ? 'text-bundle-foreground'
    : isPlatzhalter
    ? PLATZHALTER_CLASSES.icon
    : 'text-slate-700';

  return (
    <Draggable draggableId={`vitem-${item.instance_id}`} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-lg py-1.5 px-2 border flex items-center gap-2 ${cls} ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-400 bg-white' : ''
          }`}
        >
          {!readOnly && (
            <span {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/60 shrink-0">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}
          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${iconBoxCls}`}>
            <Icon strokeWidth={2.5} className={`w-3 h-3 ${iconCls}`} />
          </div>
          <p className="text-xs font-semibold text-foreground truncate flex-1 leading-snug">{titel}</p>
          {isBundle && (
            <BundleModusToggle
              acceptedTypes={baustein?.accepted_types}
              modus={item.bundle_config?.modus}
              disabled={readOnly}
              onChange={(val) => onSetBundleModus?.(index, val)}
            />
          )}
          {isLernpaketeBundle && (
            <LernpaketInnenModusToggle
              modus={item.bundle_config?.lernpaket_modus}
              disabled={readOnly}
              onChange={(val) => onSetLernpaketModus?.(index, val)}
            />
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors"
              title="Entfernen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function VorlageSektor({
  sektor,
  index,
  total,
  systemBausteineById,
  readOnly = false,
  onPatch,
  onRemoveSektor,
  onMoveSektor,
  onRemoveItem,
  onSetBundleModus,
  onSetLernpaketModus,
  alleSektoren = [],
}) {
  const items = Array.isArray(sektor.items) ? sektor.items : [];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm" data-sektor-id={sektor.sektor_id}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
          {getSektorTypLabel(sektor.sektor_typ)}
        </span>
        <Input
          value={sektor.titel || ''}
          onChange={(e) => onPatch(sektor.sektor_id, { titel: e.target.value })}
          disabled={readOnly}
          className="h-7 text-sm font-medium flex-1 bg-card"
          placeholder="Sektor-Titel"
        />
        {sektor.sektor_typ !== SEKTOR_TYP.FEEDBACK && (
          <SektorModusToggle
            modus={sektor.modus}
            disabled={readOnly}
            onChange={(val) => onPatch(sektor.sektor_id, { modus: val })}
          />
        )}
        {sektor.sektor_typ !== SEKTOR_TYP.FEEDBACK && (
          <SektorFreischaltControl
            sektor={sektor}
            alleSektoren={alleSektoren}
            disabled={readOnly}
            onChange={(val) => onPatch(sektor.sektor_id, { freischalt_bedingung: val })}
            getSektorLabel={(s) => s.titel?.trim() || getSektorTypLabel(s.sektor_typ)}
            nurVorgaenger
          />
        )}
        {!readOnly && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMoveSektor(sektor.sektor_id, -1)} title="Nach oben">
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMoveSektor(sektor.sektor_id, 1)} title="Nach unten">
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemoveSektor(sektor.sektor_id)} title="Sektor löschen">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Items als Drop-Zone */}
      <Droppable droppableId={`vsektor-${sektor.sektor_id}`} type="VORLAGE_ITEM" isDropDisabled={readOnly}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2.5 space-y-1.5 min-h-[60px] transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
          >
            {items.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-3">
                Bausteine hierher ziehen
              </p>
            )}
            {items.map((item, i) => (
              <ItemPill
                key={item.instance_id || i}
                item={item}
                index={i}
                baustein={systemBausteineById?.get(item.ref_id)}
                readOnly={readOnly}
                onRemove={onRemoveItem ? (idx) => onRemoveItem(sektor.sektor_id, idx) : () => {}}
                onSetBundleModus={onSetBundleModus ? (idx, val) => onSetBundleModus(sektor.sektor_id, idx, val) : undefined}
                onSetLernpaketModus={onSetLernpaketModus ? (idx, val) => onSetLernpaketModus(sektor.sektor_id, idx, val) : undefined}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}