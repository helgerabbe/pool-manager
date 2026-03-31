import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function LernpaketForm({ open, onOpenChange, onSubmit, initialData, nextOrder }) {
  const [formData, setFormData] = useState(initialData || {
    titel_des_pakets: '',
    reihenfolge_nummer: nextOrder || 1,
    geschaetzte_dauer_minuten: 45,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Lernpaket bearbeiten' : 'Neues Lernpaket'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Titel des Pakets *</Label>
            <Input
              value={formData.titel_des_pakets}
              onChange={e => setFormData({ ...formData, titel_des_pakets: e.target.value })}
              placeholder="z.B. Grundlagen der linearen Funktionen"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reihenfolge</Label>
              <Input
                type="number"
                min={1}
                value={formData.reihenfolge_nummer}
                onChange={e => setFormData({ ...formData, reihenfolge_nummer: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dauer (Min.)</Label>
              <Input
                type="number"
                min={1}
                value={formData.geschaetzte_dauer_minuten}
                onChange={e => setFormData({ ...formData, geschaetzte_dauer_minuten: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={!formData.titel_des_pakets}>
              {initialData ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}