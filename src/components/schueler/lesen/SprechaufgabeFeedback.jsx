import { CheckCircle2, XCircle, Lightbulb, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { URTEIL_META } from '@/lib/sprechaufgabe';

/** Rückmeldung der KI zu einer Sprechaufgabe – nur für die Schüler:innen. */
export default function SprechaufgabeFeedback({ ergebnis }) {
  if (!ergebnis) return null;
  const meta = URTEIL_META[ergebnis.urteil] || URTEIL_META.teilweise;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', meta.klasse)}>
        {meta.label}
      </span>

      {ergebnis.zusammenfassung && (
        <p className="text-sm leading-relaxed">{ergebnis.zusammenfassung}</p>
      )}

      {ergebnis.richtig?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-700">Das hat gut geklappt</p>
          <ul className="space-y-1">
            {ergebnis.richtig.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ergebnis.fehlt?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-rose-700">Daran kannst du noch arbeiten</p>
          <ul className="space-y-1">
            {ergebnis.fehlt.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ergebnis.tipp && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" /> {ergebnis.tipp}
        </div>
      )}

      {ergebnis.transkript && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer inline-flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5" /> Das habe ich gehört
          </summary>
          <p className="mt-2 leading-relaxed italic">„{ergebnis.transkript}"</p>
        </details>
      )}
    </div>
  );
}