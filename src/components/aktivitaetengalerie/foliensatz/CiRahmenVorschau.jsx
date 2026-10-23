import React from 'react';
import { CI_GRUND, CI_BILDRAHMEN, CI_ABSTAND, CI_SCHATTEN } from '@/lib/folienCI';

const FOTO = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70';

/** Vorschau Teil 5: Bildrahmen, Abstände und Schatten (statisch). */
export default function CiRahmenVorschau() {
  const r = CI_BILDRAHMEN;
  return (
    <div className="space-y-4 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex flex-wrap items-start gap-6">
        <figure className="w-56">
          <img src={FOTO} alt="Beispielfoto Stadt" className="w-full object-cover" style={{ border: `${r.rand}px solid ${r.randfarbe}`, borderRadius: r.ecke, boxShadow: CI_SCHATTEN.sanft }} />
          <figcaption className="mt-2" style={{ fontSize: r.unterschrift.groesse, color: r.unterschrift.farbe }}>Bildunterschrift: klein, grau</figcaption>
        </figure>
        <div className="flex gap-4">
          {Object.entries(CI_SCHATTEN).map(([k, s]) => (
            <div key={k} className="flex h-20 w-24 items-center justify-center rounded-xl bg-card text-xs" style={{ boxShadow: s }}>{k}</div>
          ))}
        </div>
      </div>
      <ul className="text-xs text-muted-foreground">
        {Object.entries(CI_ABSTAND).map(([k, v]) => <li key={k}>{k.replace('_', ' ')}: {v} px</li>)}
      </ul>
      <p className="text-xs text-muted-foreground">Alle Abstände folgen einem 8er-Raster. Schatten „gehoben“ nur für Elemente, die gerade bewegt oder ausgewählt werden.</p>
    </div>
  );
}