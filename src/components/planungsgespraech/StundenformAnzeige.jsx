import React from 'react';
import { Button } from '@/components/ui/button';
import { STATUS_NAME } from '@/lib/stundenformGespraech';
import { INFORMATIONS_PROFILE } from '@/lib/informationsProfile';

const FARBE = { herausgehoert: 'bg-muted text-muted-foreground', empfohlen: 'bg-primary/10 text-primary', vorlaeufig: 'bg-accent/15 text-accent', festgelegt: 'bg-chart-3/15 text-chart-3' };

/** Zeigt die erkannte Stundenform; die Lehrkraft kann vorläufig weiterplanen oder festlegen. */
export default function StundenformAnzeige({ stundenform, onStatus }) {
  if (!stundenform?.form) return null;
  const { form, variante, status, begruendung } = stundenform;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
      <span className="font-semibold">{INFORMATIONS_PROFILE[form]?.name || form}{variante ? ` · ${variante.replace('.', ' · ')}` : ''}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${FARBE[status] || FARBE.herausgehoert}`}>{STATUS_NAME[status] || status}</span>
      {begruendung && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={begruendung}>{begruendung}</span>}
      {status !== 'festgelegt' && (
        <span className="ml-auto flex gap-1">
          {status !== 'vorlaeufig' && <Button size="sm" variant="outline" onClick={() => onStatus('vorlaeufig')}>Vorläufig so</Button>}
          <Button size="sm" onClick={() => onStatus('festgelegt')}>Festlegen</Button>
        </span>
      )}
    </div>
  );
}