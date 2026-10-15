import React from 'react';
import { Printer, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { UMSETZUNG_STUFEN } from '@/lib/stundenplanerPrototypDaten';

/** Getrennte Planungsebene: analog oder digital umsetzen (nur Beispielansicht). */
export default function ProtoUmsetzung({ phasen }) {
  const [stufe, setStufe] = React.useState(null);
  const [digital, setDigital] = React.useState({});
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Die Stunde steht. Jetzt geht es nur noch darum, <em>wie</em> sie umgesetzt wird.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {UMSETZUNG_STUFEN.map((s) => (
          <button key={s.key} onClick={() => setStufe(s.key)}
            className={`rounded-xl border p-4 text-left transition-all ${stufe === s.key ? 'border-primary bg-primary/5' : 'hover:border-primary/40'}`}>
            <p className="text-sm font-semibold">{s.name}</p><p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
          </button>
        ))}
      </div>
      {stufe === 'analog' && <Button variant="outline" onClick={() => window.print()}><Printer /> Verlaufsplan drucken</Button>}
      {stufe === 'teil' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Welche Phasen sollen digital unterstützt werden?</p>
          {phasen.map((ph, i) => (
            <label key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              {ph.name} <Switch checked={!!digital[i]} onCheckedChange={(v) => setDigital({ ...digital, [i]: v })} />
            </label>
          ))}
        </div>
      )}
      {stufe && stufe !== 'analog' && (
        <p className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground"><Tablet className="h-4 w-4" /> Im Prototyp endet der Ablauf hier – die digitale Ausgestaltung folgt als eigener Planungsschritt.</p>
      )}
    </div>
  );
}