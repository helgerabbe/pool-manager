import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const LEER = { vorname: '', nachname: '', email: '', klasse: '' };

/** Einzelnen Schüler von Hand eintragen. */
export default function SchuelerFormDialog({ open, onOpenChange, onGespeichert }) {
  const [daten, setDaten] = React.useState(LEER);
  const [speichert, setSpeichert] = React.useState(false);
  const feld = (k, label) => (
    <Input placeholder={label} value={daten[k]} onChange={(e) => setDaten({ ...daten, [k]: e.target.value })} />
  );
  const speichern = async () => {
    setSpeichert(true);
    await base44.entities.Schueler.create({ ...daten, email: daten.email.trim().toLowerCase() });
    setSpeichert(false); setDaten(LEER); onOpenChange(false); onGespeichert();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Schüler hinzufügen</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {feld('vorname', 'Vorname')}{feld('nachname', 'Nachname')}
          {feld('email', 'IServ-E-Mail')}{feld('klasse', 'Klasse, z. B. 9a')}
        </div>
        <DialogFooter>
          <Button disabled={!daten.email.includes('@') || speichert} onClick={speichern}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}