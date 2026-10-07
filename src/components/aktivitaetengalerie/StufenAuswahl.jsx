import React from 'react';
import { STUFEN } from '@/lib/methodenStufen';
import { Switch } from '@/components/ui/switch';

/** Stufe des Methodenrasters und Zusatzvermerke einer Methode. */
export default function StufenAuswahl({ werte, setze }) {
  const s = STUFEN[werte.stufe];
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">Einordnung im Methodenraster</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(STUFEN).map(([k, v]) => (
          <button key={k} onClick={() => setze('stufe', Number(k))}
            className={`rounded-lg border px-3 py-1.5 text-sm ${werte.stufe === Number(k) ? `${v.cls} border-transparent font-semibold` : 'hover:bg-muted'}`}>
            Stufe {k}: {v.name}
          </button>
        ))}
      </div>
      {s && <p className="text-xs text-muted-foreground">{s.frage}</p>}
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><Switch checked={!!werte.auch_kurzform} onCheckedChange={(v) => setze('auch_kurzform', v)} /> Auch als Kurzform</label>
        <label className="flex items-center gap-2"><Switch checked={!!werte.ausbaubar} onCheckedChange={(v) => setze('ausbaubar', v)} /> Ausbaubar</label>
        <label className="flex items-center gap-2"><Switch checked={!!werte.stufe_pruefen} onCheckedChange={(v) => setze('stufe_pruefen', v)} /> Einordnung prüfen</label>
      </div>
    </div>
  );
}