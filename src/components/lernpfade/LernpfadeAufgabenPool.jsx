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
import { getThemenfelderByEinheit } from '@/services/ThemenfeldService';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';
import { adaptLernpaketToPoolItem } from '@/lib/lernpaketAdapter';
import { Loader2, Inbox, CheckCircle2, BookOpen, Sparkles, Folder, Pencil, Rocket } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MonitorPanel from '@/components/lernpfade/MonitorPanel';
import SystemBausteinPoolItem from '@/components/lernpfade/SystemBausteinPoolItem';

// ── Filter-Gruppen (Pool-UI) ──────────────────────────────────────────────
// Hybrid-Filterlogik: Wir prüfen NICHT mehr nur den DB-Typ, sondern verwenden
// für jede Gruppe einen Prädikat-Match. So fallen auch unsaubere Datensätze
// (z. B. aufgaben_typ='inhalt' MIT anforderungsebene='3 - Projekt') in den
// richtigen Tab.
const isProjekt = (item) =>
  item.aufgaben_typ === 'projekt_anker' ||
  String(item.anforderungsebene || '').includes('Projekt');

const FILTER_GROUPS = [
  {
    key: 'lernpakete',
    label: 'Lernpakete',
    icon: Folder,
    color: 'bg-blue-500 text-white border-blue-500',
    inactive: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50',
    matches: (item) => item.aufgaben_typ === 'buendel' || item.typ === 'buendel',
  },
  {
    key: 'aufgaben',
    label: 'Aufgaben',
    icon: Pencil,
    color: 'bg-amber-500 text-white border-amber-500',
    inactive: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
    matches: (item) =>
      ['inhalt', 'handlung', 'auswahl_buendel'].includes(item.aufgaben_typ) &&
      !isProjekt(item),
  },
  {
    key: 'projekte',
    label: 'Projekte',
    icon: Rocket,
    color: 'bg-violet-500 text-white border-violet-500',
    inactive: 'bg-white text-violet-700 border-violet-200 hover:bg-violet-50',
    matches: isProjekt,
  },
];
const FILTER_GROUP_KEYS = FILTER_GROUPS.map((g) => g.key);

/**
 * Liefert den FILTER_GROUPS-Key, in den ein Item gehört, oder null.
 * Reihenfolge ist relevant: zuerst Lernpaket, dann Projekt, dann Aufgaben.
 * Damit verhalten sich der Counter, der Filter und das Label exakt gleich.
 */
function getGroupKeyForItem(item) {
  for (const g of FILTER_GROUPS) {
    if (g.matches(item)) return g.key;
  }
  return null;
}

// Inline-Suffix für Lernpaket-Sondervarianten. `standard` bleibt bewusst leer
// (Standard-Pakete benötigen keine Auszeichnung). Die übrigen Varianten werden
// als dezenter Klammerzusatz an den Titel gehängt – ohne Extra-Zeile.
const LERNPAKET_LOGIK_INLINE = {
  standard: null,
  fast_track: 'Fast-Track',
  wissensspeicher: 'Wissensspeicher',
  test_only: 'Zwischentest',
};

