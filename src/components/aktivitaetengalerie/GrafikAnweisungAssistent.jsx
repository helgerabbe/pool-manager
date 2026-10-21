import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** KI-Befüllung eines Textfelds (Methodenbeschreiber bzw. Grafikassistent). Änderungen nur über den KI-Prompt.
 *  Mit `knoepfe` gibt es mehrere Teil-Knöpfe, die jeweils nur ihren Abschnitt befüllen. */
export default function GrafikAnweisungAssistent({ werte, setze, feld, erzeugen, hinweis, gesperrt, knopf, knoepfe }) {
  const [laedt, setLaedt] = React.useState(null);
  const [fehler, setFehler] = React.useState('');
  const [stand, setStand] = React.useState('');
  const bisher = werte[feld] || '';
  const liste = knoepfe || [{ label: knopf && !bisher ? knopf : 'Bereich neu befüllen', erzeugen }];

  const lauf = (k) => {
    setLaedt(k.label); setFehler(''); setStand('');
    k.erzeugen({ methode: werte, bisher, wunsch: '', verlauf: [], fortschritt: setStand })
      .then((r) => setze(feld, r.text || bisher))
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.'))
      .finally(() => setLaedt(null));
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="flex-1 text-xs text-muted-foreground">{hinweis}</p>
        {liste.map((k) => (
          <Button key={k.label} size="sm" variant="outline" disabled={!!laedt || gesperrt} onClick={() => lauf(k)}>
            {laedt === k.label ? <Loader2 className="animate-spin" /> : <Sparkles />} {k.label}
          </Button>
        ))}
      </div>
      {laedt && stand && <p className="text-xs text-primary">{stand}</p>}
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
    </div>
  );
}