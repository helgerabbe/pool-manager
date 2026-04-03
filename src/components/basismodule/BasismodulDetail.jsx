import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BasislernpaketCard from './BasislernpaketCard';

export default function BasismodulDetail({ basismodul, onDelete }) {
  const queryClient = useQueryClient();
  const [newPaketTitel, setNewPaketTitel] = useState('');
  const [isAddingPaket, setIsAddingPaket] = useState(false);
  const [editingPaketId, setEditingPaketId] = useState(null);
  const [editingPaketTitel, setEditingPaketTitel] = useState('');

  const { data: pakete = [] } = useQuery({
    queryKey: ['basislernpakete', basismodul?.id],
    queryFn: () =>
      basismodul?.id
        ? base44.entities.Basislernpakete.filter({ basismodul_id: basismodul.id })
        : Promise.resolve([]),
    enabled: !!basismodul?.id,
  });

  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['basisLernziele'],
    queryFn: () => base44.entities.BasisLernziel.list(),
  });

  const createPaket = useMutation({
    mutationFn: (data) => base44.entities.Basislernpakete.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basislernpakete'] });
      setNewPaketTitel('');
      toast.success('Paket hinzugefügt');
    },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });

  const deleteBasismodul = useMutation({
    mutationFn: () => base44.entities.Basismodule.delete(basismodul.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basismodule'] });
      toast.success('Modul gelöscht');
      onDelete?.();
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  const updatePaket = useMutation({
    mutationFn: ({ id, titel }) => base44.entities.Basislernpakete.update(id, { titel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basislernpakete'] });
      setEditingPaketId(null);
      toast.success('Paket aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const deletePaket = useMutation({
    mutationFn: (id) => base44.entities.Basislernpakete.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basislernpakete'] });
      toast.success('Paket gelöscht');
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

  const handleEditStart = (paket) => {
    setEditingPaketId(paket.id);
    setEditingPaketTitel(paket.titel);
  };

  const handleEditSave = async (id) => {
    if (!editingPaketTitel.trim()) {
      toast.error('Paket-Titel darf nicht leer sein');
      return;
    }
    await updatePaket.mutateAsync({
      id,
      titel: editingPaketTitel.trim(),
    });
  };

  const handleEditCancel = () => {
    setEditingPaketId(null);
    setEditingPaketTitel('');
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
            {deleteBasismodul.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {deleteBasismodul.isPending ? 'Wird gelöscht...' : 'Löschen'}
          </Button>

          {/* Lösch-Overlay */}
          {deleteBasismodul.isPending && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border border-border shadow-lg">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Basismodul wird gelöscht... Bitte warten.</p>
                  <p className="text-xs text-muted-foreground mt-1">Dies kann einige Sekunden dauern...</p>
                </div>
              </div>
            </div>
          )}
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
          <div className="space-y-3">
            {pakete.map((paket) => {
              const paketLernziele = alleLernziele.filter(
                (lz) => lz.basislernpaket_id === paket.id
              );
              return (
                <div key={paket.id} className="border rounded-lg bg-white">
                  {editingPaketId === paket.id ? (
                    <div className="p-3 space-y-2 border-b bg-muted/20">
                      <Input
                        type="text"
                        value={editingPaketTitel}
                        onChange={(e) => setEditingPaketTitel(e.target.value)}
                        className="text-sm h-9"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditCancel}
                          className="gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(paket.id)}
                          disabled={updatePaket.isPending}
                          className="gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Speichern
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 flex items-center justify-between border-b">
                      <h3 className="text-sm font-semibold">{paket.titel}</h3>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditStart(paket)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePaket.mutate(paket.id)}
                          disabled={deletePaket.isPending}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <BasislernpaketCard
                    paket={paket}
                    lernziele={paketLernziele}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}