import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BasislernpaketCard from './BasislernpaketCard';

export default function BasismodulDetail({ basismodul, onDelete }) {
  const queryClient = useQueryClient();
  const [newPaketTitel, setNewPaketTitel] = useState('');
  const [isAddingPaket, setIsAddingPaket] = useState(false);

  const { data: pakete = [] } = useQuery({
    queryKey: ['basislernpakete', basismodul?.id],
    queryFn: () =>
      basismodul?.id
        ? base44.entities.Basislernpaket.filter({ basismodul_id: basismodul.id })
        : Promise.resolve([]),
    enabled: !!basismodul?.id,
  });

  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['basisLernziele'],
    queryFn: () => base44.entities.BasisLernziel.list(),
  });

  const createPaket = useMutation({
    mutationFn: (data) => base44.entities.Basislernpaket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basislernpakete'] });
      setNewPaketTitel('');
      toast.success('Paket hinzugefügt');
    },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });

  const deleteBasismodul = useMutation({
    mutationFn: () => base44.entities.Basismodul.delete(basismodul.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basismodule'] });
      toast.success('Modul gelöscht');
      onDelete?.();
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  const handleAddPaket = async () => {
    if (!newPaketTitel.trim()) return;
    setIsAddingPaket(true);
    try {
      await createPaket.mutateAsync({
        basismodul_id: basismodul.id,
        titel: newPaketTitel.trim(),
        reihenfolge: pakete.length + 1,
      });
    } finally {
      setIsAddingPaket(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddPaket();
    }
  };

  if (!basismodul) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Wählen Sie ein Basismodul aus
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 border-b border-border space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{basismodul.titel}</h2>
            <p className="text-sm text-muted-foreground mt-1">{basismodul.fach}</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteBasismodul.mutate()}
            disabled={deleteBasismodul.isPending}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Löschen
          </Button>
        </div>

        {basismodul.beschreibung && (
          <p className="text-sm text-foreground/80">{basismodul.beschreibung}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Neues Paket hinzufügen */}
        <div className="flex gap-2 mb-6">
          <Input
            type="text"
            placeholder="Neues Basislernpaket eingeben..."
            value={newPaketTitel}
            onChange={(e) => setNewPaketTitel(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAddingPaket}
            className="text-sm h-10"
          />
          <Button
            onClick={handleAddPaket}
            disabled={!newPaketTitel.trim() || isAddingPaket}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Paket
          </Button>
        </div>

        {/* Pakete-Liste */}
        {pakete.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Keine Pakete vorhanden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pakete.map((paket) => {
              const paketLernziele = alleLernziele.filter(
                (lz) => lz.basislernpaket_id === paket.id
              );
              return (
                <BasislernpaketCard
                  key={paket.id}
                  paket={paket}
                  lernziele={paketLernziele}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}