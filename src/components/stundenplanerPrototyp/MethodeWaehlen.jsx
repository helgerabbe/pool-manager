import React from 'react';
import { Search, Loader2, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Lehrkraft wählt gezielt eine Methode aus der Galerie (Suche nach Name). */
export default function MethodeWaehlen({ onWahl }) {
  const [offen, setOffen] = React.useState(false);
  const [suche, setSuche] = React.useState('');
  const [treffer, setTreffer] = React.useState([]);
  const [laedt, setLaedt] = React.useState(false);

  React.useEffect(() => {
    if (!offen) return;
    const t = setTimeout(async () => {
      setLaedt(true);
      const q = { quelle: { $ne: 'poolzeit' }, ist_aktiv: { $ne: false } };
      if (suche.trim()) q.name = { $regex: suche.trim(), $options: 'i' };
      const page = await base44.entities.MethodenKatalog.filter(q, { sort: 'name', limit: 10, fields: ['name', 'stufe', 'kurzbeschreibung', 'dauer_min', 'dauer_max'] });
      setTreffer(page.items); setLaedt(false);
    }, 300);
    return () => clearTimeout(t);
  }, [suche, offen]);

  if (!offen) return <Button size="sm" variant="outline" onClick={() => setOffen(true)}><Target /> Bestimmte Methode wählen</Button>;
  return (
    <div className="w-full space-y-2 rounded-xl border bg-card p-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input autoFocus className="pl-8" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Methode suchen, z. B. Galeriegang" />
      </div>
      {laedt ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Suche …</p>
        : treffer.length === 0 ? <p className="text-xs text-muted-foreground">Keine Methode gefunden.</p>
        : treffer.map((m) => (
          <button key={m.id} onClick={() => { onWahl(m); setOffen(false); }} className="block w-full rounded-lg border p-2 text-left text-sm hover:border-primary/40">
            <span className="font-semibold">{m.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{m.stufe ? `Stufe ${m.stufe}` : ''}{m.dauer_min ? ` · ${m.dauer_min}–${m.dauer_max || m.dauer_min} Min.` : ''}</span>
            {m.kurzbeschreibung && <span className="block text-xs text-muted-foreground line-clamp-1">{m.kurzbeschreibung}</span>}
          </button>
        ))}
      <button className="text-xs text-muted-foreground" onClick={() => setOffen(false)}>Abbrechen</button>
    </div>
  );
}