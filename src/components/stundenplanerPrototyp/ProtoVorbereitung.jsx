import React from 'react';
import { Package, ListChecks, AlertTriangle, Printer, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Block = ({ icon: Icon, titel, children }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" /> {titel}</p>
    {children}
  </div>
);

/** Schritt 7: Übersicht zum Ausdrucken – Verlauf, Material, Vorbereitung, optional Stolpersteine. */
export default function ProtoVorbereitung({ entwurf, onZurueck, onWeiter }) {
  const [stolper, setStolper] = React.useState(false);
  const v = entwurf.vorbereitung;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Deine Übersicht für „{entwurf.name}“:</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer /> Ausdrucken</Button>
      </div>
      <Block icon={ListChecks} titel="Stundenverlauf">
        <div className="divide-y text-sm">
          {entwurf.phasen.map((ph, i) => (
            <div key={i} className="flex gap-3 py-2"><span className="w-12 shrink-0 font-semibold text-primary">{ph.minuten}′</span>
              <div><p className="font-medium">{ph.name} <span className="font-normal text-muted-foreground">· {ph.sozialform}</span></p><p className="text-muted-foreground">{ph.aktivitaet}</p></div></div>
          ))}
        </div>
      </Block>
      <Block icon={Package} titel="Material">
        <ul className="list-disc space-y-1 pl-5 text-sm">{v.material.map((m) => <li key={m}>{m}</li>)}</ul>
      </Block>
      <Block icon={ListChecks} titel="Vor dem Unterricht">
        <ul className="list-disc space-y-1 pl-5 text-sm">{v.vorher.map((m) => <li key={m}>{m}</li>)}</ul>
      </Block>
      <button className="flex items-center gap-1 text-xs text-primary" onClick={() => setStolper(!stolper)}>
        <ChevronDown className={`h-3 w-3 transition-transform ${stolper ? 'rotate-180' : ''}`} /> Mögliche Stolpersteine anzeigen (optional)
      </button>
      {stolper && (
        <Block icon={AlertTriangle} titel="Darauf achten">
          <div className="space-y-2">{v.stolpersteine.map((s) => <div key={s.problem} className="text-sm"><p className="font-medium">{s.problem}</p><p className="text-muted-foreground">Tipp: {s.tipp}</p></div>)}</div>
        </Block>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={onZurueck}>Zurück zum Entwurf</Button>
        <Button onClick={onWeiter}>Grobplanung abschließen</Button>
      </div>
    </div>
  );
}