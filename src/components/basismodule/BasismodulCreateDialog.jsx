import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';

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

export default function BasismodulCreateDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [fach, setFach] = useState('');
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');

  const createBasismodul = useMutation({
    mutationFn: (data) => base44.entities.Basismodul.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basismodule'] });
      toast.success('Basismodul erstellt');
      handleReset();
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const handleReset = () => {
    setFach('');
    setTitel('');
    setBeschreibung('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fach || !titel.trim()) {
      toast.error('Fach und Titel erforderlich');
      return;
    }
    await createBasismodul.mutateAsync({
      fach,
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Basismodul</DialogTitle>
          <DialogDescription>
            Erstellen Sie ein neues Basismodul für Vorwissen
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fach */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fach *</label>
            <Select value={fach} onValueChange={setFach}>
              <SelectTrigger>
                <SelectValue placeholder="Wähle ein Fach..." />
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

          {/* Titel */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Titel *</label>
            <Input
              type="text"
              placeholder="z.B. 'Mathe Grundlagen'"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
            />
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Beschreibung</label>
            <Input
              type="text"
              placeholder="Optional"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={!fach || !titel.trim() || createBasismodul.isPending}
            >
              {createBasismodul.isPending ? 'Wird erstellt...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}