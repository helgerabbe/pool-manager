import React from 'react';

/** Zeigt eine Formel mit waagerechtem Bruchstrich, Wurzel, Hoch- und Tiefgestelltem. */
export default function FormelAnzeige({ teile = [], farbe }) {
  return (
    <div className="flex items-center gap-1 font-serif text-2xl" style={{ color: farbe }}>
      {teile.map((t, i) => {
        if (t.art === 'bruch') return (
          <span key={i} className="mx-0.5 inline-flex flex-col items-center leading-tight">
            <span className="px-1">{t.a || '□'}</span><span className="h-0.5 w-full" style={{ background: farbe }} /><span className="px-1">{t.b || '□'}</span>
          </span>
        );
        if (t.art === 'wurzel') return <span key={i} className="inline-flex items-center"><span>√</span><span className="border-t-2 px-0.5" style={{ borderColor: farbe }}>{t.a || '□'}</span></span>;
        if (t.art === 'potenz') return <span key={i}>{t.a || '□'}<sup>{t.b || '□'}</sup></span>;
        if (t.art === 'index') return <span key={i}>{t.a || '□'}<sub>{t.b || '□'}</sub></span>;
        return <span key={i}>{t.a}</span>;
      })}
    </div>
  );
}