/**
 * KiGespraechSpalte.jsx
 *
 * Linke Spalte des Slideshow-Assistenten: das Gespräch mit der KI, die
 * Bildersammlung und das Eingabefeld.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2, RotateCcw, AlertTriangle, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import KiBilderSammlung from '@/components/slideshow/ki/KiBilderSammlung';
import BauFortschritt from '@/components/werkstatt/BauFortschritt';
import { cn } from '@/lib/utils';

const STARTHILFEN = [
  'Erkläre den Schülern, wie man Brüche gleichnamig macht — mit einem durchgerechneten Beispiel.',
  'Baue Erklärfolien zum Thema Fotosynthese für Jahrgang 7, verständlich und mit Alltagsbezug.',
];

export default function KiGespraechSpalte({ gen, startvorschlaege = STARTHILFEN }) {
  const [text, setText] = useState('');
  const endeRef = useRef(null);

  useEffect(() => {
    endeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [gen.verlauf.length, gen.teilAntwort]);

  const senden = () => {
    const t = text.trim();
    if (!t || gen.busy) return;
    setText('');
    gen.senden(t);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {gen.verlauf.length === 0 && !gen.busy && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-600" /> Was sollen die Folien erklären?
            </p>
            <p className="text-xs text-muted-foreground">
              Beschreibe Thema, Jahrgang und was die Schüler:innen danach verstanden haben sollen.
              Es entstehen <span className="font-medium">Erklärfolien</span> mit ausformulierten Texten – keine Stichpunkt-Präsentation.
            </p>
            <div className="space-y-1.5 pt-1">
              {startvorschlaege.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => gen.senden(v)}
                  className="w-full text-left text-xs rounded-md border border-border bg-background px-2 py-1.5 hover:bg-muted"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {gen.verlauf.map((m, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed',
              m.rolle === 'lehrkraft'
                ? 'bg-primary text-primary-foreground ml-6'
                : 'bg-muted text-foreground mr-6'
            )}
          >
            {m.text}
          </div>
        ))}

        {gen.busy && (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm mr-6 whitespace-pre-wrap leading-relaxed">
            {gen.teilAntwort || <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Die Folien werden gebaut …</span>}
            <BauFortschritt fortschritt={gen.fortschritt} was="den Foliensatz" />
          </div>
        )}

        {gen.warnungen.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
            {gen.warnungen.map((w, i) => (
              <p key={i} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</p>
            ))}
          </div>
        )}

        {gen.fehler && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 space-y-2">
            <p>{gen.fehler}</p>
            {gen.fehlgeschlagen && (
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={gen.nochmalVersuchen}>
                <RotateCcw className="w-3.5 h-3.5" /> Nochmal versuchen
              </Button>
            )}
          </div>
        )}
        <div ref={endeRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3 space-y-3">
        <KiBilderSammlung
          bilder={gen.bilder}
          onAdd={gen.bildHinzufuegen}
          onRemove={gen.bildEntfernen}
          disabled={gen.busy}
        />
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); senden(); } }}
            placeholder={gen.folien.length ? 'Was soll geändert werden?' : 'Beschreibe, was die Folien erklären sollen …'}
            rows={2}
            className="text-sm resize-none"
            disabled={gen.busy}
          />
          {gen.busy ? (
            <Button variant="outline" size="icon" onClick={gen.abbrechen} title="Abbrechen">
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={senden} disabled={!text.trim()} title="Senden">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}