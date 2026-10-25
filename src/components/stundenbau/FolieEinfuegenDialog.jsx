import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

const ARTEN = ['Inhaltsfolie', 'Aufgabenfolie', 'Methodenfolie (Phase ankündigen)', 'Sammlung', 'Sicherung', 'Organisation'];

/** Neue Folie hinter der aktuellen einfügen: Art wählen, beschreiben, die KI füllt sie. */
export default function FolieEinfuegenDialog({ offen, onSchliessen, onEinfuegen }) {
  const [art, setArt] = React.useState(ARTEN[0]);
  const [wunsch, setWunsch] = React.useState('');
  const [baut, setBaut] = React.useState(false);
  const los = async () => {
    setBaut(true);
    await onEinfuegen(art, wunsch).finally(() => setBaut(false));
    setWunsch(''); onSchliessen();
  };
  return (
    <Dialog open={offen} onOpenChange={(o) => !o && onSchliessen()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Folie einfügen</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {ARTEN.map((a) => (
            <button key={a} type="button" onClick={() => setArt(a)}
              className={`rounded-full border px-3 py-1 text-xs ${art === a ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>{a}</button>
          ))}
        </div>
        <FreitextMitSprache rows={4} value={wunsch} onChange={setWunsch} placeholder="Was muss auf der Folie zu sehen sein?" />
        <Button onClick={los} disabled={baut || !wunsch.trim()}>{baut && <Loader2 className="w-4 h-4 animate-spin" />} Einfügen</Button>
      </DialogContent>
    </Dialog>
  );
}