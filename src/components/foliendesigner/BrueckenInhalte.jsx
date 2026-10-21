import React from 'react';
import { Camera, Mic, Hand } from 'lucide-react';

/** Vorschau: Foto hochladen, Audioaufnahme, Tabelle, Melden. */
export default function BrueckenInhalte({ typ }) {
  if (typ === 'foto') return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background text-sm text-muted-foreground">
      <Camera className="h-8 w-8 text-primary" />Foto aufnehmen oder hochladen
    </div>
  );
  if (typ === 'audioaufnahme') return (
    <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground"><Mic className="h-5 w-5" /></span>
      <div className="flex flex-1 items-end gap-0.5">{[3, 6, 4, 8, 5, 7, 3, 6, 4, 2].map((h, i) => <span key={i} className="w-1.5 rounded-full bg-muted-foreground/40" style={{ height: h * 3 }} />)}</div>
      <span className="text-xs tabular-nums text-muted-foreground">0:00</span>
    </div>
  );
  if (typ === 'melden') return (
    <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"><Hand className="h-5 w-5" />Ich melde mich</div>
  );
  return (
    <table className="h-full w-full border-collapse text-xs">
      <thead><tr>{['Versuch', 'Messwert', 'Beobachtung'].map((k) => <th key={k} className="border border-border bg-muted px-2 py-1 text-left">{k}</th>)}</tr></thead>
      <tbody>{[1, 2, 3].map((n) => <tr key={n}><td className="border border-border px-2 py-1">{n}</td><td className="border border-border bg-background" /><td className="border border-border bg-background" /></tr>)}</tbody>
    </table>
  );
}