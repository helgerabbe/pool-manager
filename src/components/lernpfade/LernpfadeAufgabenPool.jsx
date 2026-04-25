/**
 * LernpfadeAufgabenPool.jsx
 *
 * Linke Spalte des Lernpfad-Cockpits (Tab 7).
 * - Oben: Monitor-Panel (fixiert, zeigt später Detail-Infos zur ausgewählten Aufgabe).
 * - Unten: Scrollbare Liste der Aufgaben aus Ebene 2 + 3, gefiltert nach aufgaben_typ.
 *   sync_status === 'to_delete' wird ausgeblendet.
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { AUFGABEN_TYPEN, AUFGABEN_TYPEN_ORDER, getAufgabenTyp } from '@/lib/aufgabenTypen';
import { Loader2, Inbox, Eye, CheckCircle2 } from 'lucide-react';
import MonitorPanel from '@/components/lernpfade/MonitorPanel';

// ── Helfer ──────────────────────────────────────────────────────────────
function FilterChip({ typKey, active, count, onClick }) {
  const meta = AUFGABEN_TYPEN[typKey];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
        active
          ? `${meta.color.bgSolid} ${meta.color.textOn} border-transparent shadow-sm`
          : `bg-white ${meta.color.text} ${meta.color.border}/40 hover:${meta.color.bg}`
      }`}
    >
      <Icon className="w-3 h-3" />
      <span>{meta.short}</span>
      <span className={`text-[10px] px-1 rounded-full ${active ? 'bg-white/30' : 'bg-muted'}`}>
        {count}
      </span>
    </button>
  );
}

/**
 * Eine Aufgaben-Karte im Pool.
 * - Wenn `isUsed` true ist: visuell abgegraut, Checkmark sichtbar, Drag deaktiviert.
 * - Sonst: voll greifbar (DnD-Quelle).
 */
function AufgabeListItem({ aufgabe, index, isSelected, isUsed, onClick }) {
  const typMeta = getAufgabenTyp(aufgabe.aufgaben_typ);
  const Icon = typMeta.icon;

  return (
    <Draggable draggableId={aufgabe.id} index={index} isDragDisabled={isUsed}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          title={isUsed ? 'Bereits in diesem Lernpfad' : 'Ziehen, um in den Pfad einzusortieren'}
          className={`w-full text-left rounded-lg p-2.5 border transition-all flex items-start gap-2 cursor-pointer ${
            isUsed
              ? 'border-border bg-muted/40 opacity-50 cursor-not-allowed'
              : isSelected
                ? `${typMeta.color.border} ${typMeta.color.bg} shadow-sm`
                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30'
          } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 bg-card' : ''}`}
        >
          <div className={`w-7 h-7 rounded-md ${typMeta.color.iconBg} flex items-center justify-center shrink-0 ${isUsed ? 'grayscale' : ''}`}>
            <Icon className={`w-3.5 h-3.5 ${typMeta.color.iconText}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate leading-snug">
              {aufgabe.titel || 'Ohne Titel'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold ${typMeta.color.text}`}>
                {typMeta.short}
              </span>
              {aufgabe.anforderungsebene && (
                <>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {aufgabe.anforderungsebene.replace(' - ', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
          {isUsed && (
            <div
              className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5"
              title="Bereits im Pfad"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Im Pfad</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── Hauptkomponente ──────────────────────────────────────────────────────
export default function LernpfadeAufgabenPool({
  einheitId,
  usedAufgabenIds = new Set(),
  selectedAufgabe = null,
  onSelectAufgabe,
  onPreviewAufgabe,
}) {
  const [activeFilters, setActiveFilters] = useState(new Set(AUFGABEN_TYPEN_ORDER));

  const { data: alleAufgaben = [], isLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => (einheitId ? getAufgabenByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  // Pool: Ebene 2 + 3, ohne Tombstones.
  const poolAufgaben = useMemo(() => {
    return (alleAufgaben || []).filter((a) => {
      if (a.sync_status === 'to_delete') return false;
      const ebene = a.anforderungsebene;
      return ebene === '2 - Transfer' || ebene === '3 - Projekt';
    });
  }, [alleAufgaben]);

  const counts = useMemo(() => {
    const c = { inhalt: 0, buendel: 0, prozess: 0, projekt_anker: 0 };
    poolAufgaben.forEach((a) => {
      const typ = a.aufgaben_typ || 'inhalt';
      if (c[typ] !== undefined) c[typ] += 1;
    });
    return c;
  }, [poolAufgaben]);

  const filteredAufgaben = useMemo(() => {
    return poolAufgaben.filter((a) => activeFilters.has(a.aufgaben_typ || 'inhalt'));
  }, [poolAufgaben, activeFilters]);

  const selectedAufgabeId = selectedAufgabe?.id || null;

  const toggleFilter = (typKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(typKey)) next.delete(typKey);
      else next.add(typKey);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Monitor (oben, fixiert) */}
      <div className="shrink-0 p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Monitor</h3>
        </div>
        <MonitorPanel aufgabe={selectedAufgabe} onPreviewClick={onPreviewAufgabe} />
      </div>

      {/* Filter-Chips */}
      <div className="shrink-0 p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Material-Pool</h3>
          <span className="text-[10px] text-muted-foreground">{filteredAufgaben.length} sichtbar</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AUFGABEN_TYPEN_ORDER.map((typKey) => (
            <FilterChip
              key={typKey}
              typKey={typKey}
              active={activeFilters.has(typKey)}
              count={counts[typKey] || 0}
              onClick={() => toggleFilter(typKey)}
            />
          ))}
        </div>
      </div>

      {/* Liste (scrollbar) – Droppable als Drag-Quelle */}
      <Droppable droppableId="pool" type="AUFGABE" isDropDisabled>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Aufgaben…
              </div>
            ) : filteredAufgaben.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 px-2">
                <Inbox className="w-7 h-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {poolAufgaben.length === 0
                    ? 'Keine Aufgaben in Ebene 2/3 vorhanden.'
                    : 'Kein Treffer – passe die Filter an.'}
                </p>
              </div>
            ) : (
              filteredAufgaben.map((a, idx) => (
                <AufgabeListItem
                  key={a.id}
                  aufgabe={a}
                  index={idx}
                  isSelected={selectedAufgabeId === a.id}
                  isUsed={usedAufgabenIds.has(a.id)}
                  onClick={() => onSelectAufgabe?.(a.id)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}