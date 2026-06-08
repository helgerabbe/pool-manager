/**
 * EinfuehrungPreviewModal.jsx
 *
 * Eigenes Vorschaufenster für den Standardbaustein „Kurze Einführung in die
 * Einheit". Lässt die KI aus dem Einheits-Kontext eine schülergerechte
 * Einführung (mit Comic-Bild) erzeugen. Über „Übernehmen" wird das Ergebnis
 * an das Cockpit gemeldet und erscheint danach in der Dashboard-Vorschau.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { Sparkles, RefreshCw, Loader2, ImageIcon, AlertTriangle } from 'lucide-react';
import PreviewActionBar from './preview/PreviewActionBar';

export default function EinfuehrungPreviewModal({
  open, onOpenChange, einheitId, einheitTitel, fach, onUebernehmen,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [einfuehrung, setEinfuehrung] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const generate = useCallback(async (verfeinerung = null) => {
    if (!einheitId) return;
    setLoading(true);
    setError(null);
    setEinfuehrung(null);
    setImageUrl(null);
    try {
      const res = await base44.functions.invoke('generateEinheitEinfuehrung', { einheitId, verfeinerung });
      if (res?.data?.error) throw new Error(res.data.error);
      const content = res?.data?.einfuehrung;
      setEinfuehrung(content);
      // Bild im Anschluss erzeugen (separat, damit der Text sofort sichtbar ist).
      if (content?.bild_prompt) {
        setImageLoading(true);
        base44.integrations.Core.GenerateImage({ prompt: content.bild_prompt })
          .then((img) => setImageUrl(img?.url || null))
          .catch(() => setImageUrl(null))
          .finally(() => setImageLoading(false));
      }
    } catch (e) {
      setError(e?.message || 'Generierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }, [einheitId]);

  // Beim Öffnen automatisch generieren (einmalig pro Öffnen).
  useEffect(() => {
    if (open) {
      setEinfuehrung(null);
      setImageUrl(null);
      setError(null);
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUebernehmen = () => {
    if (!einfuehrung) return;
    onUebernehmen?.({ ...einfuehrung, imageUrl });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Vorschau: Kurze Einführung in die Einheit
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            So könnte die KI-Einführung für „{einheitTitel || 'die Einheit'}" aussehen.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 py-2 min-h-[280px]">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-600" />
              <p className="text-sm font-medium">KI erstellt die Einführung…</p>
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

          {einfuehrung && !loading && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {/* Comic-Bild */}
              <div className="bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center h-48">
                {imageLoading ? (
                  <div className="flex flex-col items-center text-violet-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-1.5" />
                    <span className="text-xs">Bild wird erstellt…</span>
                  </div>
                ) : imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-48 object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-violet-300" />
                )}
              </div>

              <div className="p-6">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
                  {fach || 'Fach'}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{einfuehrung.titel}</h2>
                {einfuehrung.intro && (
                  <p className="mt-2 text-base text-slate-600">{einfuehrung.intro}</p>
                )}

                <div className="mt-5 space-y-4">
                  {(einfuehrung.abschnitte || []).map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="text-2xl leading-none shrink-0">{a.emoji || '✨'}</div>
                      <div>
                        {a.ueberschrift && (
                          <h3 className="font-semibold text-slate-800">{a.ueberschrift}</h3>
                        )}
                        <div className="text-sm text-slate-600 prose prose-sm max-w-none">
                          <ReactMarkdown>{a.text || ''}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:flex-col sm:items-stretch sm:space-x-0">
          <PreviewActionBar
            loading={loading}
            canUebernehmen={!!einfuehrung}
            onRegenerate={(v) => generate(v)}
            onUebernehmen={handleUebernehmen}
            onCancel={() => onOpenChange(false)}
            uebernehmenLabel="In Dashboard-Vorschau übernehmen"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}