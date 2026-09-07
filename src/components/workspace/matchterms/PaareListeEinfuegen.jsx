import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ListPlus, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * PaareListeEinfuegen
 * ───────────────────
 * Begriffspaare als LISTE übergeben, statt jedes Paar einzeln anzulegen.
 * Eine Zeile = ein Paar; getrennt durch | oder Tabulator oder ; oder – / -.
 * Die Trennzeichen-Vielfalt ist Absicht: Lehrkräfte kopieren solche Listen
 * aus Word, Excel oder einem Arbeitsblatt, und dort steht jedes Mal etwas
 * anderes zwischen den Spalten.
 */
export function parsePaareListe(text) {
  return String(text || '')
    .split('\n')
    .map((zeile) => zeile.trim())
    .filter(Boolean)
    .map((zeile) => {
      const teile = zeile.split(/\s*(?:\||\t|;|=>|→|\s[–-]\s)\s*/);
      return { left: (teile[0] || '').trim(), right: (teile.slice(1).join(' ') || '').trim() };
    })
    .filter((p) => p.left && p.right);
}

export default function PaareListeEinfuegen({ onAdd, freieSlots }) {
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState('');
  const erkannt = parsePaareListe(text);

  const uebernehmen = () => {
    onAdd(erkannt);
    setText('');
    setOffen(false);
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground"
      >
        <span className="flex items-center gap-1.5"><ListPlus className="w-3.5 h-3.5" /> Liste von Paaren einfügen</span>
        {offen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {offen && (
        <div className="px-3 pb-3 space-y-2">
          <Label className="text-[11px] text-muted-foreground font-normal">
            Eine Zeile pro Paar, Begriff und Antwort getrennt durch <strong>|</strong>, Tabulator, <strong>;</strong> oder <strong>–</strong>.
          </Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'Metapher | bildlicher Vergleich ohne "wie"\nSymbol | Zeichen mit übertragener Bedeutung'}
            className="text-sm resize-y font-mono"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {erkannt.length} {erkannt.length === 1 ? 'Paar' : 'Paare'} erkannt
              {erkannt.length > freieSlots && ` — nur ${freieSlots} passen noch`}
            </p>
            <Button size="sm" className="h-7 text-xs gap-1" disabled={erkannt.length === 0 || freieSlots <= 0} onClick={uebernehmen}>
              <ListPlus className="w-3.5 h-3.5" /> Paare übernehmen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}