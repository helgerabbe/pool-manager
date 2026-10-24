import React from 'react';
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import FolieAnzeige from './FolieAnzeige';
import StandardFolienRegeln from './StandardFolienRegeln';

/** Reiter „Standardfolien“: wiederkehrende Folien, auf die der Grafikassistent zurückgreift. */
export default function StandardFolienReiter() {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2">
      <p className="text-sm text-muted-foreground">Standardfolien sind feste Bausteine, die in vielen Methoden wiederkehren. Sie bestehen aus den Layoutvorlagen und sehen immer gleich aus. Der Grafikassistent nutzt sie, wann immer eine passt.</p>
      {STANDARD_FOLIEN.map((s) => (
        <div key={s.key} className="space-y-2 rounded-xl border p-4">
          <div>
            <p className="font-display font-bold">{s.name}</p>
            <p className="text-sm text-muted-foreground">{s.wann}</p>
          </div>
          <StandardFolienRegeln s={s} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tafel</p><FolieAnzeige folie={{ id: s.key, ...s.folie }} ansicht="lehrer" /></div>
            <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tablet</p><FolieAnzeige folie={{ id: s.key, ...s.folie }} ansicht="schueler" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}