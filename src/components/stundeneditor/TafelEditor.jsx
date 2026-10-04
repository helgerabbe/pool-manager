import React from 'react';
import { Heading, Image, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TafelBlock from './TafelBlock';

const NEU = [['ueberschrift', 'Überschrift', Heading], ['text', 'Text', Type], ['bild', 'Bild', Image]];

/** Lehreransicht: die digitale Tafel dieser Phase, direkt bearbeitbar (16:9). */
export default function TafelEditor({ phase, onSpeichern }) {
  const [bloecke, setBloecke] = React.useState(phase.tafel || []);
  const timer = React.useRef(null);
  React.useEffect(() => { setBloecke(phase.tafel || []); }, [phase.id]);

  const setzen = (neu) => {
    setBloecke(neu);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSpeichern(neu), 600);
  };
  const tauschen = (i, j) => {
    if (j < 0 || j >= bloecke.length) return;
    const neu = [...bloecke];
    [neu[i], neu[j]] = [neu[j], neu[i]];
    setzen(neu);
  };

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-y-auto rounded-xl bg-slate-900 p-8 shadow-inner">
        <div className="flex min-h-full flex-col justify-center gap-4">
          {bloecke.length === 0 && <p className="text-center text-white/50">Die Tafel ist leer. Füge unten Bausteine hinzu.</p>}
          {bloecke.map((b, i) => (
            <TafelBlock
              key={b.id}
              block={b}
              onChange={(t) => setzen(bloecke.map((x) => (x.id === b.id ? { ...x, ...t } : x)))}
              onHoch={() => tauschen(i, i - 1)}
              onRunter={() => tauschen(i, i + 1)}
              onLoeschen={() => setzen(bloecke.filter((x) => x.id !== b.id))}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Hinzufügen:</span>
        {NEU.map(([typ, label, Icon]) => (
          <Button key={typ} size="sm" variant="outline" className="gap-1.5" onClick={() => setzen([...bloecke, { id: crypto.randomUUID(), typ, inhalt: '' }])}>
            <Icon className="h-4 w-4" /> {label}
          </Button>
        ))}
      </div>
      {phase.lehrer_hinweis && <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><b>Regie (nur für dich):</b> {phase.lehrer_hinweis}</p>}
    </div>
  );
}