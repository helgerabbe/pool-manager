import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const BAUSTEIN_TYPEN = [
  "Pre-Test", "Input", "Ebene-1-Übung", "Ebene-2-Aufgabe", 
  "Ebene-3-Projekt", "Exit-Check", "Prüfung Typ A", "Prüfung Typ B", "Prüfung Typ C"
];

export default function AufgabenbausteinForm({ open, onOpenChange, onSubmit, initialData, lernziele }) {
  const [formData, setFormData] = useState(initialData || {
    baustein_typ: '',
    lernziel_id: '',
    aufgabentext_inhalt: '',
    erwartungshorizont_ki_prompt: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Aufgabenbaustein bearbeiten' : 'Neuer Aufgabenbaustein'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Baustein-Typ *</Label>
              <Select value={formData.baustein_typ} onValueChange={v => setFormData({ ...formData, baustein_typ: v })}>
                <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                <SelectContent>
                  {BAUSTEIN_TYPEN.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zugeordnetes Lernziel</Label>
              <Select value={formData.lernziel_id} onValueChange={v => setFormData({ ...formData, lernziel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional zuordnen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Lernziel</SelectItem>
                  {lernziele?.map(lz => (
                    <SelectItem key={lz.id} value={lz.id}>
                      {lz.formulierung_fachsprache?.substring(0, 60)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Aufgabentext / Inhalt</Label>
            <Textarea
              value={formData.aufgabentext_inhalt}
              onChange={e => setFormData({ ...formData, aufgabentext_inhalt: e.target.value })}
              placeholder="Detaillierter Aufgabentext..."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Erwartungshorizont / KI-Prompt</Label>
            <Textarea
              value={formData.erwartungshorizont_ki_prompt}
              onChange={e => setFormData({ ...formData, erwartungshorizont_ki_prompt: e.target.value })}
              placeholder="Vorgaben für den KI-Tutor..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={!formData.baustein_typ}>
              {initialData ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}