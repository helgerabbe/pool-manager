import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Farben für Themenfelder ──
const THEMENFELD_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
];

function getThemenfeldColor(index) {
  return THEMENFELD_COLORS[index % THEMENFELD_COLORS.length];
}

// ── Draggable Lernziel Item ──
function DraggableLernzielItem({ lernziel, themenfeldColor, isHighlighted }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lz-${lernziel.id}`,
    data: { type: 'lernziel', lernziel },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-start gap-2 p-2 rounded border cursor-grab active:cursor-grabbing transition-all text-left',
        isDragging
          ? 'opacity-60 ring-2 ring-primary shadow-lg'
          : isHighlighted
            ? 'bg-primary/10 border-primary/50'
            : 'bg-white hover:bg-muted border-border'
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">
          {lernziel.formulierung_fachsprache}
        </p>
        {lernziel.kategorie && (
          <Badge
            variant="secondary"
            className={cn('text-[10px] h-5', themenfeldColor)}
          >
            {lernziel.kategorie}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Collapsible Lernpaket ──
function LernpaketCollapsible({
  lernpaket,
  lernziele,
  themenfeldColor,
  isOpen,
  onToggle,
  searchTerm,
  highlightedLernzielIds,
}) {
  const hasMatches = searchTerm
    ? lernziele.some(
        (lz) =>
          lz.formulierung_fachsprache
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          lernpaket.titel_des_pakets
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
    : true;

  if (!hasMatches && searchTerm) return null;

  const filteredLernziele =
    searchTerm && lernziele.length > 0
      ? lernziele.filter((lz) =>
          lz.formulierung_fachsprache
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      : lernziele;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(lernpaket.id)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/60 transition-colors border-b',
          isOpen ? 'bg-muted/40 border-border' : 'bg-white border-border'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform',
              isOpen && 'rotate-0',
              !isOpen && '-rotate-90'
            )}
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {lernpaket.titel_des_pakets}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            ({filteredLernziele.length})
          </span>
        </div>
      </button>

      {isOpen && filteredLernziele.length > 0 && (
        <div className="p-2 space-y-1.5 bg-white">
          {filteredLernziele.map((lz) => (
            <DraggableLernzielItem
              key={lz.id}
              lernziel={lz}
              themenfeldColor={themenfeldColor}
              isHighlighted={highlightedLernzielIds.has(lz.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Collapsible Themenfeld ──
function ThemenfeldCollapsible({
  themenfeld,
  lernpakete,
  lernziele,
  isOpen,
  onToggle,
  searchTerm,
  highlightedLernzielIds,
  themenfeldColor,
}) {
  const [openLernpakete, setOpenLernpakete] = useState(new Set());

  // Auto-expand Lernpakete bei Search
  useEffect(() => {
    if (searchTerm) {
      const toOpen = new Set();
      lernpakete.forEach((paket) => {
        const hasMatches = lernziele
          .filter((lz) => lz.lernpaket_id === paket.id)
          .some(
            (lz) =>
              lz.formulierung_fachsprache
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              paket.titel_des_pakets
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          );
        if (hasMatches) toOpen.add(paket.id);
      });
      setOpenLernpakete(toOpen);
    } else {
      setOpenLernpakete(new Set());
    }
  }, [searchTerm, lernpakete, lernziele]);

  const hasMatches =
    !searchTerm ||
    lernpakete.some((paket) =>
      lernziele
        .filter((lz) => lz.lernpaket_id === paket.id)
        .some(
          (lz) =>
            lz.formulierung_fachsprache
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            paket.titel_des_pakets
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        )
    );

  if (!hasMatches) return null;

  const themenfeldLernpakete = lernpakete.filter(
    (p) => p.themenfeld_id === themenfeld.id
  );

  if (themenfeldLernpakete.length === 0) return null;

  return (
    <div className="border-l-4 pl-3 space-y-2" style={{ borderLeftColor: themenfeldColor }}>
      <button
        onClick={() => onToggle(themenfeld.id)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded transition-colors',
          isOpen ? 'bg-amber-50' : 'hover:bg-amber-50/50'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-amber-700 shrink-0 transition-transform',
              isOpen && 'rotate-0',
              !isOpen && '-rotate-90'
            )}
          />
          <span className="text-xs font-semibold text-amber-900 truncate">
            {themenfeld.titel}
          </span>
          <span className="text-[10px] text-amber-700/60 shrink-0">
            ({themenfeldLernpakete.length})
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-2">
          {themenfeldLernpakete.map((paket) => (
            <LernpaketCollapsible
              key={paket.id}
              lernpaket={paket}
              lernziele={lernziele.filter((lz) => lz.lernpaket_id === paket.id)}
              themenfeldColor={themenfeldColor}
              isOpen={openLernpakete.has(paket.id)}
              onToggle={(paketId) => {
                setOpenLernpakete((prev) => {
                  const next = new Set(prev);
                  if (next.has(paketId)) {
                    next.delete(paketId);
                  } else {
                    next.add(paketId);
                  }
                  return next;
                });
              }}
              searchTerm={searchTerm}
              highlightedLernzielIds={highlightedLernzielIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Component ──
export default function UnitWideLernzielSource({
  einheitId,
  currentAufgabeThemenfeldId,
  highlightedLernzielIds = new Set(),
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openThemenfelder, setOpenThemenfelder] = useState(new Set());

  // Auto-expand das Themenfeld der aktuellen Aufgabe
  useEffect(() => {
    if (currentAufgabeThemenfeldId) {
      setOpenThemenfelder(new Set([currentAufgabeThemenfeldId]));
    }
  }, [currentAufgabeThemenfeldId]);

  // Fetch Daten
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () =>
      base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });

  // Sortierte Themenfelder
  const sortedThemenfelder = useMemo(
    () => [...themenfelder].sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
    [themenfelder]
  );

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Suchfeld */}
      <div className="shrink-0 px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Suchen…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Hierarchie-Liste */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {sortedThemenfelder.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Keine Themenfelder vorhanden
          </p>
        ) : (
          sortedThemenfelder.map((tf, idx) => (
            <ThemenfeldCollapsible
              key={tf.id}
              themenfeld={tf}
              lernpakete={lernpakete.filter(
                (p) => p.einheit_id === einheitId && p.themenfeld_id === tf.id
              )}
              lernziele={alleLernziele}
              isOpen={openThemenfelder.has(tf.id)}
              onToggle={(tfId) => {
                setOpenThemenfelder((prev) => {
                  const next = new Set(prev);
                  if (next.has(tfId)) {
                    next.delete(tfId);
                  } else {
                    next.add(tfId);
                  }
                  return next;
                });
              }}
              searchTerm={searchTerm}
              highlightedLernzielIds={highlightedLernzielIds}
              themenfeldColor={getThemenfeldColor(idx)}
            />
          ))
        )}
      </div>

      {/* Info-Zeile */}
      <div className="shrink-0 px-3 pb-2 text-[10px] text-muted-foreground border-t pt-2">
        {alleLernziele.length} Kompetenzen in {sortedThemenfelder.length} Feldern
      </div>
    </div>
  );
}