import React from 'react';
import { METHODEN_FAECHER } from '@/lib/methodenFachbezug';

/** Galerie nach Fach filtern: zeigt Methoden des Fachs plus fächerübergreifende. */
export default function FachFilter({ fach, setFach }) {
  return (
    <select value={fach || ''} onChange={(e) => setFach(e.target.value || null)}
      className="w-full rounded-md border bg-background px-2 py-1 text-sm">
      <option value="">Alle Fächer</option>
      {METHODEN_FAECHER.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
  );
}