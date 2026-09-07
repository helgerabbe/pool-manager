import React from 'react';

/**
 * Stellt die einfachen Auszeichnungen **fett** und *kursiv* dar und behält
 * Absätze bei. Bewusst kein volles Markdown: Die Lehrkraft setzt im Editor
 * nur diese beiden Zeichen, und der Text bleibt so, wie Brian ihn bekommt.
 */
export default function EinfachFormatierterText({ text = '' }) {
  const teile = String(text).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return (
    <span className="whitespace-pre-line">
      {teile.map((t, i) => {
        if (/^\*\*[^*]+\*\*$/.test(t)) return <strong key={i}>{t.slice(2, -2)}</strong>;
        if (/^\*[^*\n]+\*$/.test(t)) return <em key={i}>{t.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{t}</React.Fragment>;
      })}
    </span>
  );
}