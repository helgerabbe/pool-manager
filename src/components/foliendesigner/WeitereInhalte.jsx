import React from 'react';
import { RotateCw } from 'lucide-react';

const WORTE = [['Teamarbeit', 'text-2xl font-bold text-primary'], ['Ideen', 'text-lg text-accent'], ['Zeit', 'text-sm text-muted-foreground'], ['Mut', 'text-xl font-semibold text-chart-3'], ['Fragen', 'text-base text-chart-4'], ['Neugier', 'text-sm text-primary']];

/** Vorschau: Zeichenfläche, Raster, Wortwolke, Karteikarte (ohne Funktion). */
export default function WeitereInhalte({ typ }) {
  if (typ === 'zeichenflaeche') return (
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex gap-1">{['bg-foreground', 'bg-primary', 'bg-accent', 'bg-chart-3'].map((c) => <span key={c} className={`h-4 w-4 rounded-full ${c}`} />)}<span className="ml-auto text-xs text-muted-foreground">Radierer</span></div>
      <div className="relative flex-1 rounded-md border border-input bg-background"><svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full"><path d="M10,40 L30,15 L55,35 L85,10" fill="none" className="stroke-primary" strokeWidth="1.5" /></svg></div>
    </div>
  );
  if (typ === 'raster') return (
    <div className="grid h-full w-full grid-cols-3 gap-1">
      {['Begriffe', 'Formeln', 'Personen'].map((k) => <div key={k} className="flex items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">{k}</div>)}
      {[100, 100, 100, 200, 200, 200].map((p, i) => <div key={i} className={`flex items-center justify-center rounded border border-border text-sm font-bold ${i === 1 ? 'bg-muted text-muted-foreground line-through' : 'bg-background text-accent'}`}>{p}</div>)}
    </div>
  );
  if (typ === 'wortwolke') return (
    <div className="flex h-full w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg bg-muted/50 p-2">
      {WORTE.map(([w, k]) => <span key={w} className={k}>{w}</span>)}
    </div>
  );
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-xl border-2 border-primary bg-background p-3 shadow-sm">
      <p className="text-center font-semibold">Photosynthese</p>
      <span className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-muted-foreground"><RotateCw className="h-3 w-3" />Umdrehen</span>
    </div>
  );
}