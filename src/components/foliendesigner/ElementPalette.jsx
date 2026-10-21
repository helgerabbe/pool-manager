import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FOLIEN_GRUPPEN } from '@/lib/folienElemente';

/** Auswahl der Folienelemente: Gruppenleiste links, darunter nur die Elemente der gewählten Gruppe oder Suchtreffer. */
export default function ElementPalette() {
  const [gruppe, setGruppe] = React.useState(0);
  const [suche, setSuche] = React.useState('');
  const s = suche.trim().toLowerCase();
  const elemente = s ? FOLIEN_GRUPPEN.flatMap((g) => g.elemente).filter((e) => e.label.toLowerCase().includes(s)) : FOLIEN_GRUPPEN[gruppe].elemente;
  const g = FOLIEN_GRUPPEN[gruppe];

  return (
    <aside className="flex shrink-0 border-r border-border bg-card">
      <nav className="flex w-16 flex-col gap-1 overflow-y-auto border-r border-border p-2">
        {FOLIEN_GRUPPEN.map((gr, i) => {
          const Icon = gr.elemente[0].icon;
          return (
            <button key={gr.titel} title={gr.titel} onClick={() => { setGruppe(i); setSuche(''); }}
              className={`flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-[10px] leading-tight ${i === gruppe && !s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              <Icon className="h-5 w-5" />{gr.titel.split(' ')[0]}
            </button>
          );
        })}
      </nav>
      <div className="flex w-56 flex-col">
        <div className="space-y-2 border-b border-border p-3">
          <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Element suchen" className="h-9 pl-8" /></div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s ? `${elemente.length} Treffer` : g.titel}</p>
          {!s && g.hinweis && <p className="text-xs text-muted-foreground">{g.hinweis}</p>}
        </div>
        <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
          {elemente.map(({ typ, label, icon: Icon }) => (
            <div key={typ} draggable onDragStart={(e) => e.dataTransfer.setData('neu', typ)}
              className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-border bg-background p-2 text-center text-xs hover:border-primary hover:bg-primary/5">
              <Icon className="h-5 w-5 text-primary" />{label}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}