import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AufgabenstellungBox from './AufgabenstellungBox';
import SlideScaler from '@/components/slideshow/SlideScaler';
import SlideCanvas from '@/components/slideshow/SlideCanvas';
import { folieHatInhalt, slotsInReihenfolge, slotHatInhalt } from '@/lib/slideshowVorlagen';

/**
 * Schüler-Aktivität „Slideshow": Folien werden Seite für Seite angezeigt.
 * Hat die Lehrkraft „nacheinander einblenden" gewählt, holt „Weiter" erst die
 * Elemente der Folie einzeln (sanft eingeblendet), dann die nächste Folie.
 */
export default function SlideshowSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const folien = useMemo(
    () => (Array.isArray(fv.slides) ? fv.slides : []).filter(folieHatInhalt),
    [fv.slides]
  );
  const [index, setIndex] = useState(0);
  const [gezeigt, setGezeigt] = useState(1);

  const folie = folien[index] || null;
  const slots = folie ? slotsInReihenfolge(folie).filter((s) => slotHatInhalt(folie, s)) : [];
  const nacheinander = folie?.einblenden === 'nacheinander';
  const sichtbareSlots = nacheinander ? new Set(slots.slice(0, gezeigt).map((s) => s.key)) : null;
  const letzteFolie = index >= folien.length - 1;
  const alleElementeDa = !nacheinander || gezeigt >= slots.length;
  const amEnde = letzteFolie && alleElementeDa;

  const weiter = () => {
    if (!alleElementeDa) { setGezeigt((g) => g + 1); return; }
    if (!letzteFolie) { setIndex((i) => i + 1); setGezeigt(1); }
  };
  const zurueck = () => {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setGezeigt(99);
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}
      {fv.aufgabentext && (
        <AufgabenstellungBox className="mb-3 shrink-0">{fv.aufgabentext}</AufgabenstellungBox>
      )}

      <div className="flex-1 min-h-0 flex flex-col justify-center">
        {folie ? (
          <SlideScaler className="rounded-xl shadow-md ring-1 ring-border bg-white">
            <SlideCanvas folie={folie} modus="view" sichtbareSlots={sichtbareSlots} />
          </SlideScaler>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-10">Für diese Slideshow sind noch keine Folien hinterlegt.</p>
        )}
        {folien.length > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {folien.map((f, i) => (
              <span key={f.id || i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">{index + 1} / {folien.length}</span>
          </div>
        )}
      </div>

      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={zurueck} disabled={busy || index === 0} className="shrink-0" title="Vorherige Folie">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {amEnde || folien.length === 0 ? (
            <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={onErledigt}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Erledigt
            </Button>
          ) : (
            <Button className="flex-1 gap-2" disabled={busy} onClick={weiter}>
              Weiter <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}