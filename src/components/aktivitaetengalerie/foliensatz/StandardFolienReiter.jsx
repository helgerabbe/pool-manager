import React from 'react';
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { CI_FOLIENTYPEN } from '@/lib/folienCI';
import { CI_STANDARD_REGEL } from '@/lib/folienCIStandard';
import StandardFolienRegeln from './StandardFolienRegeln';
import StandardFolieAnsicht from './StandardFolieAnsicht';

/** Standardfolien-Galerie: links alle Standardsituationen, rechts Tablet, Tafel und Regeln der gewählten Folie. */
export default function StandardFolienReiter() {
  const [key, setKey] = React.useState(STANDARD_FOLIEN[0].key);
  const s = STANDARD_FOLIEN.find((x) => x.key === key);
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="w-64 shrink-0 overflow-y-auto rounded-xl border p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">{STANDARD_FOLIEN.length} Standardfolien</p>
        {STANDARD_FOLIEN.map((x) => (
          <button key={x.key} onClick={() => setKey(x.key)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${x.key === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CI_FOLIENTYPEN[x.folientyp]?.farbe }} />{x.name}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
        <div><p className="font-display text-lg font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{CI_FOLIENTYPEN[s.folientyp]?.name || s.folientyp}</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StandardFolieAnsicht s={s} ansicht="schueler" />
          <StandardFolieAnsicht s={s} ansicht="lehrer" />
        </div>
        <StandardFolienRegeln s={s} />
        <p className="text-xs text-muted-foreground">{CI_STANDARD_REGEL}</p>
      </div>
    </div>
  );
}