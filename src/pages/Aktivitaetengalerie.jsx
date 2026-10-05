import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import DidaktischeKonzeption from '@/components/aktivitaetengalerie/DidaktischeKonzeption';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import MethodeBauplanForm from '@/components/aktivitaetengalerie/MethodeBauplanForm';

/** Aktivitätengalerie: Bauplan je Unterrichtsmethode pflegen. */
export default function Aktivitaetengalerie() {
  const [suche, setSuche] = React.useState('');
  const [auswahlId, setAuswahlId] = React.useState(null);
  const { data: methoden = [], isLoading, refetch } = useQuery({
    queryKey: ['methodenKatalog'],
    queryFn: () => base44.entities.MethodenKatalog.list('reihenfolge', 500),
  });
  const liste = methoden.filter((m) => m.name.toLowerCase().includes(suche.toLowerCase()));
  const auswahl = methoden.find((m) => m.id === auswahlId) || liste[0];
  const fertig = methoden.filter((m) => m.bauplan_fertig).length;

  return (
    <div className="flex h-full">
      <aside className="sticky top-0 flex max-h-[calc(100dvh-5rem)] w-72 shrink-0 flex-col self-start border-r bg-card">
        <div className="space-y-2 border-b p-4">
          <button onClick={() => setAuswahlId('konzeption')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${auswahlId === 'konzeption' ? 'bg-muted font-semibold' : ''}`}>
            <BookOpen className="h-4 w-4 text-primary" /> Didaktische Konzeption
          </button>
          <h1 className="font-display text-lg font-bold">Aktivitätengalerie</h1>
          <p className="text-xs text-muted-foreground">{fertig} von {methoden.length} Bauplänen geprüft</p>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suchen …" className="pl-8" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && <Loader2 className="m-4 h-5 w-5 animate-spin" />}
          {liste.map((m) => (
            <button key={m.id} onClick={() => setAuswahlId(m.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${auswahl?.id === m.id ? 'bg-muted font-semibold' : ''} ${m.quelle === 'poolzeit' ? 'border-l-4 border-bundle' : ''}`}>
              {m.bauplan_fertig ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="flex-1 truncate">{m.name}</span>
              {m.quelle === 'poolzeit' && <span className="rounded bg-bundle-soft px-1.5 py-0.5 text-[10px] font-semibold text-bundle">Poolzeit</span>}
              <span className="text-xs text-muted-foreground">{m.modus}</span>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {auswahlId === 'konzeption' ? <DidaktischeKonzeption /> : auswahl ? <MethodeBauplanForm key={auswahl.id} methode={auswahl} onGespeichert={refetch} /> : !isLoading && <p className="p-8 text-sm text-muted-foreground">Keine Methoden gefunden.</p>}
      </main>
    </div>
  );
}