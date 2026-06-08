import { useState } from 'react';
import { ClipboardCheck, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Schritt 3 – freiwilliger Wissens-Check (Multiple Choice). Liest das Quiz aus
 * onboarding_konfiguration.einstiegsdiagnose. Der Schüler beantwortet die
 * Fragen; danach wird der Anteil richtiger Antworten an den Eltern-Flow
 * gemeldet (für die Empfehlung). Kein benoteter Test.
 */
export default function StepWissensCheck({ diagnose, onAnteil, onWeiter, onZurueck }) {
  const fragen = Array.isArray(diagnose?.fragen) ? diagnose.fragen : [];
  const [antworten, setAntworten] = useState({});
  const [ausgewertet, setAusgewertet] = useState(false);

  const alleBeantwortet = fragen.length > 0 && fragen.every((_, i) => antworten[i] !== undefined);

  const richtigeAnzahl = fragen.reduce(
    (acc, f, i) => acc + (antworten[i] === f.richtige_antwort_index ? 1 : 0),
    0,
  );
  const anteil = fragen.length > 0 ? Math.round((richtigeAnzahl / fragen.length) * 100) : null;

  const auswerten = () => {
    setAusgewertet(true);
    onAnteil(anteil);
  };

  // Kein Quiz hinterlegt → Schritt überspringbar.
  if (fragen.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Für diese Einheit gibt es keinen Wissens-Check. Du kannst direkt weitergehen.
          </p>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onZurueck} className="gap-2"><ArrowLeft className="w-4 h-4" />Zurück</Button>
          <Button onClick={onWeiter} className="gap-2">Weiter<ArrowRight className="w-4 h-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3 mb-5">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground">{diagnose?.titel || 'Wissens-Check'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {diagnose?.intro || 'Probier dich aus – das ist kein benoteter Test, nur eine kleine Standortbestimmung.'}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {fragen.map((f, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-foreground mb-2.5">
                <span className="text-emerald-600 font-bold mr-1.5">{i + 1}.</span>
                {f.frage}
              </p>
              <div className="space-y-2">
                {(f.optionen || []).map((opt, oi) => {
                  const gewaehlt = antworten[i] === oi;
                  const istRichtig = oi === f.richtige_antwort_index;
                  let stil = 'border-border bg-card hover:bg-muted';
                  if (ausgewertet) {
                    if (istRichtig) stil = 'border-green-500 bg-green-50 text-green-800';
                    else if (gewaehlt) stil = 'border-red-400 bg-red-50 text-red-700';
                    else stil = 'border-border bg-card opacity-70';
                  } else if (gewaehlt) {
                    stil = 'border-emerald-500 bg-emerald-50';
                  }
                  return (
                    <button
                      key={oi}
                      disabled={ausgewertet}
                      onClick={() => setAntworten((p) => ({ ...p, [i]: oi }))}
                      className={`w-full text-left text-sm rounded-xl border px-3.5 py-2.5 transition-all flex items-center justify-between gap-2 ${stil}`}
                    >
                      <span>{opt}</span>
                      {ausgewertet && istRichtig && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                      {ausgewertet && gewaehlt && !istRichtig && <X className="w-4 h-4 text-red-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {ausgewertet && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Du hast <strong>{richtigeAnzahl} von {fragen.length}</strong> richtig ({anteil}%).{' '}
            {diagnose?.feedback?.[anteil >= 70 ? 'hoch' : anteil >= 40 ? 'mittel' : 'niedrig']}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onZurueck} className="gap-2"><ArrowLeft className="w-4 h-4" />Zurück</Button>
        {ausgewertet ? (
          <Button onClick={onWeiter} className="gap-2">Weiter<ArrowRight className="w-4 h-4" /></Button>
        ) : (
          <Button onClick={auswerten} disabled={!alleBeantwortet} className="gap-2">Auswerten</Button>
        )}
      </div>
    </div>
  );
}