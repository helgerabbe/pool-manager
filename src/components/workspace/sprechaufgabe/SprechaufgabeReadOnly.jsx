import { Mic, Target, Clock } from 'lucide-react';
import { SPRACHEN, SCHWERPUNKTE, VERSUCHE_OPTIONEN, formatDauer } from '@/lib/sprechaufgabe';

/** Lehrkraft-Ansicht (read-only) einer Sprechaufgabe. */
export default function SprechaufgabeReadOnly({ fieldValues = {} }) {
  const label = (liste, wert) => liste.find((o) => String(o.value) === String(wert))?.label || '—';

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {fieldValues.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
          <p className="whitespace-pre-wrap leading-relaxed">{fieldValues.aufgabentext}</p>
        </div>
      )}

      {fieldValues.bild_url && (
        <img src={fieldValues.bild_url} alt="Material" className="max-h-56 w-auto object-contain rounded-lg border border-border" />
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border">
          <Mic className="w-3.5 h-3.5" /> {label(SPRACHEN, fieldValues.sprache || 'de')}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border">
          <Clock className="w-3.5 h-3.5" /> max. {formatDauer(Number(fieldValues.max_dauer_sekunden) || 60)}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border">
          <Target className="w-3.5 h-3.5" /> {label(SCHWERPUNKTE, fieldValues.schwerpunkt || 'inhalt')}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border">
          {label(VERSUCHE_OPTIONEN, fieldValues.versuche ?? 3)}
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Erwartungshorizont</p>
        {fieldValues.erwartungshorizont
          ? <p className="text-sm whitespace-pre-wrap leading-relaxed">{fieldValues.erwartungshorizont}</p>
          : <p className="text-sm text-muted-foreground italic">Noch kein Erwartungshorizont hinterlegt.</p>}
      </div>

      {Array.isArray(fieldValues.pflichtelemente) && fieldValues.pflichtelemente.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pflichtelemente</p>
          <div className="flex flex-wrap gap-1.5">
            {fieldValues.pflichtelemente.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{p}</span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Die Rückmeldung erhalten ausschließlich die Schüler:innen. Ausgewertet wird die automatische
        Verschriftung der Aufnahme – Inhalt, Vollständigkeit und Satzbau sind zuverlässig prüfbar,
        Betonung und Klang nicht.
      </p>
    </div>
  );
}