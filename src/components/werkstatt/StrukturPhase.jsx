import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, ListOrdered, RotateCcw } from 'lucide-react';
import GespraechsSpalte from '@/components/werkstatt/GespraechsSpalte';
import { getSchrittTyp } from '@/lib/schrittTypen';

/**
 * StrukturPhase
 * ─────────────
 * Erst die Folge besprechen, dann bauen.
 *
 * Der Assistent schlägt hier nur die Schrittfolge als Text vor — das dauert
 * Sekunden, während das Bauen einer einzelnen Aufgabe Minuten kostet. Die
 * Lehrkraft sieht den Vorschlag als Liste und entscheidet, ob er die
 * bisherige Folge ersetzt oder an sie angehängt wird.
 *
 * Nichts wird ungefragt übernommen: `vorschlag` bleibt liegen, bis jemand
 * einen der beiden Knöpfe drückt.
 */
export default function StrukturPhase({
  struktur,
  hatSchritte,
  onUebernehmen,   // (vorschlag, { anhaengen }) => void
  disabled = false,
}) {
  const [eingabe, setEingabe] = useState('');

  const abschicken = () => {
    const t = eingabe.trim();
    if (!t || struktur.busy) return;
    setEingabe('');
    struktur.senden(t);
  };

  const vorschlag = struktur.vorschlag;

  return (
    <div className="flex flex-col min-h-0 gap-3 h-full">
      <GespraechsSpalte
        gen={struktur}
        eingabe={eingabe}
        onEingabe={setEingabe}
        onAbschicken={abschicken}
        disabled={disabled}
        className="flex-1 min-h-[220px]"
        platzhalter="Worum geht es in dieser Aufgabe? Was sollen die Schüler am Ende können?"
        leerText="Beschreiben Sie kurz, worum es gehen soll — ich schlage Ihnen eine Schrittfolge vor. Gebaut wird noch nichts."
      />

      {vorschlag?.length > 0 && (
        <div className="shrink-0 rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-violet-900 uppercase tracking-wide">
            <ListOrdered className="w-3.5 h-3.5" />
            Vorgeschlagene Folge · {vorschlag.length} Schritte
          </p>

          <ol className="space-y-1.5">
            {vorschlag.map((v, i) => {
              const typInfo = getSchrittTyp(v.typ);
              return (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 w-5 text-violet-500 font-semibold">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {v.titel}
                      <span className={`ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
                        typInfo?.classes?.badge || 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {v.aktivitaet_name || typInfo?.kurz || v.typ}
                      </span>
                    </p>
                    {v.kurzbeschreibung && (
                      <p className="text-slate-600 leading-snug">{v.kurzbeschreibung}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {struktur.warnungen.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
              {struktur.warnungen.map((w, i) => (
                <p key={i} className="flex items-start gap-1.5 text-[11px] text-amber-900 leading-snug">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-2"
              disabled={disabled || struktur.busy}
              onClick={() => onUebernehmen(vorschlag, { anhaengen: false })}
            >
              <Check className="w-3.5 h-3.5" />
              {hatSchritte ? 'Bisherige Folge ersetzen' : 'Folge übernehmen'}
            </Button>
            {hatSchritte && (
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || struktur.busy}
                onClick={() => onUebernehmen(vorschlag, { anhaengen: true })}
              >
                Hinten anhängen
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-slate-500 ml-auto"
              disabled={struktur.busy}
              onClick={struktur.zuruecksetzen}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Neu anfangen
            </Button>
          </div>

          {hatSchritte && (
            <p className="text-[11px] text-slate-600 leading-snug">
              „Ersetzen" wirft die vorhandenen Schritte weg — auch bereits gebaute. Gespeichert wird
              erst, wenn Sie unten auf Speichern klicken.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
