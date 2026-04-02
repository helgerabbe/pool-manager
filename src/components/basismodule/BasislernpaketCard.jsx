import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function BasislernpaketCard({ paket, lernziele = [] }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newLernzielText, setNewLernzielText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingLernzielId, setEditingLernzielId] = useState(null);
  const [editingLernzielText, setEditingLernzielText] = useState('');

  const createLernziel = useMutation({
    mutationFn: (data) => base44.entities.BasisLernziel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basisLernziele'] });
      setNewLernzielText('');
      toast.success('Lernziel hinzugefügt');
    },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });

  const deleteLernziel = useMutation({
    mutationFn: (id) => base44.entities.BasisLernziel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basisLernziele'] });
      toast.success('Lernziel gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  const updateLernziel = useMutation({
    mutationFn: ({ id, text }) => base44.entities.BasisLernziel.update(id, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basisLernziele'] });
      setEditingLernzielId(null);
      toast.success('Lernziel aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const handleAddLernziel = async () => {
    if (!newLernzielText.trim()) return;
    setIsAdding(true);
    try {
      await createLernziel.mutateAsync({
        basislernpaket_id: paket.id,
        text: newLernzielText.trim(),
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddLernziel();
    }
  };

  const handleEditStart = (lernziel) => {
    setEditingLernzielId(lernziel.id);
    setEditingLernzielText(lernziel.text);
  };

  const handleEditSave = async (id) => {
    if (!editingLernzielText.trim()) {
      toast.error('Lernziel-Text darf nicht leer sein');
      return;
    }
    await updateLernziel.mutateAsync({
      id,
      text: editingLernzielText.trim(),
    });
  };

  const handleEditCancel = () => {
    setEditingLernzielId(null);
    setEditingLernzielText('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-white">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{paket.titel}</p>
            <Badge variant="secondary" className="text-[10px] mt-1">
              {lernziele.length} Ziel{lernziele.length !== 1 ? 'e' : ''}
            </Badge>
          </div>
          <ChevronDown className={cn('w-4 h-4 transition-transform shrink-0', isOpen && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border p-4 space-y-3">
        {/* Lernziele-Liste */}
         {lernziele.length > 0 && (
          <div className="space-y-2 mb-4">
            {lernziele.map((lz) => (
              <div
                key={lz.id}
                className="flex items-start justify-between gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                {editingLernzielId === lz.id ? (
                  <Input
                    type="text"
                    value={editingLernzielText}
                    onChange={(e) => setEditingLernzielText(e.target.value)}
                    className="text-xs h-7 flex-1"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs leading-relaxed flex-1 text-foreground">{lz.text}</p>
                )}
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                  {editingLernzielId === lz.id ? (
                    <>
                      <button
                        onClick={() => handleEditSave(lz.id)}
                        disabled={updateLernziel.isPending}
                        className="p-1 rounded hover:bg-green-100 transition-all"
                        title="Speichern"
                      >
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="p-1 rounded hover:bg-muted transition-all"
                        title="Abbrechen"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditStart(lz)}
                        className="p-1 rounded hover:bg-blue-100 transition-all"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => deleteLernziel.mutate(lz.id)}
                        disabled={deleteLernziel.isPending}
                        className="p-1 rounded hover:bg-destructive/10 transition-all"
                        title="Löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input für neues Lernziel */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Neues Lernziel eingeben..."
            value={newLernzielText}
            onChange={(e) => setNewLernzielText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAdding}
            className="text-xs h-8"
          />
          <Button
            size="sm"
            onClick={handleAddLernziel}
            disabled={!newLernzielText.trim() || isAdding}
            className="gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}