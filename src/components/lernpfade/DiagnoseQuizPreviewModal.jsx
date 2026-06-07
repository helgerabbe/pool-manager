/**
 * DiagnoseQuizPreviewModal.jsx
 *
 * Vorschaufenster für den Standardbaustein „Einstiegsdiagnose"
 * (sys_diagnose_entry) – im iPad-Rahmen. Eine KI erzeugt aus dem kompletten
 * Einheits-Kontext 3-8 echte Multiple-Choice-Wissensfragen (4-5 plausible
 * Optionen, genau eine richtig). Der Schüler klickt sich interaktiv durch,
 * bekommt pro Frage sofort richtig/falsch-Feedback und am Ende eine
 * ermutigende Gesamt-Rückmeldung anhand der Trefferquote.
 *
 * „In Dashboard-Vorschau übernehmen" meldet die generierte Diagnose ans
 * Cockpit, sodass sie danach OHNE erneute (teure) Generierung in der
 * Dashboard-Vorschau erscheint. Es werden KEINE Schülerdaten geschrieben –
 * reine Vorschau-Simulation. Ein Hinweis macht klar, dass die echte
 * Schüler-Ansicht später ähnlich, aber nicht 1:1 deckungsgleich aussieht.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  ClipboardCheck, RefreshCw, Loader2, AlertTriangle, Check, X,
  ChevronLeft, ChevronRight, RotateCw, Info, Trophy,
} from 'lucide-react';

// Ermutigende Gesamt-Rückmeldung anhand der Trefferquote (0-1).
function getBand(quote) {
  if (quote >= 0.7) return { key: 'hoch', emoji: '🚀', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
  if (quote >= 0.4) return { key: 'mittel', emoji: '🧭', cls: 'bg-blue-50 border-blue-200 text-blue-800' };
  return { key: 'niedrig', emoji: '🌱', cls: 'bg-violet-50 border-violet-200 text-violet-800' };
}

export default function DiagnoseQuizPreviewModal({
  open, onOpenChange, einheitId, einheitTitel, fach, initialSnapshot, onUebernehmen,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagnose, setDiagnose] = useState(null);
  // Pro Frage gewählter Options-Index (oder undefined).
  const [antworten, setAntworten] = useState({});
  const [auswertung, setAuswertung] = useState(false);

  const generate = useCallback(async () => {
    if (!einheitId) return;
    setLoading(true);
    setError(null);
    setDiagnose(null);
    setAntworten({});
    setAuswertung(false);
    try {
      const res = await base44.functions.invoke('generateDiagnoseQuiz', { einheitId });
      if (res?.data?.error) throw new Error(res.data.error);
      setDiagnose(res?.data?.diagnose || null);
    } catch (e) {
      setError(e?.message || 'Generierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }, [einheitId]);

  // Beim Öffnen: bereits übernommenen Snapshot zeigen, sonst NICHT automatisch
  // generieren (spart Credits) – der Nutzer startet bewusst per Button.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setAntworten({});
    setAuswertung(false);
    setDiagnose(initialSnapshot || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fragen = diagnose?.fragen || [];

  const { korrekt, quote } = useMemo(() => {
    if (fragen.length === 0) return { korrekt: 0, quote: 0 };
    let k = 0;
    fragen.forEach((f, i) => {
      if (antworten[i] === f.richtige_antwort_index) k += 1;
    });
    return { korrekt: k, quote: k / fragen.length };
  }, [fragen, antworten]);

  const band = useMemo(() => getBand(quote), [quote]);
  const feedbackText = diagnose?.feedback?.[band.key] || '';

  const handleUebernehmen = () => {
    if (!diagnose) return;
    onUebernehmen?.({
      titel: diagnose.titel,
      intro: diagnose.intro || '',
      fragen: diagnose.fragen || [],
      feedback: diagnose.feedback || {},
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[97vh] w-[97vw] max-w-[760px] overflow-visible bg-transparent border-0 shadow-none p-0">
        {/* iPad-Rahmen */}
        <div className="bg-slate-800 rounded-[28px] p-3 shadow-2xl ring-1 ring-slate-900/10 mx-auto w-full">
          <div className="bg-white rounded-[18px] overflow-hidden flex flex-col" style={{ height: '74vh', maxHeight: 720 }}>

            {/* Safari-Andeutung */}
            <div className="h-9 shrink-0 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex items-center gap-1 text-slate-400 ml-2">
                <ChevronLeft className="w-3.5 h-3.5" />
                <ChevronRight className="w-3.5 h-3.5" />
                <RotateCw className="w-3 h-3" />
              </div>
              <div className="flex-1 mx-2 h-5 bg-white rounded-md border border-slate-200 flex items-center px-2 text-[10px] text-slate-400 truncate">
                🔒 schule.moodle.de · {einheitTitel || 'Einheit'}
              </div>
            </div>

            {/* App-Header */}
            <div className="h-11 shrink-0 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center px-4 gap-3">
              <ClipboardCheck className="w-4 h-4 opacity-90" />
              <span className="text-sm font-semibold truncate">Einstiegsdiagnose – was kannst du schon?</span>
              {fach && (
                <span className="ml-auto text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{fach}</span>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              {loading && (
                <div className="h-full flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-rose-600" />
                  <p className="text-sm font-medium">KI erstellt die Diagnose-Fragen…</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
                  <p className="text-sm text-slate-700 font-medium">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={generate}>
                    <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
                  </Button>
                </div>
              )}

              {!loading && !error && !diagnose && (
                <div className="h-full flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
                    <ClipboardCheck className="w-7 h-7 text-rose-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Einstiegsdiagnose</h3>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Hier überprüft der Schüler mit ein paar Multiple-Choice-Fragen sein Vorwissen, bevor er mit der Einheit startet.
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    Es wurde noch keine Vorschau erstellt.
                  </p>
                  <Button onClick={generate} className="mt-4 gap-1.5 bg-rose-600 hover:bg-rose-700">
                    <RefreshCw className="w-4 h-4" /> Vorschau jetzt erstellen
                  </Button>
                </div>
              )}

              {diagnose && !loading && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-lg font-bold text-slate-900">{diagnose.titel}</h2>
                    {diagnose.intro && (
                      <p className="mt-1 text-sm text-slate-600">{diagnose.intro}</p>
                    )}
                  </div>

                  {fragen.map((f, i) => {
                    const gewaehlt = antworten[i];
                    return (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-800">
                          <span className="text-rose-500 font-bold mr-1.5">{i + 1}.</span>
                          {f.frage}
                        </p>
                        <div className="mt-3 space-y-2">
                          {(f.optionen || []).map((opt, oi) => {
                            const isChosen = gewaehlt === oi;
                            const isCorrect = oi === f.richtige_antwort_index;
                            // Farb-Feedback nur nach Auswahl: gewählt-richtig = grün,
                            // gewählt-falsch = rot, korrekte Lösung wird zusätzlich grün.
                            let cls = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                            if (gewaehlt !== undefined) {
                              if (isCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                              else if (isChosen) cls = 'border-red-300 bg-red-50 text-red-700';
                              else cls = 'border-slate-200 bg-white text-slate-500';
                            } else if (isChosen) {
                              cls = 'border-rose-400 bg-rose-50 text-rose-700';
                            }
                            return (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => setAntworten((prev) => ({ ...prev, [i]: oi }))}
                                className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cls}`}
                              >
                                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0">
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {gewaehlt !== undefined && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {gewaehlt !== undefined && isChosen && !isCorrect && <X className="w-4 h-4 text-red-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {auswertung && fragen.length > 0 && (
                    <div className={`rounded-xl border p-4 ${band.cls}`}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">{band.emoji}</div>
                        <div>
                          <h3 className="font-bold flex items-center gap-1.5">
                            <Trophy className="w-4 h-4" />
                            {korrekt} von {fragen.length} richtig
                          </h3>
                          {feedbackText && <p className="mt-1 text-sm">{feedbackText}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hinweis + Aktionsleiste unterhalb des iPads */}
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 text-[11px] text-white/90 bg-slate-900/40 rounded-lg px-3 py-2 max-w-2xl mx-auto">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Diese Vorschau zeigt ein <strong>mögliches</strong> Aussehen und kommt dem späteren Schüler-Dashboard nahe, ist aber nicht 1:1 deckungsgleich. „In Dashboard-Vorschau übernehmen" speichert nur intern diesen Stand, damit er nicht jedes Mal (kostenpflichtig) neu erzeugt werden muss.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={generate}
              disabled={loading}
              className="gap-1.5 bg-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {diagnose ? 'Neu generieren' : 'Vorschau erstellen'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAuswertung(true)}
              disabled={loading || fragen.length === 0}
              className="gap-1.5 bg-white"
            >
              <Trophy className="w-4 h-4" />
              Ergebnis anzeigen
            </Button>
            <Button
              onClick={handleUebernehmen}
              disabled={loading || !diagnose}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              <Check className="w-4 h-4" />
              In Dashboard-Vorschau übernehmen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}