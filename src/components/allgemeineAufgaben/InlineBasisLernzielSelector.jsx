import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVertical, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline Basis-Lernziel-Auswahl für die linke Spalte des Kompetenzen-Tabs.
 *
 * Basis-Lernziele werden – wie die regulären Einheits-Lernziele – per Drag &
 * Drop in die Dropzone gezogen. Die Drop-Logik liegt im Parent
 * (AufgabeKompetenzMapping), der anhand des draggableId-Präfixes "basis-"
 * erkennt, dass ein Basis-Mapping (statt eines normalen Lernziel-Mappings)
 * angelegt werden muss.
 *
 * `mappedBasisIds` (vom Parent gepflegt) blendet bereits zugeordnete Ziele
 * optisch aus, damit dieselbe Karte nicht zweimal in der Quell-Liste auftaucht.
 */
export default function InlineBasisLernzielSelector({
  einheitFach,
  mappedBasisIds = new Set(),
  draggableIndexOffset = 0,
}) {
  const [selectedModul, setSelectedModul] = useState('');
  const [expandedPakete, setExpandedPakete] = useState(new Set());

  // Daten laden – Basismodule sind Einheiten mit ist_basismodul=true;
  // ihre Lernziele sind reguläre Lernziele in Lernpaketen.
  const { data: basismodule = [] } = useQuery({
    queryKey: ['basismodul-einheiten'],
    queryFn: () => base44.entities.Einheiten.filter({ ist_basismodul: true }),
  });

  const { data: allPakete = [] } = useQuery({
    queryKey: ['basismodul-lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list('-created_date', 500),
  });

  const { data: allLernziele = [] } = useQuery({
    queryKey: ['basismodul-lernziele'],
    queryFn: () => base44.entities.Lernziele.list('-created_date', 1000),
  });

  // Gefilterte Module nach dem Fach der Einheit
  const filteredModule = useMemo(() => {
    if (!einheitFach) return [];
    return basismodule.filter((m) => m.fach === einheitFach);
  }, [basismodule, einheitFach]);

  // Pakete für das gewählte Modul
  const modulPakete = useMemo(() => {
    if (!selectedModul) return [];
    return allPakete
      .filter((p) => p.einheit_id === selectedModul)
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
  }, [allPakete, selectedModul]);

  // Lernziele für jedes Paket (bereits zugeordnete ausblenden)
  const paketMitLernzielen = useMemo(() => {
    return modulPakete.map((paket) => ({
      paket,
      lernziele: allLernziele
        .filter((lz) => lz.lernpaket_id === paket.id && !mappedBasisIds.has(lz.id))
        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
    }));
  }, [modulPakete, allLernziele, mappedBasisIds]);

  const togglePaket = (paketId) => {
    const newExpanded = new Set(expandedPakete);
    if (newExpanded.has(paketId)) {
      newExpanded.delete(paketId);
    } else {
      newExpanded.add(paketId);
    }
    setExpandedPakete(newExpanded);
  };

  // Globaler Index-Counter für Draggable-Indizes (muss innerhalb der Source-
  // Droppable eindeutig sein – inkl. Offset für die regulären Lernziele oben).
  let runningIndex = draggableIndexOffset;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Basis-Vorwissen</h4>

      {/* Basismodul Dropdown */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Basismodul</label>
        <Select
          value={selectedModul}
          onValueChange={setSelectedModul}
          disabled={!einheitFach || filteredModule.length === 0}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Modul wählen..." />
          </SelectTrigger>
          <SelectContent>
            {filteredModule.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.titel_der_einheit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filteredModule.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Keine Basismodule für {einheitFach} verfügbar
          </p>
        )}
      </div>

      {/* Akkordeons mit draggable Lernzielen */}
      {selectedModul && (
        <div className="space-y-1.5">
          {paketMitLernzielen.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Keine Lernpakete vorhanden
            </p>
          ) : (
            paketMitLernzielen
              .filter((group) => group.lernziele.length > 0)
              .map((group) => {
                const isOpen = expandedPakete.has(group.paket.id);
                return (
                  <div key={group.paket.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => togglePaket(group.paket.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-xs font-semibold text-blue-800 text-left">
                        {group.paket.titel_des_pakets}
                      </span>
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 text-blue-600 transition-transform shrink-0',
                          isOpen && 'rotate-90'
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="p-2 bg-white space-y-1.5">
                        {group.lernziele.map((lz) => {
                          const idx = runningIndex++;
                          return (
                            <Draggable
                              key={lz.id}
                              draggableId={`basis-${lz.id}`}
                              index={idx}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    'flex items-start gap-2 p-2 rounded border cursor-grab active:cursor-grabbing transition-all',
                                    snapshot.isDragging
                                      ? 'opacity-50 ring-2 ring-primary bg-white'
                                      : 'bg-white hover:bg-blue-50/50 border-blue-100'
                                  )}
                                >
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0 text-xs">
                                    <p className="font-medium leading-snug">{lz.formulierung_fachsprache}</p>
                                    <Badge variant="secondary" className="text-[10px] mt-1">
                                      Vorwissen
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}