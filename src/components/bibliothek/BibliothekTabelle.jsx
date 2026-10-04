import React from 'react';
import { Star, PlaySquare, Boxes } from 'lucide-react';
import { format } from 'date-fns';

/** Tabellarischer Katalog. Optional mit Auswahl-Häkchen (Übernehmen-Modus). */
export default function BibliothekTabelle({ eintraege, merkIds, onMerken, auswahl, onAuswahl }) {
  if (eintraege.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Keine Einträge gefunden.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            {auswahl && <th className="w-8 p-2" />}
            <th className="w-8 p-2" />
            <th className="p-2">Art</th><th className="p-2">Titel</th><th className="p-2">Fach</th>
            <th className="p-2">Jg.</th><th className="p-2">Schuljahr</th><th className="p-2">Thema / Einheit</th>
            <th className="p-2">Veröffentlicht von</th><th className="p-2">Datum</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {eintraege.map((e) => (
            <tr key={e.id} className={merkIds.has(e.id) ? 'bg-amber-50/60' : ''}>
              {auswahl && (
                <td className="p-2"><input type="checkbox" checked={auswahl.has(e.id)} onChange={() => onAuswahl(e.id)} /></td>
              )}
              <td className="p-2">
                <button type="button" onClick={() => onMerken(e.id)} title="Markieren">
                  <Star className={`h-4 w-4 ${merkIds.has(e.id) ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`} />
                </button>
              </td>
              <td className="p-2">
                {e.art === 'stunde'
                  ? <span className="flex items-center gap-1 text-xs"><PlaySquare className="h-3.5 w-3.5 text-accent" />Stunde</span>
                  : <span className="flex items-center gap-1 text-xs"><Boxes className="h-3.5 w-3.5 text-violet-600" />Übung</span>}
              </td>
              <td className="p-2 font-medium">
                {e.titel}
                {e.beschreibung && <p className="line-clamp-1 text-xs font-normal text-muted-foreground">{e.beschreibung}</p>}
              </td>
              <td className="p-2">{e.fach}</td>
              <td className="p-2">{e.jahrgangsstufe}</td>
              <td className="p-2 whitespace-nowrap">{e.schuljahr}</td>
              <td className="p-2">{e.unterrichtseinheit_titel}</td>
              <td className="p-2">{e.veroeffentlicht_von_name}</td>
              <td className="p-2 whitespace-nowrap">{format(new Date(e.created_date), 'dd.MM.yyyy')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}