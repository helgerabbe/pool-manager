import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, ListOrdered, RotateCcw, ArrowLeft } from 'lucide-react';
import { getSchrittTyp } from '@/lib/schrittTypen';

/**
 * Der Ablauf, an dem gerade geplant wird — nur Titel, Typ und ein Satz je
 * Schritt. Inhalte gibt es hier absichtlich nicht zu sehen: In diesem
 * Bereich geht es allein um Anzahl, Reihenfolge und Art der Schritte.
 */
export default function AblaufVorschlagListe({
  vorschlag, warnungen = [], busy, hatSchritte, disabled,
  onUebernehmen, onZuruecksetzen, onZurueck,
}) {
  const leer = !vorschlag?.length;
  return (
    <div className="flex flex-col min-h-0 h-full rounded-xl border border-violet-200 bg-violet-50 p-3 gap-3">
      <p className="shrink-0 flex items-center gap-2 text-xs font-semibold text-violet-900 uppercase tracking-wide">
        <ListOrdered className="w-3.5 h-3.5" />
        {leer ? 'Ablauf der Aufgabe' : `Ablauf · ${vorschlag.length} Schritte`}
      </p>

      {leer ? (
        <p className="flex-1 text-sm text-slate-600 leading-relaxed px-1 py-6 text-center">
          Hier erscheint der Ablauf, sobald der Assistent einen Vorschlag gemacht hat.
          Danach ändern Sie ihn im Gespräch, bis er passt.
        </p>
      ) : (
        <ol className="flex-1 space-y-2 overflow-y-auto min-h-[60px] pr-1">
          {vorschlag.map((v, i) => {
            const typInfo = getSchrittTyp(v.typ);
            return (
              <li key={v.id || i} className="flex items-start gap-2 rounded-lg bg-white border border-violet-100 px-3 py-2 text-sm">
                <span className="shrink-0 w-6 text-violet-500 font-bold">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 flex flex-wrap items-center gap-2">
                    {v.titel}
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
                      typInfo?.classes?.badge || 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {v.galerie_name || v.aktivitaet_name || typInfo?.kurz || v.typ}
                    </span>
                    {v.id && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                        bleibt erhalten
                      </span>
                    )}
                  </p>
                  {v.kurzbeschreibung && <p className="text-xs text-slate-600 leading-snug mt-0.5">{v.kurzbeschreibung}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {warnungen.length > 0 && (
        <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {warnungen.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11px] text-amber-900 leading-snug">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {w}
            </p>
          ))}
        </div>
      )}

      <div className="shrink-0 flex flex-wrap items-center gap-2 pt-1 border-t border-violet-200">
        <Button size="sm" className="gap-2" disabled={disabled || busy || leer} onClick={() => onUebernehmen(vorschlag)}>
          <Check className="w-3.5 h-3.5" /> Ablauf übernehmen — Aufgaben ausarbeiten
        </Button>
        {hatSchritte && (
          <Button size="sm" variant="outline" className="gap-2 bg-white" disabled={busy} onClick={onZurueck}>
            <ArrowLeft className="w-3.5 h-3.5" /> Ohne Änderung zurück
          </Button>
        )}
        {!leer && (
          <Button size="sm" variant="ghost" className="gap-2 text-slate-500 ml-auto" disabled={busy} onClick={onZuruecksetzen}>
            <RotateCcw className="w-3.5 h-3.5" /> Gespräch neu beginnen
          </Button>
        )}
      </div>
    </div>
  );
}