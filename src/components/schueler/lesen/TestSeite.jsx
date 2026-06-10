import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, RotateCcw, ChevronRight, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/**
 * Schüler-Aktivität „Test" (Abschluss-Phase).
 *
 * Stepper: eine Frage pro Bildschirm (scrollfrei), unterstützte Fragetypen:
 *  - mc:            Multiple Choice (options mit isCorrect)
 *  - true_false:    Richtig/Falsch (correctAnswer boolean)
 *  - solution_word: Lösungswort (expectedAnswer, Freitext-Eingabe)
 *
 * Am Ende Auswertung gegen passingThreshold mit pass-/failFeedback.
 *
 * Design-Konventionen wie alle Schüler-Aktivitäten:
 *  - kein Header, blauer Aufgabenstellungs-Anker oben,
 *  - unten genau zwei Buttons: links „Zurück zum Lernpaket", rechts Aktion.
 */
export default function TestSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};

  const fragen = useMemo(
    () => (Array.isArray(fv.questions) ? fv.questions : []).filter((q) => q?.question?.trim()),
    [fv.questions]
  );
  const maxPunkte = fragen.reduce((s, q) => s + (q.points || 1), 0);
  const schwelle = Math.min(fv.passingThreshold ?? maxPunkte, maxPunkte);

  // antworten: { [frageId]: optionIndex | boolean | string }
  const [antworten, setAntworten] = useState({});
  const [aktuelleFrage, setAktuelleFrage] = useState(0);
  const [ausgewertet, setAusgewertet] = useState(false);

  const frage = fragen[aktuelleFrage];
  const antwort = frage ? antworten[frage.id] : undefined;
  const beantwortet = antwort !== undefined && antwort !== '';
  const istLetzte = aktuelleFrage === fragen.length - 1;

  const setAntwort = (wert) => setAntworten((prev) => ({ ...prev, [frage.id]: wert }));

  const punkteFuer = (q) => {
    const a = antworten[q.id];
    if (q.type === 'mc') {
      const korrektIdx = (q.options || []).findIndex((o) => o.isCorrect);
      return a === korrektIdx ? (q.points || 1) : 0;
    }
    if (q.type === 'true_false') {
      return a === q.correctAnswer ? (q.points || 1) : 0;
    }
    if (q.type === 'solution_word') {
      return String(a || '').trim().toLowerCase() === String(q.expectedAnswer || '').trim().toLowerCase()
        ? (q.points || 1) : 0;
    }
    return 0;
  };

  const erreicht = fragen.reduce((s, q) => s + punkteFuer(q), 0);
  const bestanden = erreicht >= schwelle;

  const reset = () => {
    setAntworten({});
    setAktuelleFrage(0);
    setAusgewertet(false);
  };

  const weiter = () => {
    if (istLetzte) setAusgewertet(true);
    else setAktuelleFrage((i) => i + 1);
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.instruction || aktivitaet?.field_values?.aufgabentext || 'Bearbeite den Test und gib die richtigen Antworten.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {fragen.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Für diesen Test sind noch keine Fragen hinterlegt.
          </p>
        ) : ausgewertet ? (
          /* ── Ergebnis-Ansicht ─────────────────────────────────────────── */
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              bestanden ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            )}>
              {bestanden ? <Trophy className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {erreicht} von {maxPunkte} Punkten
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Zum Bestehen brauchst du mindestens {schwelle} {schwelle === 1 ? 'Punkt' : 'Punkte'}.
              </p>
            </div>
            <div className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium max-w-md',
              bestanden ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
            )}>
              {bestanden
                ? (fv.passFeedback || 'Herzlichen Glückwunsch, du hast den Test bestanden!')
                : (fv.failFeedback || 'Leider hast du die Mindestpunktzahl nicht erreicht. Bitte versuche es erneut.')}
            </div>

            {/* Frage-für-Frage-Übersicht */}
            <div className="w-full max-w-md space-y-1.5 text-left">
              {fragen.map((q, i) => {
                const ok = punkteFuer(q) > 0;
                return (
                  <div key={q.id} className={cn(
                    'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
                    ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'
                  )}>
                    {ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />}
                    <span className="text-foreground leading-snug">Frage {i + 1}: {q.question}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Frage-Ansicht (Stepper) ──────────────────────────────────── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Frage {aktuelleFrage + 1} von {fragen.length}
              </span>
              <div className="flex gap-1">
                {fragen.map((q, i) => (
                  <span key={q.id} className={cn(
                    'w-2 h-2 rounded-full',
                    i === aktuelleFrage ? 'bg-primary'
                      : antworten[q.id] !== undefined && antworten[q.id] !== '' ? 'bg-primary/40'
                      : 'bg-border'
                  )} />
                ))}
              </div>
            </div>

            <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              {frage.question}
            </p>

            {frage.type === 'mc' && (
              <div className="space-y-2">
                {(frage.options || []).map((o, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAntwort(idx)}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-3 py-2.5 text-sm transition-colors',
                      antwort === idx
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            )}

            {frage.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-3">
                {[{ wert: true, label: 'Richtig' }, { wert: false, label: 'Falsch' }].map(({ wert, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAntwort(wert)}
                    className={cn(
                      'rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors',
                      antwort === wert
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card hover:border-primary/50 text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {frage.type === 'solution_word' && (
              <Input
                value={typeof antwort === 'string' ? antwort : ''}
                onChange={(e) => setAntwort(e.target.value)}
                placeholder="Deine Antwort …"
                className="max-w-sm"
              />
            )}
          </div>
        )}
      </div>

      {/* Aktionen: links zurück, rechts Aktion */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {fragen.length === 0 ? (
          <Button className="gap-2" disabled>
            <ChevronRight className="w-4 h-4" /> Weiter
          </Button>
        ) : !ausgewertet ? (
          <Button
            className={cn('gap-2', istLetzte && 'bg-emerald-600 hover:bg-emerald-700')}
            disabled={!beantwortet}
            onClick={weiter}
          >
            {istLetzte ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {istLetzte ? 'Auswerten' : 'Weiter'}
          </Button>
        ) : bestanden ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : (
          <Button variant="outline" className="gap-2" onClick={reset}>
            <RotateCcw className="w-4 h-4" /> Nochmal versuchen
          </Button>
        )}
      </div>
    </div>
  );
}