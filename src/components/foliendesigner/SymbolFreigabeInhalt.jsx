import React from 'react';
import { Lock } from 'lucide-react';
import { SYMBOL, FREIGABE_TEXT } from '@/lib/folienSymbole';

/** Vorschau: Piktogramm und Freigabebedingung einer Phase. */
export default function SymbolFreigabeInhalt({ el }) {
  if (el.typ === 'symbol') {
    const s = SYMBOL[el.symbol || 'lesen'];
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <s.icon className="h-3/5 w-3/5" style={{ color: el.farbe }} strokeWidth={1.75} />
        {el.beschriftung !== false && <p className="text-xs font-semibold" style={{ color: el.farbe }}>{s.label}</p>}
      </div>
    );
  }
  const b = el.bedingung || 'lehrkraft';
  const zusatz = b === 'zeit' ? ` (${el.minuten || 10} Min.)` : b === 'anteil' ? ` (${el.anteil || 80} %)` : b === 'code' ? ` (${el.code || '123'})` : '';
  return (
    <div className="flex h-full w-full items-center gap-2 rounded-lg border-2 border-dashed border-accent bg-accent/10 px-3 text-sm text-accent">
      <Lock className="h-4 w-4 shrink-0" /><span><span className="font-semibold">Weiter: </span>{FREIGABE_TEXT[b]}{zusatz}</span>
    </div>
  );
}