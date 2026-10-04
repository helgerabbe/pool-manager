import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const wert = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

/**
 * Eine Fassung (alt ODER neu) einer Stelle. Offene Aufgaben werden gerendert,
 * Aktivitäten als Feldliste; geänderte Felder sind markiert.
 * Der Ref zeigt auf das scrollbare Element (iframe bzw. div).
 */
const BaumeisterAnsicht = forwardRef(function BaumeisterAnsicht({ art, inhalt, vergleich, formSchema = [], className }, ref) {
  if (art === 'neu' && !inhalt) {
    return (
      <div ref={ref} className={cn('h-full flex items-center justify-center text-sm text-muted-foreground bg-card', className)}>
        Diese Aufgabe gibt es bisher noch nicht.
      </div>
    );
  }
  if (art === 'offen' || art === 'neu') {
    const doc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:12px;font-family:sans-serif">${inhalt || ''}</body></html>`;
    return (
      <iframe
        ref={ref}
        srcDoc={doc}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Aufgabe"
        className={cn('w-full h-full border-0 bg-white', className)}
      />
    );
  }
  const labels = new Map(formSchema.map((f) => [f.field_name, f.label]));
  const keys = [...new Set([...Object.keys(inhalt || {}), ...Object.keys(vergleich || {})])];
  return (
    <div ref={ref} className={cn('h-full overflow-y-auto p-3 space-y-2 bg-card', className)}>
      {keys.map((k) => {
        const geaendert = wert(inhalt?.[k] ?? '') !== wert(vergleich?.[k] ?? '');
        return (
          <div key={k} className={cn('rounded-md border p-2', geaendert ? 'border-accent bg-accent/10' : 'border-border')}>
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">{labels.get(k) || k}</div>
            <pre className="text-xs whitespace-pre-wrap break-words font-inter">{wert(inhalt?.[k] ?? '—')}</pre>
          </div>
        );
      })}
    </div>
  );
});

export default BaumeisterAnsicht;