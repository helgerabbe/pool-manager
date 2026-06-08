/**
 * LerntypDiagnosePreviewModal.jsx
 *
 * Vorschaufenster für das 4. (letzte) Onboarding-Element „KI-Lerntyp-
 * Diagnose" – im iPad-Rahmen. Eine KI erzeugt aus dem Einheits-Kontext
 * einen Gesprächs-Leitfaden, mit dem Brian dem Schüler bei Unsicherheit
 * eine Lerntyp-Empfehlung gibt. Reine Vorschau-Simulation – es werden
 * KEINE Schülerdaten geschrieben.
 *
 * „In Dashboard-Vorschau übernehmen" friert den Snapshot ein und meldet
 * ihn ans Cockpit (Premium-Standard via PreviewActionBar).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import {
  MessageCircle, RefreshCw, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PreviewActionBar from './preview/PreviewActionBar';

export default function LerntypDiagnosePreviewModal({
  open, onOpenChange, einheitId, einheitTitel, fach, onUebernehmen,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagnose, setDiagnose] = useState(null);

  const generate = useCallback(async (verfeinerung = null) => {
    if (!einheitId) return;
    setLoading(true);
    setError(null);
    setDiagnose(null);
    try {
      const res = await base44.functions.invoke('generateLerntypDiagnose', { einheitId, verfeinerung });
      if (res?.data?.error) throw new Error(res.data.error);
      setDiagnose(res?.data?.diagnose);
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

  const fragen = diagnose?.gespraechs_leitfaden || [];

  const handleUebernehmen = () => {
    if (!diagnose) return;
    onUebernehmen?.({
      titel: diagnose.titel,
      intro: diagnose.intro,
      gespraechs_leitfaden: diagnose.gespraechs_leitfaden || [],
      hinweis: diagnose.hinweis || '',
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
            <div className="h-11 shrink-0 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex items-center px-4 gap-3">
              <MessageCircle className="w-4 h-4 opacity-90" />
              <span className="text-sm font-semibold truncate">Sprich mit Brian über deinen Lerntyp</span>
              {fach && (
                <span className="ml-auto text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{fach}</span>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              {loading && (
                <div className="h-full flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-sky-600" />
                  <p className="text-sm font-medium">KI erstellt den Gesprächs-Leitfaden…</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
                  <p className="text-sm text-slate-700 font-medium">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => generate()}>
                    <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
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

                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">
                      Brians Leitfragen
                    </p>
                    <ul className="space-y-3">
                      {fragen.map((f, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{f.frage}</p>
                            {f.ziel && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{f.ziel}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {diagnose.hinweis && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-500">{diagnose.hinweis}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Aktionsleiste unterhalb des iPads (Premium-Standard) */}
        <PreviewActionBar
          className="mt-2"
          loading={loading}
          canUebernehmen={!!diagnose}
          onRegenerate={(v) => generate(v)}
          onUebernehmen={handleUebernehmen}
          onCancel={() => onOpenChange(false)}
          uebernehmenLabel="In Dashboard-Vorschau übernehmen"
        />
      </DialogContent>
    </Dialog>
  );
}