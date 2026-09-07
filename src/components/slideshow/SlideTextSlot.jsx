/**
 * SlideTextSlot.jsx
 *
 * Ein Textfeld einer Folie. Im Editor ein contentEditable-Feld (fett/kursiv/
 * unterstrichen/Schriftgröße für MARKIERTE Stellen kommen über die Toolbar
 * per execCommand), in der Anzeige das gespeicherte HTML.
 */
import React, { useEffect, useRef, useState } from 'react';
import { schriftPx, sanitizeHtml, textAusHtml } from '@/lib/slideshowVorlagen';

export default function SlideTextSlot({ slot, html = '', modus, textFarbe, aktiv, onFokus, onChange }) {
  const ref = useRef(null);
  const [leer, setLeer] = useState(textAusHtml(html) === '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== (html || '')) el.innerHTML = html || '';
    setLeer(textAusHtml(html) === '');
  }, [html]);

  const basisStyle = {
    width: '100%', height: '100%', overflow: 'hidden',
    fontSize: schriftPx(slot.groesse), fontWeight: slot.fett ? 700 : 400,
    textAlign: slot.align || 'left', lineHeight: 1.35, color: textFarbe,
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
  };

  if (modus !== 'edit') {
    return <div style={basisStyle} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
  }

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
          outlineOffset: 4, cursor: 'text', overflowY: 'auto',
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
    </div>
  );
}