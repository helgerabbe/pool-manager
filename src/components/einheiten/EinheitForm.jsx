import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export default function EinheitForm({ open, onOpenChange, onSubmit, initialData }) {
  const { faecher, jahrgaenge } = useSystemSettings();
  const [formData, setFormData] = useState(initialData || {
    fach: '',
    titel_der_einheit: '',
    jahrgangsstufe: '',
    navigationslogik: 'Sequenziell',
    freigabe_status: 'In Planung',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Einheit bearbeiten' : 'Neue Einheit erstellen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fach">Fach *</Label>
            <Select value={formData.fach} onValueChange={v => setFormData({ ...formData, fach: v })}>
              <SelectTrigger><SelectValue placeholder="Fach wählen" /></SelectTrigger>
              <SelectContent>
                {faecher.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="titel">Titel der Einheit *</Label>
            <Input
              id="titel"
              value={formData.titel_der_einheit}
              onChange={e => setFormData({ ...formData, titel_der_einheit: e.target.value })}
              placeholder="z.B. Lineare Funktionen"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jahrgangsstufe *</Label>
              <Select value={formData.jahrgangsstufe} onValueChange={v => setFormData({ ...formData, jahrgangsstufe: v })}>
                <SelectTrigger><SelectValue placeholder="Jg." /></SelectTrigger>
                <SelectContent>
                  {jahrgaenge.map(j => <SelectItem key={j} value={j}>Jahrgang {j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Navigationslogik</Label>
              <Select value={formData.navigationslogik} onValueChange={v => setFormData({ ...formData, navigationslogik: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sequenziell">Sequenziell</SelectItem>
                  <SelectItem value="Offen">Offen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={!formData.fach || !formData.titel_der_einheit || !formData.jahrgangsstufe}>
              {initialData ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}