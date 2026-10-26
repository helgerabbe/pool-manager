import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ElementPalette from '@/components/foliendesigner/ElementPalette';
import FolienArbeitsflaeche from '@/components/foliendesigner/FolienArbeitsflaeche';
import ElementEinstellungen from '@/components/foliendesigner/ElementEinstellungen';

/** Foliendesigner als eigenes Fenster: bearbeitet Tafel- und Tablet-Ansicht einer Folie, OK gibt sie zurück. */
export default function FolienDesignerDialog({ folie, onOk, onAbbrechen }) {
  const [ansicht, setAnsicht] = React.useState('lehrer');
  const [f, setF] = React.useState(folie);
  const [gewaehlt, setGewaehlt] = React.useState(null);
  React.useEffect(() => { setF(folie); setAnsicht('lehrer'); setGewaehlt(null); }, [folie]);
  if (!f) return null;
  const elemente = f[ansicht] || [];
  const setElemente = (x) => setF((alt) => ({ ...alt, [ansicht]: typeof x === 'function' ? x(alt[ansicht] || []) : x }));
  const gewaehltEl = elemente.find((e) => e.id === gewaehlt);

  return (
    <Dialog open={!!folie} onOpenChange={(o) => !o && onAbbrechen()}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-0 p-0">
        <div className="flex items-center gap-3 border-b px-5 py-3 pr-12">
          <input value={f.titel || ''} onChange={(e) => setF({ ...f, titel: e.target.value })} placeholder="Titel der Folie"
            className="min-w-0 flex-1 bg-transparent font-display text-lg font-bold outline-none" />
          <div className="flex rounded-lg border p-0.5 text-xs">
            {[['lehrer', 'Tafel'], ['schueler', 'Tablet']].map(([k, l]) => (
              <button key={k} onClick={() => { setAnsicht(k); setGewaehlt(null); }} className={`rounded-md px-3 py-1 ${ansicht === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{l}</button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onAbbrechen}>Abbrechen</Button>
          <Button size="sm" onClick={() => onOk(f)}>OK</Button>
        </div>
        <div className="flex min-h-0 flex-1">
          <ElementPalette />
          <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/40 p-6">
            <FolienArbeitsflaeche elemente={elemente} setElemente={setElemente} gewaehlt={gewaehlt} setGewaehlt={setGewaehlt} />
          </div>
          {gewaehltEl && <ElementEinstellungen el={gewaehltEl} setze={(p) => setElemente(elemente.map((e) => (e.id === gewaehlt ? { ...e, ...p } : e)))} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}