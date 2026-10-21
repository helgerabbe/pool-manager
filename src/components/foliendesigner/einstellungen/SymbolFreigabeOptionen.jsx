import React from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import FarbWahl from './FarbWahl';
import { FOLIEN_SYMBOLE, FREIGABE_BEDINGUNGEN } from '@/lib/folienSymbole';

const Regler = ({ label, wert, min, max, step, setze }) => (
  <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">{label}</p>
    <Slider min={min} max={max} step={step} value={[wert]} onValueChange={([v]) => setze(v)} /></div>
);

/** Einstellungen: Piktogramm wählen bzw. Freigabebedingung der Phase festlegen. */
export default function SymbolFreigabeOptionen({ el, setze }) {
  if (el.typ === 'symbol') return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1">
        {FOLIEN_SYMBOLE.map(([k, label, Icon]) => (
          <button key={k} title={label} onClick={() => setze({ symbol: k })}
            className={`flex aspect-square items-center justify-center rounded-md border ${(el.symbol || 'lesen') === k ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary'}`}><Icon className="h-4 w-4" /></button>
        ))}
      </div>
      <label className="flex items-center justify-between text-sm">Beschriftung zeigen<Switch checked={el.beschriftung !== false} onCheckedChange={(v) => setze({ beschriftung: v })} /></label>
      <FarbWahl wert={el.farbe} setze={(v) => setze({ farbe: v })} />
    </div>
  );
  const b = el.bedingung || 'lehrkraft';
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Wann geht es nach dieser Folie weiter? Gilt nur hier und hat Vorrang vor der Freigabe der Organisation.</p>
      <div className="space-y-1">
        {FREIGABE_BEDINGUNGEN.map(([k, label]) => (
          <button key={k} onClick={() => setze({ bedingung: k })} className={`block w-full rounded-md border px-2 py-1 text-left text-sm ${b === k ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary'}`}>{label}</button>
        ))}
      </div>
      {b === 'zeit' && <Regler label={`Zeit: ${el.minuten || 10} Min.`} min={1} max={45} step={1} wert={el.minuten || 10} setze={(v) => setze({ minuten: v })} />}
      {b === 'anteil' && <Regler label={`Fertig sein müssen: ${el.anteil || 80} %`} min={10} max={100} step={10} wert={el.anteil || 80} setze={(v) => setze({ anteil: v })} />}
      {b === 'code' && <Input value={el.code || ''} maxLength={3} onChange={(e) => setze({ code: e.target.value.replace(/\D/g, '') })} placeholder="Dreistelliger Code" />}
      {b === 'geloest' && <p className="text-xs text-muted-foreground">Braucht auf dieser Folie ein Element mit der Funktion „Übung“.</p>}
      <label className="flex items-center justify-between text-sm">Lehrkraft darf vorzeitig freigeben<Switch checked={el.vorzeitig !== false} onCheckedChange={(v) => setze({ vorzeitig: v })} /></label>
    </div>
  );
}