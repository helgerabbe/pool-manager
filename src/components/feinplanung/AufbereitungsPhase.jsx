import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { AUFBEREITUNG_FELDER } from '@/lib/kiAufbereitung';
import { UMSETZUNGEN } from '@/lib/kiUmsetzung';

/** Eine Phase mit bearbeitbarem Impuls, Arbeitsauftrag und Material. */
export default function AufbereitungsPhase({ phase, nr, onAendern }) {
  const umsetzung = UMSETZUNGEN.find((u) => u.key === phase.umsetzung)?.name;
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold">{nr}. {phase.name}
        {umsetzung && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{umsetzung}</span>}
      </p>
      {AUFBEREITUNG_FELDER.map((f) => (
        <div key={f.key} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{f.titel}</p>
          <Textarea rows={3} value={phase[f.key] || ''} onChange={(e) => onAendern({ [f.key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}