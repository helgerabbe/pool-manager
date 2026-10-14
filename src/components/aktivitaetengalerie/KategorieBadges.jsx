import React from 'react';
import { KATEGORIEN, kategorienVon } from '@/lib/methodenKategorien';

/** Haupt- und Nebenkategorien einer Methode als Badges. */
export default function KategorieBadges({ name }) {
  const { haupt, neben } = kategorienVon(name);
  if (!haupt) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className={`rounded px-2 py-0.5 font-semibold ${KATEGORIEN[haupt].cls}`}>{KATEGORIEN[haupt].name}</span>
      {neben.map((k) => (
        <span key={k} className="rounded border px-2 py-0.5 text-muted-foreground">{KATEGORIEN[k].name}</span>
      ))}
    </div>
  );
}