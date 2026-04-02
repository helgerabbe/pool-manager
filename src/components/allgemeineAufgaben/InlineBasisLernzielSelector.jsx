import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FAECHER = [
  'Deutsch', 'Mathematik', 'Englisch', 'Französisch', 'Latein',
  'Biologie', 'Chemie', 'Physik', 'Geschichte', 'Geographie',
  'Politik', 'Wirtschaft', 'Kunst', 'Musik', 'Sport', 'Religion', 'Ethik', 'Informatik',
];

/**
 * Inline Basis-Lernziel-Auswahl für die linke Spalte des Kompetenzen-Tabs
 * Filtert automatisch nach dem Fach der aktuellen Einheit
 */
export default function InlineBasisLernzielSelector({
  aufgabeId,
  einheitFach,
  onLernzielAdded,
  onLernzielRemoved,
}) {
  const queryClient = useQueryClient();
  const [selectedModul, setSelectedModul] = useState('');
  const [expandedPakete, setExpandedPakete] = useState(new Set());
  const [checkedIds, setCheckedIds] = useState(new Set());

  // Daten laden
  const { data: basismodule = [] } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => base44.entities.Basismodul.list(),
  });

  const { data: allPakete = [] } = useQuery({
    queryKey: ['basislernpakete'],
    queryFn: () => base44.entities.Basislernpakete.list(),
  });

  const { data: allLernziele = [] } = useQuery({
    queryKey: ['basisLernziele'],
    queryFn: () => base44.entities.BasisLernziel.list(),
  });

  const { data: existingMappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeBasisMappings', aufgabeId],
    queryFn: () =>
      base44.entities.AllgemeineAufgabeBasisLernzielMapping.filter({
        aufgabe_id: aufgabeId,
      }),
  });

  // Sync mit DB auf Mount
  useEffect(() => {
    setCheckedIds(new Set(existingMappings.map((m) => m.basislernziel_id)));
  }, [existingMappings]);

  // Gefilterte Module nach dem Fach der Einheit
  const filteredModule = useMemo(() => {
    if (!einheitFach) return [];
    return basismodule.filter((m) => m.fach === einheitFach);
  }, [basismodule, einheitFach]);

  // Pakete für das gewählte Modul
  const modulPakete = useMemo(() => {
    if (!selectedModul) return [];
    return allPakete
      .filter((p) => p.basismodul_id === selectedModul)
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
  }, [allPakete, selectedModul]);

  // Lernziele für jedes Paket
  const paketMitLernzielen = useMemo(() => {
    return modulPakete.map((paket) => ({
      paket,
      lernziele: allLernziele
        .filter((lz) => lz.basislernpaket_id === paket.id)
        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
    }));
  }, [modulPakete, allLernziele]);

  // Mutations
  const createMapping = useMutation({
    mutationFn: (data) =>
      base44.entities.AllgemeineAufgabeBasisLernzielMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeBasisMappings'],
      });
    },
  });

  const deleteMapping = useMutation({
    mutationFn: (mappingId) =>
      base44.entities.AllgemeineAufgabeBasisLernzielMapping.delete(mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeBasisMappings'],
      });
    },
  });

  const handleCheckChange = useCallback(
    async (lernzielId, checked) => {
      const newChecked = new Set(checkedIds);

      try {
        if (checked) {
          newChecked.add(lernzielId);
          await createMapping.mutateAsync({
            aufgabe_id: aufgabeId,
            basislernziel_id: lernzielId,
          });
          onLernzielAdded?.(lernzielId);
        } else {
          newChecked.delete(lernzielId);
          const mapping = existingMappings.find(
            (m) => m.basislernziel_id === lernzielId
          );
          if (mapping) {
            await deleteMapping.mutateAsync(mapping.id);
          }
          onLernzielRemoved?.(lernzielId);
        }
        setCheckedIds(newChecked);
      } catch (err) {
        toast.error('Fehler beim Speichern');
        console.error(err);
      }
    },
    [checkedIds, existingMappings, aufgabeId, createMapping, deleteMapping, onLernzielAdded, onLernzielRemoved]
  );

  const togglePaket = (paketId) => {
    const newExpanded = new Set(expandedPakete);
    if (newExpanded.has(paketId)) {
      newExpanded.delete(paketId);
    } else {
      newExpanded.add(paketId);
    }
    setExpandedPakete(newExpanded);
  };

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
                {m.titel}
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

      {/* Akkordeons mit Lernzielen */}
      {selectedModul && (
        <div className="space-y-1.5">
          {paketMitLernzielen.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Keine Lernpakete vorhanden
            </p>
          ) : (
            paketMitLernzielen.map((group) => (
              <div key={group.paket.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => togglePaket(group.paket.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-xs font-semibold text-amber-800 text-left">
                    {group.paket.titel}
                  </span>
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 text-amber-600 transition-transform shrink-0',
                      expandedPakete.has(group.paket.id) && 'rotate-90'
                    )}
                  />
                </button>

                {expandedPakete.has(group.paket.id) && (
                  <div className="p-2 bg-white space-y-1.5">
                    {group.lernziele.map((lz) => (
                      <div
                        key={lz.id}
                        className="flex items-start gap-2.5 p-2 rounded hover:bg-muted/20 transition-colors"
                      >
                        <Checkbox
                          id={`basis-${lz.id}`}
                          checked={checkedIds.has(lz.id)}
                          onCheckedChange={(checked) =>
                            handleCheckChange(lz.id, checked)
                          }
                          disabled={createMapping.isPending || deleteMapping.isPending}
                          className="mt-0.5 shrink-0"
                        />
                        <label
                          htmlFor={`basis-${lz.id}`}
                          className="text-xs leading-relaxed cursor-pointer flex-1 text-foreground/90"
                        >
                          {lz.text}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}