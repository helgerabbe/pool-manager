import React from 'react';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';

/** Bearbeitbare Liste von Aufgaben (Titel) im Fundament. */
export default function FundamentAufgaben({ titel, liste, onListe }) {
  const setze = (i, w) => onListe(liste.map((a, j) => (j === i ? { ...a, titel: w } : a)));
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold">{titel} <span className="font-normal text-muted-foreground">(optional)</span></span>
      {liste.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={a.titel} onChange={(e) => setze(i, e.target.value)} className="h-8 text-sm" />
          <button onClick={() => onListe(liste.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={() => onListe([...liste, { titel: '', text: '' }])} className="flex items-center gap-1 text-xs text-primary"><Plus className="h-3 w-3" /> Hinzufügen</button>
    </div>
  );
}