import React from 'react';
import { Loader2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Kleines Assistentenfenster: mit Spracheingabe über Kernaufgabe oder Differenzierung sprechen. */
export default function AssistentFenster({ offen, onSchliessen, titel, bezug, gespraech = [], denkt, onSenden }) {
  const [text, setText] = React.useState('');
  const [start] = React.useState(gespraech.length);
  React.useEffect(() => { if (offen) setText(''); }, [offen]);
  const neu = gespraech.slice(Math.min(start, gespraech.length)).slice(-6);
  const senden = () => { if (!text.trim()) return; onSenden(bezug ? `${bezug}: ${text.trim()}` : text.trim()); setText(''); };
  return (
    <Dialog open={offen} onOpenChange={(o) => !o && onSchliessen()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{titel}</DialogTitle></DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {neu.map((m, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-8 bg-muted' : 'mr-8 border bg-card'}`}>{m.content}</div>
          ))}
          {denkt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Der Assistent überarbeitet …</p>}
        </div>
        <FreitextMitSprache rows={3} value={text} onChange={setText} placeholder="z. B. „Bei den normalen Schülern muss es mehr in Richtung … gehen.“" />
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onSchliessen}>Fertig</Button>
          <Button disabled={denkt || !text.trim()} onClick={senden}><Send /> Senden</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}