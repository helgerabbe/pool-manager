import React from 'react';
import { Badge } from '@/components/ui/badge';
import { phasenTypMeta } from '@/lib/stundenPhasen';

/**
 * Verlaufsplan der Stunde (KI-Stunden-Coach): Phase / Zeit / Inhalt &
 * Handlungsschritte / Methode & Sozialform / Material.
 */
export default function StundenVerlaufsplanTabelle({ verlaufsplan = [] }) {
  const gesamt = verlaufsplan.reduce((s, p) => s + (Number(p.zeit_minuten) || 0), 0);

  if (verlaufsplan.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm italic text-muted-foreground">
        Verlaufsplan: noch nicht definiert — beschreiben Sie unten, was Sie vorhaben.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-bold text-foreground">Verlaufsplan</h3>
        <span className="text-xs text-muted-foreground">ca. {gesamt} Minuten gesamt</span>
      </div>
      <div className="divide-y">
        {verlaufsplan.map((p, i) => {
          const meta = phasenTypMeta(p.typ);
          return (
            <div key={i} className="p-4 grid gap-3 md:grid-cols-[200px_1fr_180px]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {i + 1}. {p.phasenname}
                </p>
                {p.zeit_minuten ? (
                  <p className="text-xs text-muted-foreground">ca. {p.zeit_minuten} Min.</p>
                ) : null}
                <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
              </div>
              <p className="text-sm text-foreground whitespace-pre-line">{p.inhalt}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                {p.methode_sozialform && (
                  <p><span className="font-medium">Methode & Sozialform: </span>{p.methode_sozialform}</p>
                )}
                {p.material && <p><span className="font-medium">Material: </span>{p.material}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}