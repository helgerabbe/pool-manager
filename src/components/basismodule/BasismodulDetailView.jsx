import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const FAECHER = [
  'Deutsch', 'Mathematik', 'Englisch', 'Französisch', 'Latein',
  'Biologie', 'Chemie', 'Physik', 'Geschichte', 'Geographie',
  'Politik', 'Wirtschaft', 'Kunst', 'Musik', 'Sport', 'Religion', 'Ethik', 'Informatik'
];

export default function BasismodulDetailView({ open, onOpenChange, initialData, onSuccess }) {
  const [form, setForm] = useState({
    fach: initialData?.fach || '',
    titel: initialData?.titel || '',
    beschreibung_thema: initialData?.beschreibung_thema || '',
    geplante_inhalte: initialData?.geplante_inhalte || '',
    jahrgang_empfehlung: initialData?.jahrgang_empfehlung || '',
    status: initialData?.status || 'Entwurf',
  });

  const isEdit = !!initialData?.id;

  const createModule = useMutation({
    mutationFn: (data) => base44.entities.Basismodule.create(data),
    onSuccess: () => {
      toast.success('Basismodul erstellt');
      onSuccess?.();
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateModule = useMutation({
    mutationFn: (data) => base44.entities.Basismodule.update(initialData.id, data),
    onSuccess: () => {
      toast.success('Basismodul gespeichert');
      onSuccess?.();
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const handleSubmit = () => {
    if (!form.fach || !form.titel) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (isEdit) {
      updateModule.mutate(form);
    } else {
      createModule.mutate(form);
    }
  };

  const isPending = createModule.isPending || updateModule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Basismodul bearbeiten' : 'Neues Basismodul'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fach */}
          <div className="space-y-2">
            <Label>Fach *</Label>
            <Select value={form.fach} onValueChange={(val) => setForm({ ...form, fach: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Fach wählen" />
              </SelectTrigger>
              <SelectContent>
                {FAECHER.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titel */}
          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input
              value={form.titel}
              onChange={(e) => setForm({ ...form, titel: e.target.value })}
              placeholder="z.B. Rechtschreibung, Gleichungen"
            />
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label>Beschreibung (Worum geht es?)</Label>
            <textarea
              value={form.beschreibung_thema}
              onChange={(e) => setForm({ ...form, beschreibung_thema: e.target.value })}
              placeholder="Kurze Beschreibung des Themas..."
              className="w-full px-3 py-2 rounded-lg border border-input min-h-20 resize-none text-sm"
            />
          </div>

          {/* Geplante Inhalte */}
          <div className="space-y-2">
            <Label>Geplante Inhalte (Was soll gelernt werden?)</Label>
            <textarea
              value={form.geplante_inhalte}
              onChange={(e) => setForm({ ...form, geplante_inhalte: e.target.value })}
              placeholder="Stichpunkte oder detaillierte Aufzählung der Lernziele..."
              className="w-full px-3 py-2 rounded-lg border border-input min-h-32 resize-none text-sm"
            />
          </div>

          {/* Jahrgangsstufen */}
          <div className="space-y-2">
            <Label>Empfohlene Jahrgangsstufen</Label>
            <Input
              value={form.jahrgang_empfehlung}
              onChange={(e) => setForm({ ...form, jahrgang_empfehlung: e.target.value })}
              placeholder="z.B. 5-7 oder 8-10"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Entwurf">Entwurf</SelectItem>
                <SelectItem value="Bereit für Moodle">Bereit für Moodle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEdit ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}