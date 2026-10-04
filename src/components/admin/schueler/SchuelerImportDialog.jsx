import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Zeilen "Vorname;Nachname;E-Mail;Klasse" (auch Tab oder Komma) einlesen. */
const parse = (text) => text.split('\n').map((z) => z.split(/[;\t,]/).map((t) => t.trim()))
  .filter((t) => t[2]?.includes('@'))
  .map(([vorname, nachname, email, klasse]) => ({ vorname, nachname, email: email.toLowerCase(), klasse: klasse || '' }));

export default function SchuelerImportDialog({ open, onOpenChange, vorhandene, onGespeichert }) {
  const [text, setText] = React.useState('');
  const [speichert, setSpeichert] = React.useState(false);
  const bekannt = new Set(vorhandene.map((s) => s.email));
  const neue = parse(text).filter((s) => !bekannt.has(s.email));
  const importieren = async () => {
    setSpeichert(true);
    await base44.entities.Schueler.bulkCreate(neue);
    setSpeichert(false); setText(''); onOpenChange(false); onGespeichert();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Schülerliste importieren</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Füge die Liste ein (z. B. aus Excel kopiert), eine Zeile pro Schüler: <b>Vorname; Nachname; E-Mail; Klasse</b>. Bereits vorhandene E-Mails werden übersprungen.</p>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Max;Muster;max.muster@igs-seevetal.de;9a'} />
        <DialogFooter>
          <Button disabled={!neue.length || speichert} onClick={importieren}>{neue.length} Schüler importieren</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}