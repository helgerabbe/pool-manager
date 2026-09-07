/**
 * SlideshowKIDialog.jsx
 *
 * KI-Assistent der Aktivität „Slideshow" — links das Gespräch, rechts der
 * erzeugte Foliensatz WYSIWYG. Ist die Lehrkraft zufrieden, übernimmt sie die
 * Folien in den normalen Editor und passt sie dort weiter an.
 *
 * Gebaut werden ERKLÄRFOLIEN: ausformulierte, schülergerechte Erklärungen,
 * keine Stichpunkt-Präsentation (siehe base44/functions/slideshowGeneratorChat).
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Plus } from 'lucide-react';
import useSlideshowGenerator from '@/hooks/useSlideshowGenerator';
import KiGespraechSpalte from '@/components/slideshow/ki/KiGespraechSpalte';
import KiFolienVorschau from '@/components/slideshow/ki/KiFolienVorschau';

export default function SlideshowKIDialog({
  open,
  onOpenChange,
  kontext = {},
  vorhandeneFolien = [],
  onUebernehmen,
}) {
  const gen = useSlideshowGenerator({ kontext });
  const [modus, setModus] = useState('ersetzen');
  const hatVorhandene = vorhandeneFolien.length > 0;

  const uebernehmen = () => {
    if (!gen.folien.length) return;
    onUebernehmen?.(gen.folien, hatVorhandene ? modus : 'ersetzen');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Folien mit KI erstellen
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Es entstehen Erklärfolien: alles wird in schülergerechter Sprache ausformuliert, nicht in Stichpunkten.
          </p>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-[40%] min-w-[320px] shrink-0 border-r border-border min-h-0">
            <KiGespraechSpalte gen={gen} />
          </div>
          <div className="flex-1 min-w-0 bg-slate-100 min-h-0">
            <KiFolienVorschau
              folien={gen.folien}
              staende={gen.staende}
              index={gen.index}
              onSpringeZu={gen.springeZu}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 py-3 border-t shrink-0">
          {hatVorhandene && gen.folien.length > 0 && (
            <div className="mr-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant={modus === 'ersetzen' ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setModus('ersetzen')}
              >
                Vorhandene Folien ersetzen
              </Button>
              <Button
                size="sm"
                variant={modus === 'anhaengen' ? 'default' : 'outline'}
                className="h-8 gap-1.5 text-xs"
                onClick={() => setModus('anhaengen')}
              >
                <Plus className="w-3.5 h-3.5" /> Hinten anhängen
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={uebernehmen} disabled={!gen.folien.length || gen.busy} className="gap-2">
            <Check className="w-4 h-4" />
            In den Editor übernehmen{gen.folien.length ? ` (${gen.folien.length} Folien)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}