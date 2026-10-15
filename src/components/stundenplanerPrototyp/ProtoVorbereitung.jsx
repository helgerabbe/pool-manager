import React from 'react';
import { Package, ListChecks, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Block = ({ icon: Icon, titel, children }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" /> {titel}</p>
    {children}
  </div>
);

/** Schritt 4: Was brauche ich, damit das morgen gut läuft? */
export default function ProtoVorbereitung({ entwurf, onZurueck, onWeiter }) {
  const v = entwurf.vorbereitung;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">So läuft „{entwurf.name}“ morgen gut:</p>
      <Block icon={Package} titel="Material">
        <ul className="list-disc space-y-1 pl-5 text-sm">{v.material.map((m) => <li key={m}>{m}</li>)}</ul>
      </Block>
      <Block icon={ListChecks} titel="Vor dem Unterricht">
        <ul className="list-disc space-y-1 pl-5 text-sm">{v.vorher.map((m) => <li key={m}>{m}</li>)}</ul>
      </Block>
      <Block icon={AlertTriangle} titel="Darauf achten">
        <div className="space-y-2">
          {v.stolpersteine.map((s) => (
            <div key={s.problem} className="text-sm"><p className="font-medium">{s.problem}</p><p className="text-muted-foreground">Tipp: {s.tipp}</p></div>
          ))}
        </div>
      </Block>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onZurueck}>Andere Fassung ansehen</Button>
        <Button onClick={onWeiter}>Das mache ich so – weiter zur Umsetzung</Button>
      </div>
    </div>
  );
}