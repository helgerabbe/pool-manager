import React from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Plus, Presentation, ListChecks, Search } from 'lucide-react';

/** Auswahl der Bausteine: Methoden, Inhaltsfolie, Übungen aus den Kern- und Teilaufgaben. */
export default function BausteinPalette({ fundament, onHinzu }) {
  const [methoden, setMethoden] = React.useState([]);
  const [suche, setSuche] = React.useState('');
  React.useEffect(() => { base44.entities.MethodenKatalog.filter({ quelle: 'methode', ist_aktiv: true }, 'name', 300).then(setMethoden); }, []);
  const treffer = methoden.filter((m) => m.name.toLowerCase().includes(suche.toLowerCase())).slice(0, 40);
  const aufgaben = [...(fundament.kernaufgaben || []).map((a) => ({ ...a, kern: true })), ...(fundament.teilaufgaben || [])];
  const Zeile = ({ titel, sub, onClick }) => (
    <button onClick={onClick} className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted">
      <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
      <span className="min-w-0"><span className="block truncate text-sm">{titel}</span>{sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}</span>
    </button>
  );
  return (
    <div className="space-y-5">
      <button onClick={() => onHinzu('inhalt', { titel: 'Lehrkraft erklärt' })} className="flex w-full items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm font-medium hover:bg-accent/10">
        <Presentation className="h-4 w-4 text-accent" /> Inhaltsfolie einfügen
      </button>
      <div>
        <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-chart-3"><ListChecks className="h-3.5 w-3.5" /> Übungen aus dem Fundament</p>
        {aufgaben.length ? aufgaben.map((a, i) => <Zeile key={i} titel={a.titel} sub={a.kern ? 'Kernaufgabe' : 'Teilaufgabe'} onClick={() => onHinzu('uebung', { titel: a.titel, beschreibung: a.text })} />)
          : <p className="px-2 text-xs text-muted-foreground">Noch keine Kern- oder Teilaufgaben im Fundament.</p>}
        <Zeile titel="Eigene Übung" onClick={() => onHinzu('uebung', { titel: 'Übung' })} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Methoden</p>
        <div className="relative mb-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Methode suchen" className="h-8 pl-7 text-sm" /></div>
        {treffer.map((m) => <Zeile key={m.id} titel={m.name} sub={m.kurzbeschreibung} onClick={() => onHinzu('methode', { titel: m.name, methode: m.name, minuten: m.dauer_min || null })} />)}
      </div>
    </div>
  );
}