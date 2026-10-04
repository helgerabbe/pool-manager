import React from 'react';
import { Lightbulb, BookOpen, Paperclip } from 'lucide-react';
import PhasenKommentar from './PhasenKommentar';
import UmsetzungsWahl from './UmsetzungsWahl';
import KatalogBausteinWahl from './KatalogBausteinWahl';

/** Eine Phase der Feinplanung. */
export default function FeinPhase({ p, onAendern, onNeuPlanen, laedt, materialien = [], onMaterial }) {
  const [ueber, setUeber] = React.useState(false);
  const drop = (e) => { e.preventDefault(); setUeber(false); const i = e.dataTransfer.getData('text/material'); if (i !== '') onMaterial(Number(i)); };
  return (
    <li onDragOver={(e) => { e.preventDefault(); setUeber(true); }} onDragLeave={() => setUeber(false)} onDrop={drop}
      className={`rounded-lg border bg-card p-3 ${laedt ? 'opacity-60' : ''} ${ueber ? 'border-accent ring-2 ring-accent/40' : ''}`}>
      <p className="text-xs text-muted-foreground">{p.phase} · <span className="font-medium text-foreground">{p.minuten} Min.</span></p>
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-primary" />{p.methode}
        <UmsetzungsWahl optionen={p.optionen} gewaehlt={p.umsetzung} onWahl={(umsetzung) => onAendern({ umsetzung })} />
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Aufgabe: {p.aktivitaet}</p>
      {(p.umsetzung || '').startsWith('digital') && (
        <KatalogBausteinWahl auswahl={p.katalog_auswahl} wert={p.aktivitaet_id} onWahl={(aktivitaet_id) => onAendern({ aktivitaet_id })} />
      )}
      <p className="mt-1.5 text-xs">{p.ablauf}</p>
      {materialien.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {materialien.map((m, i) => <span key={i} className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs"><Paperclip className="h-3 w-3 text-accent" />{m.name}</span>)}
        </div>
      )}
      <p className="mt-1 flex gap-2 text-xs"><Lightbulb className="h-3.5 w-3.5 shrink-0 text-accent" />{p.begruendung}</p>
      <PhasenKommentar hinweise={p.hinweise} onHinweise={(hinweise) => onAendern({ hinweise })} onNeuPlanen={onNeuPlanen} laedt={laedt} />
    </li>
  );
}