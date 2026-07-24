import React from 'react';

/**
 * Read-Only-Übersicht des Zuordnungstrainings im Aktivitäts-Panel (Tab 4):
 * Anweisung, Trainings-Parameter und die Liste aller hinterlegten Paare.
 */
export default function ZuordnungstrainingReadOnly({ fieldValues = {} }) {
  const pairs = Array.isArray(fieldValues.training_pairs) ? fieldValues.training_pairs : [];
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      {fieldValues.instruction && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
          <p className="whitespace-pre-wrap leading-relaxed">{fieldValues.instruction}</p>
        </div>
      )}
      {pairs.length > 0 ? (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {pairs.length} Zuordnungspaare · Runden zu {fieldValues.runden_groesse || 6} · jedes Paar {fieldValues.meister_schwelle || 2}× richtig
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {pairs.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/20 border border-border">
                <span className="shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate font-medium">
                  {(p.left_typ || 'text') === 'text'
                    ? (p.left_text || <em className="text-muted-foreground">leer</em>)
                    : p.left_typ === 'bild' ? '🖼️ Bild' : '🔊 Audio'}
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="flex-1 min-w-0 truncate text-muted-foreground">{p.right || '–'}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Noch keine Zuordnungspaare hinterlegt.</p>
      )}
    </div>
  );
}