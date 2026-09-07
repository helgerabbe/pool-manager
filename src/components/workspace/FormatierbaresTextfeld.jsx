import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic } from 'lucide-react';

/**
 * Textfeld mit zwei Formatierungs-Knöpfen (fett / kursiv).
 *
 * Die Formatierung wird als einfache Zeichen im Text hinterlegt:
 * **fett** und *kursiv*. Die Schüleransicht stellt diese Auszeichnungen
 * dar (siehe schueler/lesen/EinfachFormatierterText). So bleibt der Text
 * ein reiner Text — er kann unverändert an Brian übergeben werden.
 */
export default function FormatierbaresTextfeld({
  value = '',
  onChange,
  placeholder = '',
  rows = 8,
  disabled = false,
}) {
  const ref = useRef(null);

  const umschliessen = (marker) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const markierung = value.slice(start, end) || (marker === '**' ? 'fetter Text' : 'kursiver Text');
    const neu = value.slice(0, start) + marker + markierung + marker + value.slice(end);
    onChange?.(neu);
    // Auswahl auf den formatierten Text legen, damit man weiterschreiben kann
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + markierung.length);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => umschliessen('**')} className="h-7 px-2 gap-1 text-xs">
          <Bold className="w-3.5 h-3.5" /> Fett
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => umschliessen('*')} className="h-7 px-2 gap-1 text-xs">
          <Italic className="w-3.5 h-3.5" /> Kursiv
        </Button>
        <span className="text-[11px] text-muted-foreground ml-1">
          Text markieren und Knopf drücken — Absätze bleiben erhalten.
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
      />
    </div>
  );
}