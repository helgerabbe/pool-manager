import React from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

/** Methode über ein Suchfeld finden. */
export default function MethodeWahl({ onWahl }) {
  const [methoden, setMethoden] = React.useState(null);
  const [suche, setSuche] = React.useState('');
  React.useEffect(() => { base44.entities.MethodenKatalog.filter({ quelle: 'methode', ist_aktiv: true }, 'name', 300).then(setMethoden); }, []);
  const q = suche.toLowerCase();
  const treffer = (methoden || []).filter((m) => `${m.name} ${m.kurzbeschreibung || ''}`.toLowerCase().includes(q));
  return (
    <div className="space-y-3">
      <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input autoFocus value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Methode suchen, z. B. Galeriegang" className="pl-8" /></div>
      {!methoden ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <div className="space-y-1">
          {treffer.map((m) => (
            <button key={m.id} onClick={() => onWahl({ titel: m.name, methode: m.name, minuten: m.dauer_min || null })} className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted">
              <span className="text-sm font-medium">{m.name}</span>
              {m.kurzbeschreibung && <span className="block line-clamp-1 text-xs text-muted-foreground">{m.kurzbeschreibung}</span>}
            </button>
          ))}
          {!treffer.length && <p className="py-4 text-center text-sm text-muted-foreground">Keine Methode gefunden.</p>}
        </div>
      )}
    </div>
  );
}