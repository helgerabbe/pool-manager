import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const EBENEN = ["Ebene 1 - Basis", "Ebene 2 - Transfer", "Ebene 3 - Projekt"];
const KATEGORIEN = ["Fachwissen", "Fähigkeit/Fertigkeit"];

export default function LernzielForm({ open, onOpenChange, onSubmit, initialData }) {
  const [formData, setFormData] = useState(initialData || {
    formulierung_fachsprache: '',
    anforderungsebene: '',
    kategorie: '',
    schueler_uebersetzung: '',
  });

  const istEbene1 = formData.anforderungsebene === 'Ebene 1 - Basis';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Lernziel bearbeiten' : 'Neues Lernziel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Formulierung Fachsprache *</Label>
            <Textarea
              value={formData.formulierung_fachsprache}
              onChange={e => setFormData({ ...formData, formulierung_fachsprache: e.target.value })}
              placeholder="Ich kann..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Anforderungsebene *</Label>
            <Select value={formData.anforderungsebene} onValueChange={v => setFormData({ ...formData, anforderungsebene: v, kategorie: '' })}>
              <SelectTrigger><SelectValue placeholder="Ebene wählen" /></SelectTrigger>
              <SelectContent>
                {EBENEN.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Kategorie: nur bei Ebene 1 */}
          {istEbene1 && (
            <div className="space-y-2">
              <Label>Kategorie *
                <span className="text-muted-foreground font-normal text-xs ml-2">
                  (bestimmt auto-generierte Bausteine)
                </span>
              </Label>
              <div className="flex gap-3">
                {KATEGORIEN.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFormData({ ...formData, kategorie: k })}
                    className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.kategorie === k
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40 text-foreground'
                    }`}
                  >
                    {k === 'Fachwissen' ? '🧠 Fachwissen' : '🛠️ Fähigkeit/Fertigkeit'}
                    <p className="text-[10px] font-normal text-muted-foreground mt-0.5">
                      {k === 'Fachwissen' ? '2 Bausteine: Fakten + Drill' : '4 Bausteine: Input, Cheat-Sheet, Musterlösung, Übung'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Schüler-Übersetzung</Label>
            <Textarea
              value={formData.schueler_uebersetzung}
              onChange={e => setFormData({ ...formData, schueler_uebersetzung: e.target.value })}
              placeholder="Schülergerechte Formulierung für die Lernlandkarte..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={
                !formData.formulierung_fachsprache ||
                !formData.anforderungsebene ||
                (istEbene1 && !formData.kategorie)
              }
            >
              {initialData ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}