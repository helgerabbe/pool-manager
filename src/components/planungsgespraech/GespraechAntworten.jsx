import React from 'react';

const knopf = 'rounded-full border px-3 py-1 text-sm hover:bg-muted';

/** Antwortknöpfe zur letzten Nachricht des Assistenten. */
export default function GespraechAntworten({ nachricht, onSenden, onListe }) {
  if (nachricht.art === 'bestaetigen') return (
    <div className="flex gap-2">
      <button className={`${knopf} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} onClick={() => onSenden('Ja, genau.')}>Ja</button>
      <button className={knopf} onClick={() => onSenden('Nein, das stimmt so nicht.')}>Nein</button>
    </div>
  );
  if (nachricht.art === 'fertig') return (
    <div className="flex gap-2">
      <button className={`${knopf} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} onClick={onListe}>Zeig mir, worauf du achten würdest</button>
      <button className={knopf} onClick={() => onSenden('Lass uns noch weitersprechen.')}>Weitersprechen</button>
    </div>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {(nachricht.optionen || []).map((o) => <button key={o} className={knopf} onClick={() => onSenden(o)}>{o}</button>)}
      {nachricht.optionen?.length > 0 && <button className={`${knopf} text-muted-foreground`} onClick={() => onSenden('Weiß ich nicht, entscheide du.')}>Weiß ich nicht, entscheide du</button>}
    </div>
  );
}