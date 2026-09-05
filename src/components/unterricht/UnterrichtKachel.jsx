/**
 * UnterrichtKachel.jsx
 *
 * Eine Kachel im Bereich „Mein Unterricht": ein Fach in einer Jahrgangsstufe.
 * Zeigt auf einen Blick, wie viel dort schon vorbereitet ist, und öffnet die
 * zugehörige Fach-Seite.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, Boxes, ChevronRight, Pencil, PlaySquare } from 'lucide-react';

export default function UnterrichtKachel({
  kachel,
  farbe = '#94a3b8',
  onUmbenennen,
  onHoch,
  onRunter,
  istErste,
  istLetzte,
}) {
  const navigate = useNavigate();

  const oeffnen = () =>
    navigate(`/unterricht?fach=${encodeURIComponent(kachel.fach)}&jg=${encodeURIComponent(kachel.jahrgangsstufe)}`);

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
      <button type="button" onClick={oeffnen} className="w-full text-left">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${farbe}1a`, color: farbe }}
        >
          {kachel.fach}
        </span>
        <p className="mt-2 text-base font-bold text-foreground">
          {kachel.anzeigename || `${kachel.fach} · Jg. ${kachel.jahrgangsstufe}`}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <PlaySquare className="h-3.5 w-3.5 text-amber-600" />
            {kachel.anzahlStunden} Stunde{kachel.anzahlStunden !== 1 ? 'n' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 text-violet-600" />
            {kachel.anzahlBloecke} Übungsblock{kachel.anzahlBloecke !== 1 ? 'e' : ''}
          </span>
          <ChevronRight className="ml-auto h-4 w-4" />
        </div>
      </button>

      {/* Anpassen: Name und Reihenfolge — erscheinen erst beim Überfahren. */}
      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onHoch(kachel)}
          disabled={istErste}
          title="Nach vorne"
          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onRunter(kachel)}
          disabled={istLetzte}
          title="Nach hinten"
          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onUmbenennen(kachel)}
          title="Kachel benennen"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}