import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, AlertTriangle } from 'lucide-react';

/**
 * GespraechsSpalte
 * ────────────────
 * Das Gespräch mit dem Assistenten: Verlauf, Streaming-Antwort, Fehler,
 * Warnungen und das Eingabefeld.
 *
 * Herausgelöst aus AufgabenWerkstattModal (2026-08-29), damit die alte
 * Werkstatt (einzelne offene Aufgabe) und die neue dreispaltige Werkstatt
 * dieselbe Spalte benutzen. Zustandslos bis auf das Scrollen — Verlauf und
 * Eingabe liegen beim Aufrufer.
 *
 * Props:
 *   - gen         Rückgabe von useAufgabenGenerator
 *   - eingabe / onEingabe   kontrolliertes Eingabefeld
 *   - onAbschicken          Absenden (auch per Strg/Cmd + Enter)
 *   - disabled              Eingabe gesperrt (z. B. freigegebene Aufgabe)
 *   - platzhalter, leerText Beschriftungen je Einsatzort
 */
export default function GespraechsSpalte({
  gen,
  eingabe,
  onEingabe,
  onAbschicken,
  disabled = false,
  platzhalter = 'Was sollen die Schüler:innen sehen und tun?',
  leerText = 'Sag einfach, was die Schüler:innen üben sollen. Wenn etwas fehlt, frage ich nach — sonst baue ich eine erste Fassung, an der wir weiterarbeiten.',
  className = '',
}) {
  const verlaufRef = useRef(null);

  useEffect(() => {
    verlaufRef.current?.scrollTo({ top: verlaufRef.current.scrollHeight, behavior: 'smooth' });
  }, [gen.verlauf.length, gen.teilAntwort]);

  return (
    <div className={`flex flex-col min-h-0 rounded-xl border border-slate-200 bg-white ${className}`}>
      <div ref={verlaufRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {gen.verlauf.length === 0 && !gen.busy && (
          <p className="text-sm text-slate-500 py-8 px-2 text-center leading-relaxed">
            {leerText}
          </p>
        )}

        {gen.verlauf.map((m, i) => (
          <div
            key={i}
            className={m.rolle === 'lehrkraft'
              ? 'ml-8 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-sm whitespace-pre-wrap'
              : 'mr-8 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm whitespace-pre-wrap'}
          >
            {m.text}
          </div>
        ))}

        {gen.busy && (
          <div className="mr-8 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm whitespace-pre-wrap">
            {gen.teilAntwort || (
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> denkt nach…
              </span>
            )}
          </div>
        )}

        {gen.fehler && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{gen.fehler}</span>
          </div>
        )}

        {gen.warnungen.map((w, i) => (
          <div key={`w${i}`} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            {w} — sag mir am besten noch einmal in anderen Worten, was geändert werden soll.
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3 space-y-2 shrink-0">
        <Textarea
          value={eingabe}
          onChange={(e) => onEingabe(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAbschicken();
          }}
          placeholder={platzhalter}
          className="min-h-[80px] resize-none text-sm"
          disabled={disabled}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={onAbschicken}
            disabled={!eingabe.trim() || gen.busy || disabled}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {gen.busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Arbeitet…</>
              : <><Send className="w-4 h-4" /> Abschicken</>}
          </Button>
          {gen.busy && (
            <Button variant="ghost" onClick={gen.abbrechen} className="text-slate-500">
              Abbrechen
            </Button>
          )}
          <span className="text-[11px] text-slate-400 ml-auto">Strg + Enter</span>
        </div>
      </div>
    </div>
  );
}
