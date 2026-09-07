/**
 * SlideTextToolbar.jsx
 *
 * Formatierung für die MARKIERTE Textstelle im aktiven Textfeld:
 * fett, kursiv, unterstrichen und fünf Schriftgrößen. Die Knöpfe unterdrücken
 * mousedown, damit die Markierung im contentEditable erhalten bleibt.
 */
import React from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { SCHRIFTGROESSEN } from '@/lib/slideshowVorlagen';
import { cn } from '@/lib/utils';

const KNOPF = 'h-8 min-w-8 px-2 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 flex items-center justify-center text-foreground';

export default function SlideTextToolbar({ aktiv, onFormat }) {
  const stopp = (e) => e.preventDefault();
  return (
    <div className="flex items-center gap-1.5 flex-wrap rounded-lg border border-border bg-muted/30 px-2 py-1.5">
      <button type="button" className={KNOPF} disabled={!aktiv} onMouseDown={stopp} onClick={() => onFormat('bold')} title="Fett">
        <Bold className="w-4 h-4" />
      </button>
      <button type="button" className={KNOPF} disabled={!aktiv} onMouseDown={stopp} onClick={() => onFormat('italic')} title="Kursiv">
        <Italic className="w-4 h-4" />
      </button>
      <button type="button" className={KNOPF} disabled={!aktiv} onMouseDown={stopp} onClick={() => onFormat('underline')} title="Unterstrichen">
        <Underline className="w-4 h-4" />
      </button>
      <span className="w-px h-6 bg-border mx-1" />
      {SCHRIFTGROESSEN.map((g, i) => (
        <button
          key={g.key}
          type="button"
          className={cn(KNOPF, 'font-semibold')}
          style={{ fontSize: 10 + i * 2.5 }}
          disabled={!aktiv}
          onMouseDown={stopp}
          onClick={() => onFormat('fontSize', g.px)}
          title={`Schriftgröße: ${g.label}`}
        >
          A
        </button>
      ))}
      <span className="ml-auto text-[11px] text-muted-foreground">
        {aktiv ? 'Text markieren, dann formatieren.' : 'Klicke in ein Textfeld der Folie.'}
      </span>
    </div>
  );
}