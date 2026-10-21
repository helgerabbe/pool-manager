import React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ARTEN = [['text', 'Text'], ['bruch', 'Bruch'], ['wurzel', 'Wurzel'], ['potenz', 'Hochgestellt'], ['index', 'Tiefgestellt']];
const ZWEI = { bruch: ['Zähler', 'Nenner'], potenz: ['Basis', 'Hochzahl'], index: ['Basis', 'Index'] };

/** Formel aus Bausteinen: Text, Bruch, Wurzel, Hoch- und Tiefgestelltes. */
export default function FormelEditor({ teile, setze }) {
  const aendern = (i, p) => setze(teile.map((t, j) => (j === i ? { ...t, ...p } : t)));
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Formel-Bausteine</p>
      {teile.map((t, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="w-20 shrink-0 text-xs">{ARTEN.find((a) => a[0] === t.art)[1]}</span>
          <Input className="h-8" value={t.a} placeholder={ZWEI[t.art]?.[0] || 'Inhalt'} onChange={(e) => aendern(i, { a: e.target.value })} />
          {ZWEI[t.art] && <Input className="h-8" value={t.b} placeholder={ZWEI[t.art][1]} onChange={(e) => aendern(i, { b: e.target.value })} />}
          <button type="button" onClick={() => setze(teile.filter((_, j) => j !== i))}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1">
        {ARTEN.map(([k, l]) => <Button key={k} size="sm" variant="outline" onClick={() => setze([...teile, { art: k, a: '', b: '' }])}>+ {l}</Button>)}
      </div>
    </div>
  );
}