import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Manuelles Anlegen eines Basismoduls – ohne Wizard.
 * Erfasst nur die Pflichtfelder (Titel, Fach, Jahrgang) und legt direkt an.
 * Verwendet native <select>-Elemente (keine Z-Index-/Portal-Probleme im Dialog).
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

  // Basismodule können aus den Klassen 5–8 stammen → fest 5 bis 10 anbieten.
  const jahrgaenge = ['5', '6', '7', '8', '9', '10'];

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

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md" aria-describedby={undefined}>
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
            <select
              className={selectClass}
              value={form.fach}
              onChange={e => setForm({ ...form, fach: e.target.value })}
            >
              <option value="" disabled>Fach auswählen...</option>
              {faecher.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Jahrgangsstufe *</Label>
            <select
              className={selectClass}
              value={form.jahrgangsstufe}
              onChange={e => setForm({ ...form, jahrgangsstufe: e.target.value })}
            >
              <option value="" disabled>Jahrgang auswählen...</option>
              {jahrgaenge.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
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