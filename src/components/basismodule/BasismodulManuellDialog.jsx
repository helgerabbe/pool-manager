import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Manuelles Anlegen eines Basismoduls – ohne Wizard.
 * Erfasst nur die Pflichtfelder (Titel, Fach, Jahrgang) und legt direkt an.
 */
export default function BasismodulManuellDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ titel_der_einheit: '', fach: '', jahrgangsstufe: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { rolle, faecher: userFaecher = [] } = useRBAC();

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: async () => {
      const all = await base44.entities.LookupFaecher.list();
      const aktiv = all.filter(f => f.ist_aktiv).sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999));
      if (rolle === ROLLEN.ADMIN) return aktiv;
      return userFaecher.length > 0 ? aktiv.filter(f => userFaecher.includes(f.name)) : aktiv;
    },
  });

  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookupJahrgaenge'],
    queryFn: async () => {
      const all = await base44.entities.LookupJahrgaenge.list();
      return all.filter(j => j.ist_aktiv).sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999));
    },
  });

  const isValid = form.titel_der_einheit.trim() && form.fach && form.jahrgangsstufe;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await base44.functions.invoke('createEinheitMitDefaults', {
        metaData: form,
        istBasismodul: true,
      });
      const einheit = res.data?.einheit;
      // Wizard wird übersprungen → Modul sofort aktiv schalten, damit es sichtbar ist.
      if (einheit?.id) {
        await base44.entities.Einheiten.update(einheit.id, { wizard_status: 'aktiv', wizard_max_step: 4 });
      }
      setForm({ titel_der_einheit: '', fach: '', jahrgangsstufe: '' });
      onOpenChange(false);
      onCreated(einheit);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      {open && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => onOpenChange(false)} />}
      <DialogContent className="z-50 w-[95%] sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Neues Basismodul (manuell)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Titel des Basismoduls (Unterrichtseinheit) *</Label>
            <Input
              placeholder="z.B. Prozentrechnung"
              value={form.titel_der_einheit}
              onChange={e => setForm({ ...form, titel_der_einheit: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Unterrichtsfach *</Label>
            <Select value={form.fach} onValueChange={v => setForm({ ...form, fach: v })}>
              <SelectTrigger><SelectValue placeholder="Fach auswählen..." /></SelectTrigger>
              <SelectContent>
                {faecher.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jahrgangsstufe *</Label>
            <Select value={form.jahrgangsstufe} onValueChange={v => setForm({ ...form, jahrgangsstufe: v })}>
              <SelectTrigger><SelectValue placeholder="Jahrgang auswählen..." /></SelectTrigger>
              <SelectContent>
                {jahrgaenge.map(j => <SelectItem key={j.id} value={j.bezeichnung}>{j.bezeichnung}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} className="gap-2">
            {isSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}