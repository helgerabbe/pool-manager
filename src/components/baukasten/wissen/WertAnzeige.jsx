import React from 'react';

/** Zeigt beliebige gespeicherte Daten (Text, Listen, Objekte) lesbar an. */
export default function WertAnzeige({ wert }) {
  if (wert == null || wert === '') return null;
  if (Array.isArray(wert)) {
    if (!wert.length) return null;
    return <ul className="list-disc space-y-1 pl-5">{wert.map((w, i) => <li key={i}><WertAnzeige wert={w} /></li>)}</ul>;
  }
  if (typeof wert === 'object') {
    return (
      <div className="space-y-1.5">
        {Object.entries(wert).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
          <div key={k}><span className="text-xs font-semibold text-muted-foreground">{k.replace(/_/g, ' ')}: </span><WertAnzeige wert={v} /></div>
        ))}
      </div>
    );
  }
  return <span className="whitespace-pre-line">{String(wert)}</span>;
}