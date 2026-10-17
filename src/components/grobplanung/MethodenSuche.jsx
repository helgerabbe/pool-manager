import React from 'react';
import { Search, Loader2, Wand2, X, Check, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import { kiMethodenFinden } from '@/lib/kiGrobplanung';

/** Methode (oder Ritual) suchen, per Idee/Spracheingabe finden lassen oder – bei Ritualen – frei beschreiben. */
export default function MethodenSuche({ wahl, setWahl, assistent, eigenErlaubt, ideePlatzhalter, hinweis }) {
  const [suche, setSuche] = React.useState('');
  const [treffer, setTreffer] = React.useState([]);
  const [idee, setIdee] = React.useState('');
  const [kiTreffer, setKiTreffer] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);
  React.useEffect(() => {
    if (!suche.trim()) return setTreffer([]);
    const t = setTimeout(() => base44.entities.MethodenKatalog.filter({ quelle: { $ne: 'poolzeit' }, ist_aktiv: { $ne: false }, name: { $regex: suche.trim(), $options: 'i' } }, { sort: 'name', limit: 8, fields: ['name', 'kurzbeschreibung'] }).then((p) => setTreffer(p.items)), 300);
    return () => clearTimeout(t);
  }, [suche]);
  const finden = async () => { setLaedt(true); setKiTreffer(await kiMethodenFinden({ assistent, beschreibung: idee }).catch(() => [])); setLaedt(false); };
  const Treffer = ({ m }) => (
    <button onClick={() => setWahl({ name: m.name, kurzbeschreibung: m.kurzbeschreibung })} className="block w-full rounded-lg border bg-card p-2 text-left text-sm hover:border-primary/40">
      <span className="font-semibold">{m.name}</span>{m.kurzbeschreibung && <span className="block line-clamp-1 text-xs text-muted-foreground">{m.kurzbeschreibung}</span>}
    </button>
  );
  return (
    <div className="space-y-4">
      {hinweis && (
        <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">{hinweis}</p>
        </div>
      )}
      {wahl && (
        <div className="flex items-start gap-2 rounded-xl border border-chart-3/40 bg-chart-3/10 p-3 text-sm">
          <Check className="mt-0.5 h-4 w-4 text-chart-3" />
          <div className="flex-1"><p className="font-semibold">{wahl.name}</p>{wahl.kurzbeschreibung && <p className="text-xs text-muted-foreground">{wahl.kurzbeschreibung}</p>}</div>
          <button onClick={() => setWahl(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Nach Namen suchen, z. B. Galeriegang" />
      </div>
      {treffer.map((m) => <Treffer key={m.id} m={m} />)}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Oder beschreib deine Idee</p>
        <FreitextMitSprache value={idee} onChange={setIdee} rows={2} placeholder={ideePlatzhalter} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!idee.trim() || laedt} onClick={finden}>{laedt ? <Loader2 className="animate-spin" /> : <Wand2 />} Passende finden</Button>
          {eigenErlaubt
            ? <Button size="sm" variant="ghost" disabled={!idee.trim()} onClick={() => setWahl({ name: idee.trim(), eigen: true })}>Als eigenes Ritual übernehmen</Button>
            : <Button size="sm" variant="ghost" disabled={!idee.trim()} onClick={() => setWahl({ name: 'Methodische Idee', kurzbeschreibung: idee.trim(), idee: true })}>Erst mal nur als Idee übernehmen</Button>}
        </div>
        {kiTreffer && (kiTreffer.length ? <><p className="text-xs text-muted-foreground">Meinst du eine davon?</p>{kiTreffer.map((m) => <Treffer key={m.id} m={m} />)}</> : <p className="text-xs text-muted-foreground">Dazu habe ich im Katalog nichts gefunden.</p>)}
      </div>
    </div>
  );
}