function FilterChip({ group, active, count, onClick }) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
        active ? `${group.color} shadow-sm` : group.inactive
      }`}
    >
      <Icon className="w-3 h-3" />
      <span>{group.label}</span>
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
  const isBuendel = aufgabe.aufgaben_typ === 'buendel';
  const isZwischentest = isBuendel && aufgabe.lernpaket_logik === 'test_only';
  const inlineSuffix = isBuendel ? LERNPAKET_LOGIK_INLINE[aufgabe.lernpaket_logik] : null;

  // Alle Pool-Karten sind ab jetzt einzeilig: [Icon] Titel. Untertitel
  // (Aufgabentyp / Anforderungsebene / "Lernpaket") werden nicht mehr gerendert.

  // Zwischentests: Icon-Box dezent rosa (statt Standard-Blau) + sehr leichte
  // Karten-Tönung. Höhe bleibt identisch.
  const buendelIconBox = isZwischentest ? 'bg-rose-100' : typMeta.color.iconBg;
  const buendelIconColor = isZwischentest ? 'text-rose-600' : typMeta.color.iconText;
  const buendelTint = isZwischentest && !isUsed && !isSelected ? 'bg-rose-50/60' : '';

  return (
    <Draggable draggableId={aufgabe.id} index={index} isDragDisabled={isUsed}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          title={isUsed ? 'Bereits in diesem Lernpfad' : 'Ziehen, um in den Pfad einzusortieren'}
          className={`w-full text-left rounded-lg py-1.5 px-2 border transition-all flex items-center gap-2 cursor-pointer ${
            isUsed
              ? 'border-border bg-muted/40 opacity-50 cursor-not-allowed'
              : isSelected
                ? `${typMeta.color.border} ${typMeta.color.bg} shadow-sm`
                : `border-border ${buendelTint || 'bg-card'} hover:border-primary/30 hover:bg-muted/30`
          } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 bg-card' : ''}`}
        >
          <div className={`w-6 h-6 rounded ${isBuendel ? buendelIconBox : typMeta.color.iconBg} flex items-center justify-center shrink-0 ${isUsed ? 'grayscale' : ''}`}>
            <Icon className={`w-3 h-3 ${isBuendel ? buendelIconColor : typMeta.color.iconText}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate leading-snug">
              {aufgabe.titel || 'Ohne Titel'}
              {inlineSuffix && (
                <span className="ml-1 text-muted-foreground font-normal">({inlineSuffix})</span>
              )}
            </p>
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
  // Reiter-Verhalten: genau eine Gruppe ist aktiv.
  const [activeFilter, setActiveFilter] = useState('aufgaben');
  const [activeTab, setActiveTab] = useState('aufgaben');

  const { data: alleAufgaben = [], isLoading: loadingAufgaben } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => (einheitId ? getAufgabenByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  // Lernpakete sind eine eigenständige Collection. Wir laden sie zusätzlich und
  // adaptieren sie über `adaptLernpaketToPoolItem` auf das Aufgaben-Shape, damit
  // sie überall im Pool/Sektor identisch wie buendel-Aufgaben verarbeitet werden.
  const { data: lernpakete = [], isLoading: loadingLernpakete } = useQuery({
    queryKey: ['lernpakete-by-einheit', einheitId],
    queryFn: () =>
      einheitId
        ? base44.entities.Lernpakete.filter({ einheit_id: einheitId })
        : Promise.resolve([]),
    enabled: !!einheitId,
  });

  // Themenfelder dieser Einheit (nur für Gruppierungs-Reihenfolge + Titel).
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder-by-einheit', einheitId],
    queryFn: () => (einheitId ? getThemenfelderByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  const { data: systemBausteine = [], isLoading: loadingBausteine } = useQuery({
    queryKey: ['systemBausteine', 'aktiv'],
    queryFn: async () => {
      const list = await base44.entities.SystemBausteine.list('reihenfolge');
      return (list || []).filter((b) => b.ist_aktiv !== false);
    },
  });

  // Pool: Aufgaben + adaptierte Lernpakete in eine gemeinsame Liste mischen.
  // Tombstones (sync_status === 'to_delete') werden in beiden Quellen gefiltert.
  const poolAufgaben = useMemo(() => {
    const adaptedLernpakete = (lernpakete || [])
      .filter((lp) => lp.sync_status !== 'to_delete')
      .map(adaptLernpaketToPoolItem);
    const aufgabenItems = (alleAufgaben || []).filter(
      (a) => a.sync_status !== 'to_delete' && getGroupKeyForItem(a) !== null
    );
    return [...adaptedLernpakete, ...aufgabenItems];
  }, [alleAufgaben, lernpakete]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTER_GROUP_KEYS.map((k) => [k, 0]));
    poolAufgaben.forEach((a) => {
      const groupKey = getGroupKeyForItem(a);
      if (groupKey) c[groupKey] += 1;
    });
    return c;
  }, [poolAufgaben]);

  const filteredAufgaben = useMemo(() => {
    return poolAufgaben.filter((a) => getGroupKeyForItem(a) === activeFilter);
  }, [poolAufgaben, activeFilter]);

  // Themenfeld-Gruppierung für „Lernpakete" und „Aufgaben". „Projekte" bleibt
  // bewusst flach (siehe Spec). Reihenfolge der Gruppen folgt den Themenfeldern
  // der Einheit; Items ohne themenfeld_id landen in einer Sammelgruppe am Ende.
  const groupedAufgaben = useMemo(() => {
    if (activeFilter === 'projekte') return null;

    const sortedTfs = [...themenfelder].sort(
      (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
    );
    const groups = sortedTfs.map((tf) => ({
      id: tf.id,
      titel: tf.titel || 'Themenfeld',
      items: [],
    }));
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const ungrouped = { id: '__none__', titel: 'Nicht zugeordnet', items: [] };

    filteredAufgaben.forEach((a) => {
      const tfId = a.themenfeld_id;
      const target = (tfId && groupById.get(tfId)) || ungrouped;
      target.items.push(a);
    });

    const result = groups.filter((g) => g.items.length > 0);
    if (ungrouped.items.length > 0) result.push(ungrouped);
    return result;
  }, [filteredAufgaben, themenfelder, activeFilter]);

  const selectedAufgabeId = selectedAufgabe?.id || null;
  const selectedBausteinId = selectedSystemBaustein?.baustein_id || null;

  // Reiter-Klick: setzt die aktive Gruppe (kein Toggle-Off).
  const selectFilter = (groupKey) => setActiveFilter(groupKey);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Monitor (oben, fixiert; eigene max-Höhe + internes Scrolling im Panel) */}
      <div className="shrink-0 p-3 border-b border-border bg-muted/30">
        <MonitorPanel
          aufgabe={selectedAufgabe}
          systemBaustein={selectedSystemBaustein}
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
              {FILTER_GROUPS.map((group) => (
                <FilterChip
                  key={group.key}
                  group={group}
                  active={activeFilter === group.key}
                  count={counts[group.key] || 0}
                  onClick={() => selectFilter(group.key)}
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
                {(loadingAufgaben || loadingLernpakete) ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Material…
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
                ) : groupedAufgaben ? (
                  // Gruppierte Darstellung (Lernpakete & Aufgaben).
                  // WICHTIG: Draggable-Indizes müssen über das gesamte Droppable
                  // fortlaufend sein – wir zählen daher global durch.
                  (() => {
                    let runningIdx = 0;
                    return groupedAufgaben.map((group) => (
                      <div key={group.id} className="space-y-1">
                        <div className="-mx-3 px-3 py-1 bg-muted/60 border-y border-border/50">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.titel}
                            <span className="ml-1.5 font-normal opacity-70">({group.items.length})</span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          {group.items.map((a) => {
                            const idx = runningIdx++;
                            return (
                              <AufgabeListItem
                                key={a.id}
                                aufgabe={a}
                                index={idx}
                                isSelected={selectedAufgabeId === a.id}
                                isUsed={usedAufgabenIds.has(a.id)}
                                onClick={() => onSelectAufgabe?.(a.id)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()
                ) : (
                  // Flache Darstellung (nur Projekte).
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