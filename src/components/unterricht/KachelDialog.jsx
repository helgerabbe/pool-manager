/**
 * KachelDialog.jsx
 *
 * Ein Dialog für zwei nahe verwandte Aufgaben: eine neue Unterrichts-Kachel
 * anlegen (Fach + Jahrgang wählen) oder eine bestehende benennen.
 */
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function KachelDialog({ open, onOpenChange, kachel, faecher = [], onSpeichern, busy }) {
  const istBearbeiten = !!kachel;
  const [fach, setFach] = useState('');
  const [jahrgang, setJahrgang] = useState('');
  const [name, setName] = useState('');

  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookup-jahrgaenge'],
    queryFn: async () => {
      const all = await base44.entities.LookupJahrgaenge.list();
      return all.filter((j) => j.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setFach(kachel?.fach || '');
    setJahrgang(kachel?.jahrgangsstufe || '');
    setName(kachel?.anzeigename || '');
  }, [open, kachel]);

  const gueltig = fach && jahrgang;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{istBearbeiten ? 'Kachel benennen' : 'Fach hinzufügen'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fach</Label>
            <select
              className={selectClass}
              value={fach}
              onChange={(e) => setFach(e.target.value)}
              disabled={istBearbeiten}
            >
              <option value="" disabled>Fach auswählen…</option>
              {faecher.map((f) => <option key={f.id || f.name} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Jahrgangsstufe</Label>
            <select
              className={selectClass}
              value={jahrgang}
              onChange={(e) => setJahrgang(e.target.value)}
              disabled={istBearbeiten}
            >
              <option value="" disabled>Jahrgang auswählen…</option>
              {jahrgaenge.map((j) => <option key={j.id} value={j.bezeichnung}>{j.bezeichnung}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Eigener Name (optional)</Label>
            <Input
              placeholder="z. B. Mathe 6b"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leer lassen — dann steht auf der Kachel Fach und Jahrgang.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            disabled={!gueltig || busy}
            onClick={() => onSpeichern({ fach, jahrgangsstufe: jahrgang, anzeigename: name.trim() })}
          >
            {istBearbeiten ? 'Speichern' : 'Hinzufügen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}