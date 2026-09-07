import React from 'react';
import { Check } from 'lucide-react';

/**
 * KlonQuizReadOnly — schreibgeschützte Anzeige der Fragen einer Mini-Quiz-Kopie.
 * Datenform: { instruction?, questions: [{ question, answers: [{ text, isCorrect }] }] }
 */
export default function KlonQuizReadOnly({ data }) {
  const fragen = Array.isArray(data?.questions) ? data.questions : [];
  return (
    <div className="space-y-3">
      {data?.instruction && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Arbeitsanweisung</p>
          <div className="bg-muted/50 rounded-lg p-3 text-sm">{data.instruction}</div>
        </div>
      )}
      {fragen.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen ({fragen.length})</p>
          <div className="space-y-2">
            {fragen.map((f, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-sm font-medium">{i + 1}. {f.question}</p>
                <ul className="space-y-1">
                  {(f.answers || []).map((a, j) => (
                    <li key={j} className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${a.isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'text-muted-foreground'}`}>
                      {a.isCorrect ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                      {a.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Noch keine Fragen. Klicke „Kopie bearbeiten".</p>
      )}
    </div>
  );
}