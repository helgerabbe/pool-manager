import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Knopf unter einem Prüfhinweis: Der Assistent baut den Entwurf so um, dass der Hinweis behoben ist. */
export default function HinweisLoesen({ text, onBeheben }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState(false);
  if (!onBeheben) return null;
  const los = () => { setLaedt(true); setFehler(false); onBeheben(text).catch(() => setFehler(true)).finally(() => setLaedt(false)); };
  return (
    <div className="ml-6 flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={laedt} onClick={los}>
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Stunde so umbauen, dass es passt
      </Button>
      {fehler && <span className="text-xs text-destructive">Hat nicht geklappt, bitte noch einmal.</span>}
    </div>
  );
}