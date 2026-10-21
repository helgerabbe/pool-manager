import React from 'react';
import { FARBEN_HAUPT, FARBEN_WEITERE } from '@/lib/folienStil';

const Feld = ({ name, hex, wert, setze, gross }) => (
  <button type="button" title={name} onClick={() => setze(hex)} style={{ background: hex }}
    className={`${gross ? 'h-8 w-8' : 'h-6 w-6'} rounded-full border border-border ${wert === hex ? 'ring-2 ring-primary ring-offset-2' : ''}`} />
);

/** Hauptfarben plus 20 weitere, gut lesbare Farben. */
export default function FarbWahl({ wert, setze }) {
  const [mehr, setMehr] = React.useState(false);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Farbe</p>
      <div className="flex flex-wrap gap-2">{FARBEN_HAUPT.map(([n, h]) => <Feld key={h} name={n} hex={h} wert={wert} setze={setze} gross />)}</div>
      <button type="button" className="text-xs text-primary underline" onClick={() => setMehr(!mehr)}>{mehr ? 'Weniger Farben' : 'Weitere Farben'}</button>
      {mehr && <div className="flex flex-wrap gap-1.5">{FARBEN_WEITERE.map(([n, h]) => <Feld key={h} name={n} hex={h} wert={wert} setze={setze} />)}</div>}
    </div>
  );
}