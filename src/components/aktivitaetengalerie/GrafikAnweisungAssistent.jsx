import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** KI-Befüllung eines Textfelds (Methodenbeschreiber bzw. Grafikassistent). Änderungen nur über den KI-Prompt. */
export default function GrafikAnweisungAssistent({ werte, setze, feld, erzeugen, hinweis, gesperrt, knopf }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const bisher = werte[feld] || '';

  const lauf = () => {
    setLaedt(true); setFehler('');
    erzeugen({ methode: werte, bisher: '', wunsch: '', verlauf: [] })
      .then((r) => setze(feld, r.text || bisher))
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.'))
      .finally(() => setLaedt(false));
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="flex-1 text-xs text-muted-foreground">{hinweis}</p>
        <Button size="sm" variant="outline" disabled={laedt || gesperrt} onClick={lauf}>
          {laedt ? <Loader2 className="animate-spin" /> : <Sparkles />} {knopf && !bisher ? knopf : 'Bereich neu befüllen'}
        </Button>
      </div>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
    </div>
  );
}