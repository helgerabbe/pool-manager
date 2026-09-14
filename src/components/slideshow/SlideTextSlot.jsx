/**
 * SlideTextSlot.jsx
 *
 * Ein Textfeld einer Folie. Im Editor ein contentEditable-Feld (fett/kursiv/
 * unterstrichen/Schriftgröße für MARKIERTE Stellen kommen über die Toolbar
 * per execCommand), in der Anzeige das gespeicherte HTML.
 *
 * HÖHE (2026-09-14): Textfelder wachsen mit dem Inhalt — vorher wurde längerer
 * Text an der festen Vorlagen-Höhe abgeschnitten. Wer eine bestimmte Höhe
 * braucht, zieht im Editor am unteren Rand; dieser Wert wird als
 * `elemente.<slot>.hoehe` gespeichert und überall gleich angezeigt.
 */
import React, { useEffect, useRef, useState } from 'react';
import { schriftPx, sanitizeHtml, textAusHtml } from '@/lib/slideshowVorlagen';

export default function SlideTextSlot({
  slot,
  html = '',
  modus,
  textFarbe,
  aktiv,
  onFokus,
  onChange,
  onHoeheChange,
}) {
  const ref = useRef(null);
  const [leer, setLeer] = useState(textAusHtml(html) === '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== (html || '')) el.innerHTML = html || '';
    setLeer(textAusHtml(html) === '');
  }, [html]);

  const basisStyle = {
    width: '100%', height: '100%', overflow: 'visible',
    fontSize: schriftPx(slot.groesse), fontWeight: slot.fett ? 700 : 400,
    textAlign: slot.align || 'left', lineHeight: 1.35, color: textFarbe,
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
  };

  if (modus !== 'edit') {
    return <div style={basisStyle} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
  }

  // Ziehen am unteren Rand: Die Folie ist per CSS skaliert, deshalb wird die
  // Mausbewegung über das Verhältnis von gemessener zu tatsächlicher Höhe in
  // Folien-Pixel umgerechnet.
  const starteZiehen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const skala = rect.height && el.offsetHeight ? rect.height / el.offsetHeight : 1;
    const startY = e.clientY;
    const startH = el.offsetHeight;

    const bewegen = (ev) => {
      const neu = Math.max(30, Math.round(startH + (ev.clientY - startY) / (skala || 1)));
      onHoeheChange?.(neu);
    };
    const beenden = () => {
      window.removeEventListener('pointermove', bewegen);
      window.removeEventListener('pointerup', beenden);
    };
    window.addEventListener('pointermove', bewegen);
    window.addEventListener('pointerup', beenden);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const neu = e.currentTarget.innerHTML;
          setLeer(textAusHtml(neu) === '');
          onChange?.(neu);
        }}
        onFocus={() => onFokus?.(ref.current)}
        style={{
          ...basisStyle,
          outline: aktiv ? '2px dashed rgba(59,130,246,0.8)' : '1px dashed rgba(100,116,139,0.4)',
          outlineOffset: 4, cursor: 'text',
        }}
      />
      {leer && (
        <div
          style={{
            ...basisStyle, position: 'absolute', inset: 0, pointerEvents: 'none',
            color: 'rgba(100,116,139,0.55)', fontWeight: 400,
          }}
        >
          {slot.platzhalter || slot.label}
        </div>
      )}
      <div
        onPointerDown={starteZiehen}
        onDoubleClick={(e) => { e.stopPropagation(); onHoeheChange?.(null); }}
        title="Höhe ziehen (Doppelklick: automatisch an den Inhalt anpassen)"
        style={{
          position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
          width: 56, height: 8, borderRadius: 999, cursor: 'ns-resize',
          background: aktiv ? 'rgba(59,130,246,0.65)' : 'rgba(100,116,139,0.35)',
        }}
      />
    </div>
  );
}