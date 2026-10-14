import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { STUFEN } from '@/lib/methodenStufen';
import { KATEGORIEN, KATEGORIE_REIHENFOLGE, kategorienVon } from '@/lib/methodenKategorien';

/** Methodenliste, gruppiert nach Hauptkategorie und darin nach Komplexitätsstufe. */
export default function GalerieListe({ liste, auswahlId, onWahl }) {
  const gruppen = [...KATEGORIE_REIHENFOLGE, null].map((k) => ({
    k, methoden: liste.filter((m) => kategorienVon(m.name).haupt === k),
  })).filter((g) => g.methoden.length);
  return gruppen.map(({ k, methoden }) => (
    <div key={k || 'ohne'} className="mb-3">
      <p className={`mb-1 rounded px-2 py-1 text-xs font-bold ${k ? KATEGORIEN[k].cls : 'bg-muted'}`}>{k ? KATEGORIEN[k].name : 'Ohne Kategorie'}</p>
      {[1, 2, 3, 4, 5, 6, null].map((s) => {
        const teil = methoden.filter((m) => (m.stufe || null) === s);
        if (!teil.length) return null;
        return (
          <div key={s || 'x'}>
            <p className="px-3 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{s ? `Stufe ${s} · ${STUFEN[s].name}` : 'Ohne Stufe'}</p>
            {teil.map((m) => (
              <button key={m.id} onClick={() => onWahl(m.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted ${auswahlId === m.id ? 'bg-muted font-semibold' : ''}`}>
                {m.bauplan_fertig ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="flex-1 truncate">{m.name}</span>
                {m.stufe_pruefen && <span className="text-xs text-orange-600">prüfen</span>}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  ));
}