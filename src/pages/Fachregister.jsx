import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import EinheitAnlegen from '@/components/fachregister/EinheitAnlegen';
import EinheitenListe from '@/components/fachregister/EinheitenListe';

const JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

/** Inhaltliches Fachregister: Fach → Jahrgang → Einheiten (nur Admins). */
export default function Fachregister() {
  const [fach, setFach] = React.useState(null);
  const [jg, setJg] = React.useState('5');
  const istAdmin = useRBAC().realRolle === ROLLEN.ADMIN;
  const { data: faecher = [], isLoading } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list(),
  });
  const aktiveFaecher = faecher.filter((f) => f.ist_aktiv !== false).map((f) => f.name).sort();
  const gewaehlt = fach || aktiveFaecher[0];
  const { data: einheiten = [], refetch } = useQuery({
    queryKey: ['fachregister', gewaehlt],
    queryFn: () => base44.entities.FachregisterEinheit.filter({ fach: gewaehlt }, 'reihenfolge', 500),
    enabled: !!gewaehlt,
  });
  const imJahrgang = einheiten.filter((e) => e.jahrgangsstufe === jg);

  const anlegen = async (titel) => {
    await base44.entities.FachregisterEinheit.create({ fach: gewaehlt, jahrgangsstufe: jg, titel, reihenfolge: imJahrgang.length });
    refetch();
  };
  const loeschen = async (id) => { await base44.entities.FachregisterEinheit.delete(id); refetch(); };

  if (isLoading) return <Loader2 className="m-8 h-6 w-6 animate-spin" />;

  return (
    <div className="mx-auto flex max-w-6xl gap-8">
      <aside className="w-56 shrink-0 space-y-1">
        <h1 className="mb-4 font-display text-xl font-bold">Fachregister</h1>
        {aktiveFaecher.map((f) => (
          <button key={f} onClick={() => setFach(f)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${gewaehlt === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{f}</button>
        ))}
      </aside>
      <section className="flex-1 space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">{gewaehlt}</h2>
          <p className="text-sm text-muted-foreground">Inhaltliche Einheiten nach Jahrgang</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {JAHRGAENGE.map((j) => {
            const n = einheiten.filter((e) => e.jahrgangsstufe === j).length;
            return (
              <button key={j} onClick={() => setJg(j)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${jg === j ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary'}`}>
                Jg. {j}{n > 0 && <span className="ml-1 opacity-70">({n})</span>}
              </button>
            );
          })}
        </div>
        {istAdmin && <EinheitAnlegen onAnlegen={anlegen} />}
        <EinheitenListe einheiten={imJahrgang} onLoeschen={istAdmin ? loeschen : null} />
      </section>
    </div>
  );
}