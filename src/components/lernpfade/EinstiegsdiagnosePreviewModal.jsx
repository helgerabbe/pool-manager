/**
 * EinstiegsdiagnosePreviewModal.jsx
 *
 * Vorschaufenster für den Onboarding-Baustein „Freiwilliger Fragenblock für
 * die Einstiegsdiagnose" (sys_sec0_qblock). Eine KI erzeugt aus dem Einheits-
 * Kontext 5-6 Orientierungsfragen. Der Schüler beantwortet jede Frage über
 * einen Schieberegler (links = unsicher, rechts = sicher). Am Ende berechnet
 * das Modal aus dem Durchschnitt eine kleine, ermutigende Selbsteinschätzung
 * inkl. Lerntyp-Tendenz.
 *
 * Es werden KEINE Schülerdaten geschrieben – reine Vorschau-Simulation.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { base44 } from '@/api/base44Client';
import { Compass, RefreshCw, Loader2, AlertTriangle, Gauge } from 'lucide-react';

// Einschätzungs-Bänder anhand des Schieberegler-Durchschnitts (0 = unsicher,
// 100 = sicher). Reine Orientierung, keine Bewertung.
function getEinschaetzung(avg) {
  if (avg >= 70) {
    return {
      emoji: '🚀',
      titel: 'Du fühlst dich ziemlich sicher!',
      text: 'Vieles kommt dir schon vertraut vor. Ein zügiger, fokussierter Einstieg passt gut zu dir – schau dir die Lerntypen **Minimalist** oder **Pragmatiker** an.',
      cls: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    };
  }
  if (avg >= 40) {
    return {
      emoji: '🧭',
      titel: 'Teils sicher, teils neu.',
      text: 'Manches kennst du schon, anderes ist neu – das ist völlig normal. Ein ausgewogener Weg wie **Pragmatiker** gibt dir Struktur und Tempo zugleich.',
      cls: 'bg-blue-50 border-blue-200 text-blue-800',
    };
  }
  return {
    emoji: '🌱',
    titel: 'Vieles ist noch neu – das ist okay!',
    text: 'Du startest hier ziemlich frisch. Nimm dir Zeit und übe in Ruhe. Die Lerntypen **Ehrgeizig** oder **Passioniert** bieten dir mehr Übung und Begleitung.',
    cls: 'bg-violet-50 border-violet-200 text-violet-800',
  };
}

export default function EinstiegsdiagnosePreviewModal({
  open, onOpenChange, einheitId, einheitTitel,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagnose, setDiagnose] = useState(null);
  const [werte, setWerte] = useState({});
  const [auswertung, setAuswertung] = useState(false);

  const generate = useCallback(async () => {
    if (!einheitId) return;
    setLoading(true);
    setError(null);
    setDiagnose(null);
    setWerte({});
    setAuswertung(false);
    try {
      const res = await base44.functions.invoke('generateEinstiegsdiagnose', { einheitId });
      if (res?.data?.error) throw new Error(res.data.error);
      const content = res?.data?.diagnose;
      setDiagnose(content);
      // Schieberegler auf Mittelstellung vorbelegen.
      const init = {};
      (content?.fragen || []).forEach((_, i) => { init[i] = 50; });
      setWerte(init);
    } catch (e) {
      setError(e?.message || 'Generierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }, [einheitId]);

  useEffect(() => {
    if (open) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fragen = diagnose?.fragen || [];
  const avg = useMemo(() => {
    if (fragen.length === 0) return 0;
    const sum = fragen.reduce((acc, _, i) => acc + (werte[i] ?? 50), 0);
    return Math.round(sum / fragen.length);
  }, [fragen, werte]);

  const einschaetzung = useMemo(() => getEinschaetzung(avg), [avg]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-violet-600" />
            Vorschau: Freiwilliger Fragenblock (Einstiegsdiagnose)
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            So könnten die Orientierungsfragen für „{einheitTitel || 'die Einheit'}" aussehen – kein Test, nur dein Gefühl.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 py-2 min-h-[280px]">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-600" />
              <p className="text-sm font-medium">KI erstellt die Orientierungsfragen…</p>
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

          {diagnose && !loading && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-lg font-bold text-slate-900">{diagnose.titel}</h2>
                {diagnose.intro && (
                  <p className="mt-1 text-sm text-slate-600">{diagnose.intro}</p>
                )}
              </div>

              <div className="space-y-6">
                {fragen.map((f, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="text-violet-500 font-bold mr-1.5">{i + 1}.</span>
                      {f.frage}
                    </p>
                    <div className="mt-4 px-1">
                      <Slider
                        value={[werte[i] ?? 50]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setWerte((prev) => ({ ...prev, [i]: v[0] }))}
                      />
                      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                        <span>{f.links_label}</span>
                        <span>{f.rechts_label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {auswertung && fragen.length > 0 && (
                <div className={`rounded-xl border p-4 ${einschaetzung.cls}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl leading-none">{einschaetzung.emoji}</div>
                    <div>
                      <h3 className="font-bold">{einschaetzung.titel}</h3>
                      <p className="mt-1 text-sm">
                        {einschaetzung.text.split('**').map((part, idx) =>
                          idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
                        )}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium opacity-80">
                        <Gauge className="w-3.5 h-3.5" />
                        Dein Sicherheits-Gefühl: {avg}%
                      </div>
                    </div>
                  </div>
                  {diagnose.hinweis && (
                    <p className="mt-3 text-xs opacity-75">{diagnose.hinweis}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={generate}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Neu generieren
          </Button>
          <Button
            onClick={() => setAuswertung(true)}
            disabled={loading || fragen.length === 0}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
          >
            <Gauge className="w-4 h-4" />
            Einschätzung anzeigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}