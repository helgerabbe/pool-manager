import React from 'react';
import { Play, Hand, Headphones } from 'lucide-react';
import { CI_GRUND, CI_BILDRAHMEN, CI_SCHATTEN, CI_SYMBOL_STIL, CI_MEDIEN, CI_MEDIEN_REGEL } from '@/lib/folienCI';

const FOTO = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400';
const kreis = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

function Rahmen({ titel, children }) {
  const r = CI_BILDRAHMEN;
  return (
    <figure className="space-y-1">
      <div className="relative aspect-video overflow-hidden" style={{ border: `${r.rand}px solid ${r.randfarbe}`, borderRadius: r.ecke, boxShadow: CI_SCHATTEN.sanft }}>
        <img src={FOTO} alt="" className="h-full w-full object-cover" />
        {children}
      </div>
      <figcaption style={{ fontSize: r.unterschrift.groesse, color: r.unterschrift.farbe }}>{titel}</figcaption>
    </figure>
  );
}

/** Vorschau Teil 5b: Medien im einheitlichen Rahmen. */
export default function CiMedienVorschau() {
  return (
    <div className="space-y-4 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="grid gap-4 md:grid-cols-3">
        <Rahmen titel={CI_MEDIEN.bild.name} />
        <Rahmen titel={CI_MEDIEN.video.name}><span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full" style={kreis}><Play className="h-6 w-6" /></span></Rahmen>
        <Rahmen titel={CI_MEDIEN.animation.name}><span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full" style={kreis}><Hand className="h-4 w-4" /></span></Rahmen>
      </div>
      <div className="flex max-w-md items-center gap-3 rounded-xl bg-white px-3 py-2" style={{ boxShadow: CI_SCHATTEN.sanft }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={kreis}><Headphones className="h-4 w-4" /></span>
        <Play className="h-4 w-4" style={{ color: CI_SYMBOL_STIL.farbe }} />
        <div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full w-1/3 rounded-full" style={{ background: '#7FA6D6' }} /></div>
        <span className="text-xs text-muted-foreground">0:42</span>
      </div>
      <p className="text-xs text-muted-foreground">{CI_MEDIEN_REGEL}</p>
    </div>
  );
}