import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Check, RotateCcw } from 'lucide-react';
import GrafikRichtungWahl from '@/components/grafik/GrafikRichtungWahl';
import GrafikSlideVorschau from '@/components/grafik/GrafikSlideVorschau';
import useGrafikAufbereiten from '@/hooks/useGrafikAufbereiten';
import { fragmentZuDokument, AUFGABE_ZIELFLAECHE } from '@/lib/aufgabeFragment';

/**
 * Grafik-Assistent („Profi-Grafiker") — drei Stufen:
 *   1. Richtung wählen  2. Vorschau der aufbereiteten Fassung  3. Übernehmen
 *
 * Der Assistent verändert nichts von sich aus: Erst „Als Variante übernehmen"
 * reicht das Ergebnis über `onUebernehmen` nach oben. Das funktionale Original
 * bleibt in jedem Fall bestehen.
 *
 * art='offen'     → onUebernehmen({ fragment_polished, meta })
 * art='slideshow' → onUebernehmen({ design })
 */
export default function GrafikAssistentDialog({
  open, onOpenChange, art, fragment = '', slides = [], kontext = {}, onUebernehmen,
}) {
  const [richtung, setRichtung] = useState('light');
  const [wunsch, setWunsch] = useState('');
  const [ergebnis, setErgebnis] = useState(null);
  const aufbereiten = useGrafikAufbereiten();

  useEffect(() => {
    if (open) { setErgebnis(null); setWunsch(''); setRichtung('light'); }
  }, [open]);

  const starten = () =>
    aufbereiten.mutate(
      { art, richtung, wunsch, kontext, fragment, slides },
      { onSuccess: (d) => setErgebnis(d) },
    );

  const uebernehmen = () => {
    if (!ergebnis) return;
    onUebernehmen?.(art === 'offen'
      ? { fragment_polished: ergebnis.fragment_polished, meta: ergebnis.meta }
      : { design: ergebnis.design });
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[94vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-600" />
            Grafisch aufbereiten
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Der Inhalt und die Funktion bleiben unverändert — es entsteht eine zusätzliche, schön
            gestaltete Fassung neben dem Original.
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {!ergebnis ? (
            <GrafikRichtungWahl
              richtung={richtung}
              onRichtung={setRichtung}
              wunsch={wunsch}
              onWunsch={setWunsch}
            />
          ) : (
            <div className="space-y-3">
              {ergebnis.design?.name && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5">
                  <p className="text-sm font-semibold text-violet-900">{ergebnis.design.name}</p>
                  {ergebnis.design.begruendung && (
                    <p className="text-xs text-violet-800 mt-0.5">{ergebnis.design.begruendung}</p>
                  )}
                </div>
              )}

              {art === 'offen' ? (
                <div
                  className="mx-auto w-full overflow-hidden rounded-xl border border-border bg-card"
                  style={{ maxWidth: AUFGABE_ZIELFLAECHE.breite }}
                >
                  <iframe
                    title="Grafisch aufbereitete Aufgabe"
                    srcDoc={fragmentZuDokument(ergebnis.fragment_polished || '')}
                    className="w-full border-0"
                    style={{ height: AUFGABE_ZIELFLAECHE.hoehe }}
                    sandbox="allow-scripts allow-forms allow-popups"
                  />
                </div>
              ) : (
                <GrafikSlideVorschau folien={slides} design={ergebnis.design} />
              )}
            </div>
          )}

          {aufbereiten.isPending && (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Der Grafiker arbeitet — das dauert einen Moment.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 px-6 py-3 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={aufbereiten.isPending}>
            Abbrechen
          </Button>
          {ergebnis ? (
            <>
              <Button variant="outline" className="gap-2" onClick={starten} disabled={aufbereiten.isPending}>
                <RotateCcw className="w-4 h-4" /> Anderen Entwurf
              </Button>
              <Button className="gap-2" onClick={uebernehmen}>
                <Check className="w-4 h-4" /> Als Variante übernehmen
              </Button>
            </>
          ) : (
            <Button className="gap-2" onClick={starten} disabled={aufbereiten.isPending}>
              {aufbereiten.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
              Gestalten lassen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}