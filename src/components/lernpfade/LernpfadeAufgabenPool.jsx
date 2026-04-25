/**
 * LernpfadeAufgabenPool.jsx
 *
 * Linke Spalte des Lernpfad-Cockpits (Tab 7).
 * - Oben: Monitor-Panel (fixiert, zeigt Detail-Infos zum aktuell selektierten Item).
 * - Mitte: Zwei Reiter
 *     • "Einheit-Aufgaben": gefilterte AllgemeineAufgabe-Liste (Ebene 2/3).
 *     • "Standard-Elemente": globale System-Bausteine.
 * - Unten (jeweils): Filter-Chips bzw. Liste der Items.
 *
 * Quellen:
 *   • Aufgaben → AllgemeineAufgabeService (gefiltert per einheitId).
 *   • System-Bausteine → SystemBausteine-Entität (global, ist_aktiv === true).
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { AUFGABEN_TYPEN, AUFGABEN_TYPEN_ORDER, getAufgabenTyp } from '@/lib/aufgabenTypen';
import { Loader2, Inbox, Eye, CheckCircle2, BookOpen, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MonitorPanel from '@/components/lernpfade/MonitorPanel';
import SystemBausteinPoolItem from '@/components/lernpfade/SystemBausteinPoolItem';

// ── Helfer ──────────────────────────────────────────────────────────────
function FilterChip({ typKey, active, count, onClick }) {
  const meta = AUFGABEN_TYPEN[typKey];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
        active
          ? `${meta.color.bgSolid} ${meta.color.textOn} border-transparent shadow-sm`
          : `bg-white ${meta.color.text} ${meta.color.border}/40 hover:${meta.color.bg}`
      }`}
    >
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
  selectedSystemBaustein = null,
  onSelectAufgabe,
  onSelectSystemBaustein,
  onPreviewAufgabe,
}) {
  const [activeFilters, setActiveFilters] = useState(new Set(AUFGABEN_TYPEN_ORDER));
  const [activeTab, setActiveTab] = useState('aufgaben');

  const { data: alleAufgaben = [], isLoading: loadingAufgaben } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => (einheitId ? getAufgabenByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  const { data: systemBausteine = [], isLoading: loadingBausteine } = useQuery({
    queryKey: ['systemBausteine', 'aktiv'],
    queryFn: async () => {
      const list = await base44.entities.SystemBausteine.list('reihenfolge');
      return (list || []).filter((b) => b.ist_aktiv !== false);
    },
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
  const selectedBausteinId = selectedSystemBaustein?.baustein_id || null;

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
        <MonitorPanel
          aufgabe={selectedAufgabe}
          systemBaustein={selectedSystemBaustein}
          onPreviewClick={onPreviewAufgabe}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-3 pt-2 border-b border-border bg-card">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="aufgaben" className="text-xs gap-1.5">
              <BookOpen className="w-3 h-3" /> Einheit-Aufgaben
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs gap-1.5">
              <Sparkles className="w-3 h-3" /> Standard-Elemente
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Einheit-Aufgaben */}
        <TabsContent value="aufgaben" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
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

          {/* Liste – Droppable als Drag-Quelle */}
          <Droppable droppableId="pool" type="LERNPFAD_ITEM" isDropDisabled>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0"
              >
                {loadingAufgaben ? (
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
        </TabsContent>

        {/* Tab 2: Standard-Elemente (System-Bausteine) */}
        <TabsContent value="system" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
          <div className="shrink-0 p-3 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Standard-Elemente</h3>
              <span className="text-[10px] text-muted-foreground">{systemBausteine.length} verfügbar</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Globale Bausteine. Können beliebig oft gezogen werden.
            </p>
          </div>

          <Droppable droppableId="pool-system" type="LERNPFAD_ITEM" isDropDisabled>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0"
              >
                {loadingBausteine ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Bausteine…
                  </div>
                ) : systemBausteine.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 px-2">
                    <Sparkles className="w-7 h-7 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Keine System-Bausteine vorhanden. Lege sie im Admin-Bereich an.
                    </p>
                  </div>
                ) : (
                  systemBausteine.map((b, idx) => (
                    <SystemBausteinPoolItem
                      key={b.id}
                      baustein={b}
                      index={idx}
                      isSelected={selectedBausteinId === b.baustein_id}
                      onClick={() => onSelectSystemBaustein?.(b.baustein_id)}
                    />
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </TabsContent>
      </Tabs>
    </div>
  );
}