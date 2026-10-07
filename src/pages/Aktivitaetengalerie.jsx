import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { STUFEN } from '@/lib/methodenStufen';
import StufenFilter from '@/components/aktivitaetengalerie/StufenFilter';
import FachFilter from '@/components/aktivitaetengalerie/FachFilter';
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
  const [stufe, setStufe] = React.useState(null);
  const galerie = methoden.filter((m) => m.quelle !== 'poolzeit' && m.ist_aktiv !== false);
  const [fach, setFach] = React.useState(null);
  const passtFach = (m) => !fach || m.fachbezug === 'uebergreifend' || (m.faecher || []).includes(fach);
  const liste = galerie.filter((m) => m.name.toLowerCase().includes(suche.toLowerCase()) && (!stufe || m.stufe === stufe) && passtFach(m));
  const auswahl = galerie.find((m) => m.id === auswahlId) || liste[0];
  const fertig = galerie.filter((m) => m.bauplan_fertig).length;

  return (
    <div className="flex h-full">
      <aside className="sticky top-0 flex max-h-[calc(100dvh-5rem)] w-72 shrink-0 flex-col self-start border-r bg-card">
        <div className="space-y-2 border-b p-4">
          <button onClick={() => setAuswahlId('konzeption')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${auswahlId === 'konzeption' ? 'bg-muted font-semibold' : ''}`}>
            <BookOpen className="h-4 w-4 text-primary" /> Didaktische Konzeption
          </button>
          <h1 className="font-display text-lg font-bold">Methodengalerie</h1>
          <p className="text-xs text-muted-foreground">{fertig} von {galerie.length} Bauplänen geprüft</p>
          <StufenFilter stufe={stufe} setStufe={setStufe} />
          <FachFilter fach={fach} setFach={setFach} />
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
              {m.stufe_pruefen && <span className="text-xs text-orange-600">prüfen</span>}
              {m.stufe && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STUFEN[m.stufe].cls}`} title={STUFEN[m.stufe].name}>{m.stufe}</span>}
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