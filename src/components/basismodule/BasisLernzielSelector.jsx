import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Link, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FAECHER = [
  'Deutsch',
  'Mathematik',
  'Englisch',
  'Französisch',
  'Latein',
  'Biologie',
  'Chemie',
  'Physik',
  'Geschichte',
  'Geographie',
  'Politik',
  'Wirtschaft',
  'Kunst',
  'Musik',
  'Sport',
  'Religion',
  'Ethik',
  'Informatik',
];

export default function BasisLernzielSelector({ aufgabeId, selectedIds = [] }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFach, setSelectedFach] = useState('');
  const [selectedModul, setSelectedModul] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set(selectedIds));

  // Daten laden
  const { data: basismodule = [] } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => base44.entities.Basismodul.list(),
  });

  const { data: allPakete = [] } = useQuery({
    queryKey: ['basislernpakete'],
    queryFn: () => base44.entities.Basislernpaket.list(),
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

  // Sync DB mit lokalem State beim Öffnen
  useEffect(() => {
    if (isOpen) {
      setCheckedIds(new Set(existingMappings.map((m) => m.basislernziel_id)));
    }
  }, [isOpen, existingMappings]);

  // Gefilterte Module nach Fach
  const filteredModule = useMemo(() => {
    if (!selectedFach) return [];
    return basismodule.filter((m) => m.fach === selectedFach);
  }, [basismodule, selectedFach]);

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
  });

  const deleteMapping = useMutation({
    mutationFn: (mappingId) =>
      base44.entities.AllgemeineAufgabeBasisLernzielMapping.delete(mappingId),
  });

  const handleSave = useCallback(async () => {
    const oldIds = new Set(existingMappings.map((m) => m.basislernziel_id));
    const toAdd = [...checkedIds].filter((id) => !oldIds.has(id));
    const toRemove = [...oldIds].filter((id) => !checkedIds.has(id));

    try {
      // Neue Mappings erstellen
      for (const id of toAdd) {
        await createMapping.mutateAsync({
          aufgabe_id: aufgabeId,
          basislernziel_id: id,
        });
      }

      // Alte Mappings löschen
      for (const id of toRemove) {
        const mapping = existingMappings.find(
          (m) => m.basislernziel_id === id
        );
        if (mapping) {
          await deleteMapping.mutateAsync(mapping.id);
        }
      }

      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeBasisMappings'],
      });
      toast.success('Basiskompetenzen verknüpft');
      setIsOpen(false);
    } catch (err) {
      toast.error('Fehler beim Speichern');
    }
  }, [checkedIds, existingMappings, aufgabeId, createMapping, deleteMapping, queryClient]);

  const handleCheckChange = (lernzielId, checked) => {
    const newChecked = new Set(checkedIds);
    if (checked) {
      newChecked.add(lernzielId);
    } else {
      newChecked.delete(lernzielId);
    }
    setCheckedIds(newChecked);
  };

  // Für die Anzeige: alle verknüpften Lernziele
  const connectedLernziele = useMemo(() => {
    return allLernziele.filter((lz) =>
      existingMappings.some((m) => m.basislernziel_id === lz.id)
    );
  }, [allLernziele, existingMappings]);

  const handleRemoveBadge = async (lernzielId) => {
    const mapping = existingMappings.find(
      (m) => m.basislernziel_id === lernzielId
    );
    if (mapping) {
      await deleteMapping.mutateAsync(mapping.id);
      queryClient.invalidateQueries({
        queryKey: ['allgemeineAufgabeBasisMappings'],
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Trigger Button & Badges */}
      <div className="space-y-2">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Link className="w-3.5 h-3.5" />
          Basiskompetenzen verknüpfen
        </Button>

        {/* Verknüpfte Lernziele als Badges */}
        {connectedLernziele.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {connectedLernziele.map((lz) => (
              <Badge
                key={lz.id}
                variant="secondary"
                className="gap-1.5 pl-2.5 pr-1 py-1 text-xs cursor-pointer group hover:bg-red-100"
                onClick={() => handleRemoveBadge(lz.id)}
              >
                {lz.text}
                <Trash2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Basiskompetenzen verknüpfen</DialogTitle>
            <DialogDescription>
              Wählen Sie Basis-Lernziele, die mit dieser Aufgabe verknüpft sein sollen
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Filter-Bereich */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Fach</label>
                <Select value={selectedFach} onValueChange={setSelectedFach}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Fach wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FAECHER.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Basismodul</label>
                <Select
                  value={selectedModul}
                  onValueChange={setSelectedModul}
                  disabled={!selectedFach}
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
              </div>
            </div>

            {/* Listen-Bereich */}
            <div className="flex-1 overflow-y-auto border rounded-lg bg-muted/20 p-4">
              {!selectedModul ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Wählen Sie ein Fach und Modul, um Lernziele zu sehen
                </div>
              ) : paketMitLernzielen.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Keine Lernpakete in diesem Modul vorhanden
                </div>
              ) : (
                <div className="space-y-4">
                  {paketMitLernzielen.map((group) => (
                    <div key={group.paket.id} className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground/80 px-2">
                        {group.paket.titel}
                      </h4>
                      <div className="space-y-1 pl-4">
                        {group.lernziele.map((lz) => (
                          <div
                            key={lz.id}
                            className="flex items-start gap-2.5 p-2 rounded hover:bg-white/50 transition-colors"
                          >
                            <Checkbox
                              id={`lz-${lz.id}`}
                              checked={checkedIds.has(lz.id)}
                              onCheckedChange={(checked) =>
                                handleCheckChange(lz.id, checked)
                              }
                              className="mt-0.5 shrink-0"
                            />
                            <label
                              htmlFor={`lz-${lz.id}`}
                              className="text-xs leading-relaxed cursor-pointer flex-1 text-foreground/90"
                            >
                              {lz.text}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMapping.isPending || deleteMapping.isPending}
            >
              {createMapping.isPending || deleteMapping.isPending
                ? 'Wird gespeichert...'
                : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}