import React from 'react';
import { CI_FOLIENTYPEN } from '@/lib/folienCI';
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';

/** Eine Seite (Tafel oder Tablet) eines Schritts: Folienart, Standardfolie, kurzer Inhalt. */
export default function SchrittfolgeZelle({ s, seite, aendere }) {
  const typ = s[`${seite}_typ`];
  return (
    <div className="space-y-1 rounded-md border-l-4 pl-2" style={{ borderColor: CI_FOLIENTYPEN[typ]?.farbe || '#ddd' }}>
      <div className="flex gap-1">
        <select className="rounded border bg-background px-1 text-xs" value={typ || ''} onChange={(e) => aendere({ [`${seite}_typ`]: e.target.value })}>
          {Object.entries(CI_FOLIENTYPEN).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select className="rounded border bg-background px-1 text-xs" value={s[`${seite}_standard`] || ''} onChange={(e) => aendere({ [`${seite}_standard`]: e.target.value })}>
          <option value="">keine Standardfolie</option>
          {Object.entries(CI_STANDARDFOLIEN).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </div>
      <textarea rows={2} className="w-full rounded border bg-background p-1 text-xs" value={s[seite] || ''} onChange={(e) => aendere({ [seite]: e.target.value })} />
    </div>
  );
}