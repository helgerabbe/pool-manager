import React from 'react';
import { Check } from 'lucide-react';

/**
 * KlonTestReadOnly — schreibgeschützte Anzeige der Fragen einer Test-Kopie.
 * Datenform: { instruction?, questions: [{ type, question, points,
 *   options?: [{text,isCorrect}], correctAnswer?, expectedAnswer? }] }
 */
export default function KlonTestReadOnly({ data }) {
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
              <div key={f.id || i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-sm font-medium">{i + 1}. {f.question}</p>
                {f.type === 'true_false' ? (
                  <p className="text-sm text-muted-foreground">
                    Richtige Antwort: <span className="font-medium text-green-800">{f.correctAnswer ? 'Wahr' : 'Falsch'}</span>
                    {f.explanation ? ` · ${f.explanation}` : ''}
                  </p>
                ) : f.type === 'solution_word' ? (
                  <p className="text-sm text-muted-foreground">
                    Lösungswort: <span className="font-medium text-green-800">{f.expectedAnswer}</span>
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {(f.options || []).map((o, j) => (
                      <li key={j} className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${o.isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'text-muted-foreground'}`}>
                        {o.isCorrect ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                        {o.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Noch keine Fragen in dieser Kopie.</p>
      )}
    </div>
  );
}