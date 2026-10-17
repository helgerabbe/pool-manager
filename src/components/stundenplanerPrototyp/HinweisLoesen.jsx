import React from 'react';
import { Loader2, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PhasenSpalte from './PhasenSpalte';

/** Zeigt zu einem Prüfhinweis erst einen Vorher-Nachher-Vorschlag; übernommen wird nur auf ausdrücklichen Wunsch. */
export default function HinweisLoesen({ text, entwurf, onVorschlag, onUebernehmen }) {
  const [offen, setOffen] = React.useState(false);
  const [vorschlag, setVorschlag] = React.useState(null);
  const [fehler, setFehler] = React.useState(false);
  if (!onVorschlag) return null;
  const laden = () => { setVorschlag(null); setFehler(false); onVorschlag(text).then(setVorschlag).catch(() => setFehler(true)); };
  const oeffnen = () => { setOffen(true); if (!vorschlag) laden(); };
  return (
    <div className="ml-6">
      <Button size="sm" variant="outline" onClick={oeffnen}><Eye className="h-4 w-4" /> Zeig mir, was das heißt</Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Was würde sich ändern?</DialogTitle><DialogDescription>{text}</DialogDescription></DialogHeader>
          {fehler && <p className="text-sm text-destructive">Kein Vorschlag möglich. <button className="underline" onClick={laden}>Noch einmal</button></p>}
          {!vorschlag && !fehler && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich überlege, wie die Stunde dann aussehen würde …</p>}
          {vorschlag && <>
            {vorschlag.hinweis && <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"><Sparkles className="h-5 w-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">{vorschlag.hinweis}</p></div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <PhasenSpalte titel="So ist es jetzt" phasen={entwurf.phasen} />
              <PhasenSpalte titel="So würde es aussehen" phasen={vorschlag.phasen} betont />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setOffen(false)}>Lieber so lassen</Button>
              <Button onClick={() => { onUebernehmen(vorschlag); setOffen(false); }}>Änderung übernehmen</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}