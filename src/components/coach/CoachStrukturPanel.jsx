import { Layers, StickyNote, ListTodo, CircleHelp, LayoutList } from 'lucide-react';

/**
 * Live-Einheitenübersicht des Einheiten-Coach: zeigt den aktuellen Stand
 * der gemeinsam entwickelten Struktur (Leitidee, Themenfelder mit
 * Lernpaketen + Anmerkungen, offene Punkte). Reine Anzeige-Komponente.
 */
export default function CoachStrukturPanel({ struktur }) {
  const themenfelder = struktur?.themenfelder || [];
  const offenePunkte = struktur?.offene_punkte || [];

  if (themenfelder.length === 0 && !struktur?.leitidee) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted text-muted-foreground mb-3">
            <LayoutList className="w-6 h-6" />
          </span>
          <p className="text-sm font-medium text-foreground mb-1">Noch keine Struktur</p>
          <p className="text-xs text-muted-foreground">
            Hier entsteht während des Gesprächs deine Einheitenübersicht — ganz automatisch, während du mit dem Coach sprichst.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {(struktur?.titel || struktur?.fach || struktur?.jahrgangsstufe) && (
        <div>
          <h3 className="text-base font-bold text-foreground leading-snug">
            {struktur?.titel || 'Neue Einheit'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[struktur?.fach, struktur?.jahrgangsstufe ? `Jg. ${struktur.jahrgangsstufe}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      )}

      {struktur?.leitidee && (
        <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">Leitidee</p>
          <p className="text-xs text-foreground leading-relaxed">{struktur.leitidee}</p>
        </div>
      )}

      <div className="space-y-3">
        {themenfelder.map((tf, i) => (
          <div key={i} className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border/60">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0 mt-px">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-foreground leading-snug">{tf.titel}</p>
            </div>
            <div className="px-3 py-2.5 space-y-2">
              {(tf.lernpakete || []).length > 0 && (
                <ul className="space-y-1.5">
                  {tf.lernpakete.map((lp, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span>
                        {lp.titel}
                        {lp.anmerkung && (
                          <span className="text-muted-foreground italic"> — {lp.anmerkung}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {(tf.anmerkungen || []).map((a, k) => (
                <div key={k} className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900">{a}</p>
                </div>
              ))}
              {(tf.lernpakete || []).length === 0 && (tf.anmerkungen || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">Noch keine Lernpakete geplant.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {offenePunkte.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <CircleHelp className="w-3.5 h-3.5" /> Offene Punkte
          </p>
          <ul className="space-y-1">
            {offenePunkte.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <ListTodo className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}