import React from 'react';
import { CI_FOLIENTYPEN } from '@/lib/folienCI';
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';
import { festeFolienart } from '@/lib/kiFolienliste';

/** Eine Seite (Tafel oder Tablet) eines Schritts: Folienart, Standardfolie, kurzer Inhalt.
 * Mit Standardfolie ist die Folienart fest (aus dem Katalog) und nicht wählbar. */
export default function SchrittfolgeZelle({ s, seite, aendere }) {
  const standard = s[`${seite}_standard`];
  const fest = CI_STANDARDFOLIEN[standard]?.folientyp;
  const typ = fest || s[`${seite}_typ`];
  return (
    <div className="space-y-1 rounded-md border-l-4 pl-2" style={{ borderColor: CI_FOLIENTYPEN[typ]?.farbe || '#ddd' }}>
      <div className="flex gap-1">
        <select className="rounded border bg-background px-1 text-xs disabled:opacity-70" value={typ || ''} disabled={!!fest} title={fest ? 'Durch die Standardfolie festgelegt' : undefined} onChange={(e) => aendere({ [`${seite}_typ`]: e.target.value })}>
          {Object.entries(CI_FOLIENTYPEN).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select className="rounded border bg-background px-1 text-xs" value={standard || ''} onChange={(e) => aendere({ [`${seite}_standard`]: e.target.value, [`${seite}_typ`]: festeFolienart(e.target.value, s[`${seite}_typ`]) })}>
          <option value="">keine Standardfolie</option>
          {Object.entries(CI_STANDARDFOLIEN).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </div>
      <textarea rows={2} className="w-full rounded border bg-background p-1 text-xs" value={s[seite] || ''} onChange={(e) => aendere({ [seite]: e.target.value })} />
    </div>
  );
}