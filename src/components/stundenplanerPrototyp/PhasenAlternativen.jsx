import React from 'react';
import { Lightbulb, Loader2, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { phasenAlternativen } from '@/lib/phasenAlternativen';

/** Hinweis an einer Phase: „Hier passt auch …“ – aufklappbar, Methode direkt einsetzen. */
export default function PhasenAlternativen({ phase, modellKey, varianteKey, onEinsetzen }) {
  const vorschlaege = React.useMemo(() => phasenAlternativen(phase, modellKey, varianteKey), [phase, modellKey, varianteKey]);
  const [offen, setOffen] = React.useState(false);
  const [details, setDetails] = React.useState(null);

  React.useEffect(() => {
    if (!offen || details) return;
    base44.entities.MethodenKatalog.filter({ name: { $in: vorschlaege.map((v) => v.name) }, ist_aktiv: { $ne: false } },
      { limit: 100, fields: ['name', 'stufe', 'kurzbeschreibung', 'dauer_min', 'dauer_max'] })
      .then((p) => setDetails(Object.fromEntries(p.items.map((m) => [m.name, m]))));
  }, [offen, details, vorschlaege]);

  if (!vorschlaege.length) return null;
  if (!offen) {
    return (
      <button onClick={() => setOffen(true)} className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20">
        <Lightbulb className="h-3 w-3" /> {vorschlaege.length} {vorschlaege.length === 1 ? 'Methode passt' : 'Methoden passen'} auch hier
      </button>
    );
  }
  const liste = details ? vorschlaege.filter((v) => details[v.name]) : [];
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-accent/30 bg-accent/5 p-2">
      <button onClick={() => setOffen(false)} className="flex items-center gap-1 text-[11px] font-medium text-accent"><ChevronUp className="h-3 w-3" /> Das könntest du hier auch machen</button>
      {!details ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Lädt …</p>
        : liste.map((v) => {
          const m = details[v.name];
          return (
            <div key={v.name} className="flex items-start gap-2 rounded-md bg-card p-2">
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold text-foreground">{v.name}
                  <span className="ml-2 font-normal text-muted-foreground">{v.wert === 1 ? 'passt sehr gut' : 'passt gut'}{m.dauer_min ? ` · ${m.dauer_min}–${m.dauer_max || m.dauer_min} Min.` : ''}</span>
                </p>
                <p className="text-muted-foreground">{m.kurzbeschreibung}</p>
                {v.hinweis && <p className="italic text-muted-foreground">{v.hinweis}</p>}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onEinsetzen(m); setOffen(false); }}>Einsetzen</Button>
            </div>
          );
        })}
    </div>
  );
}