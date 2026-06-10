import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, RotateCcw, ChevronRight, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/**
 * Schüler-Aktivität „Miniquiz" (Übungs-Phase).
 *
 * Stepper: eine Multiple-Choice-Frage pro Bildschirm mit SOFORTIGEM Feedback
 * nach dem Prüfen (richtige Antwort wird grün markiert). Am Ende Auswertung;
 * falsch beantwortete Fragen können gezielt wiederholt werden (richtige
 * bleiben gespeichert).
 *
 * Design-Konventionen wie alle Schüler-Aktivitäten:
 *  - kein Header, blauer Aufgabenstellungs-Anker oben,
 *  - unten genau zwei Buttons: links „Zurück zum Lernpaket", rechts Aktion.
 */
export default function MiniquizSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};

  const fragen = useMemo(
    () => (Array.isArray(fv.questions) ? fv.questions : [])
      .filter((q) => q?.question?.trim())
      .map((q, i) => ({
        ...q,
        id: q.id || `q-${i}`,
        // Antworten mischen, damit die richtige nicht immer oben steht.
        answers: [...(q.answers || [])].sort(() => Math.random() - 0.5),
      })),
    [fv.questions]
  );

  // ergebnisse: { [frageId]: true (richtig) | false (falsch) }
  const [ergebnisse, setErgebnisse] = useState({});
  const [auswahl, setAuswahl] = useState(null);
  const [geprueft, setGeprueft] = useState(false);
  const [aktuelleFrage, setAktuelleFrage] = useState(0);
  const [ausgewertet, setAusgewertet] = useState(false);
  // Wiederholungs-Runde: null = alle Fragen, sonst nur die falschen IDs.
  const [rundenIds, setRundenIds] = useState(null);

  const rundenFragen = useMemo(
    () => (rundenIds ? fragen.filter((q) => rundenIds.includes(q.id)) : fragen),
    [fragen, rundenIds]
  );

  const frage = rundenFragen[aktuelleFrage];
  const istLetzte = aktuelleFrage === rundenFragen.length - 1;
  const korrektIdx = frage ? (frage.answers || []).findIndex((a) => a.isCorrect) : -1;

  const richtige = fragen.filter((q) => ergebnisse[q.id] === true).length;
  const alleRichtig = fragen.length > 0 && richtige === fragen.length;

  const pruefen = () => {
    setErgebnisse((prev) => ({ ...prev, [frage.id]: auswahl === korrektIdx }));
    setGeprueft(true);
  };

  const weiter = () => {
    setAuswahl(null);
    setGeprueft(false);
    if (istLetzte) setAusgewertet(true);
    else setAktuelleFrage((i) => i + 1);
  };

  // Nur die falsch beantworteten Fragen erneut bearbeiten lassen.
  const falscheWiederholen = () => {
    const falsche = fragen.filter((q) => ergebnisse[q.id] !== true).map((q) => q.id);
    setErgebnisse((prev) => {
      const next = { ...prev };
      falsche.forEach((id) => delete next[id]);
      return next;
    });
    setRundenIds(falsche);
    setAuswahl(null);
    setGeprueft(false);
    setAktuelleFrage(0);
    setAusgewertet(false);
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.instruction || 'Beantworte die Quiz-Fragen. Nach jeder Frage siehst du sofort, ob du richtig lagst.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {fragen.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Für dieses Miniquiz sind noch keine Fragen hinterlegt.
          </p>
        ) : ausgewertet ? (
          /* ── Ergebnis-Ansicht ─────────────────────────────────────────── */
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              alleRichtig ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            )}>
              {alleRichtig ? <Sparkles className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
            </div>
            <p className="text-2xl font-bold text-foreground">
              {richtige} von {fragen.length} richtig
            </p>
            <div className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium max-w-md',
              alleRichtig ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
            )}>
              {alleRichtig
                ? 'Super gemacht! Du hast alle Fragen richtig beantwortet. 🎉'
                : 'Fast geschafft! Deine richtigen Antworten bleiben gespeichert – wiederhole nur die falschen Fragen.'}
            </div>

            <div className="w-full max-w-md space-y-1.5 text-left">
              {fragen.map((q, i) => {
                const ok = ergebnisse[q.id] === true;
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
          /* ── Frage-Ansicht (Stepper mit Sofort-Feedback) ─────────────── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {rundenIds ? 'Wiederholung – ' : ''}Frage {aktuelleFrage + 1} von {rundenFragen.length}
              </span>
              <div className="flex gap-1">
                {rundenFragen.map((q, i) => (
                  <span key={q.id} className={cn(
                    'w-2 h-2 rounded-full',
                    i === aktuelleFrage ? 'bg-primary'
                      : ergebnisse[q.id] !== undefined ? 'bg-primary/40'
                      : 'bg-border'
                  )} />
                ))}
              </div>
            </div>

            <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              {frage.question}
            </p>

            <div className="space-y-2">
              {(frage.answers || []).map((a, idx) => {
                const gewaehlt = auswahl === idx;
                const zeigeRichtig = geprueft && idx === korrektIdx;
                const zeigeFalsch = geprueft && gewaehlt && idx !== korrektIdx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={geprueft}
                    onClick={() => setAuswahl(idx)}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-3 py-2.5 text-sm transition-colors flex items-start gap-2',
                      !geprueft && (gewaehlt
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border bg-card hover:border-primary/50'),
                      zeigeRichtig && 'border-emerald-400 bg-emerald-50 font-medium',
                      zeigeFalsch && 'border-rose-400 bg-rose-50',
                      geprueft && !zeigeRichtig && !zeigeFalsch && 'border-border bg-card opacity-60'
                    )}
                  >
                    {zeigeRichtig && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
                    {zeigeFalsch && <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                    <span>{a.text}</span>
                  </button>
                );
              })}
            </div>

            {geprueft && (
              <div className={cn(
                'rounded-xl px-4 py-3 text-sm font-medium',
                auswahl === korrektIdx
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              )}>
                {auswahl === korrektIdx
                  ? 'Richtig! 👍'
                  : 'Leider falsch – die richtige Antwort ist grün markiert.'}
              </div>
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
          !geprueft ? (
            <Button className="gap-2" disabled={auswahl === null} onClick={pruefen}>
              <CheckCircle2 className="w-4 h-4" /> Prüfen
            </Button>
          ) : (
            <Button
              className={cn('gap-2', istLetzte && 'bg-emerald-600 hover:bg-emerald-700')}
              onClick={weiter}
            >
              <ChevronRight className="w-4 h-4" />
              {istLetzte ? 'Zur Auswertung' : 'Weiter'}
            </Button>
          )
        ) : alleRichtig ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : (
          <Button variant="outline" className="gap-2" onClick={falscheWiederholen}>
            <RotateCcw className="w-4 h-4" /> Falsche Fragen wiederholen
          </Button>
        )}
      </div>
    </div>
  );
}