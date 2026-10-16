import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

const ICON = { ok: CheckCircle2, warn: AlertTriangle, frage: HelpCircle };
const FARBE = { ok: 'text-primary', warn: 'text-accent', frage: 'text-muted-foreground' };

/** Sichtbare Passungsprüfung des Grobentwurfs: Zeit, Modellphasen, Stundenziel, Annahmen. */
export default function GrobentwurfPruefung({ entwurf, modellPhasen, minuten, ziel, annahmen, warnungen = [] }) {
  const summe = entwurf.phasen.reduce((s, p) => s + (Number(p.minuten) || 0), 0);
  const abgedeckt = new Set(entwurf.phasen.flatMap((p) => [p.name, ...(p.deckt || [])]));
  (entwurf.entfaellt || []).forEach((x) => abgedeckt.add(x.phase));
  const fehlend = modellPhasen.filter((n) => !abgedeckt.has(n));
  const punkte = [
    Math.abs(summe - minuten) <= 5
      ? { art: 'ok', text: `Zeit passt: ${summe} von ${minuten} Min. verplant.` }
      : { art: 'warn', text: `Zeit prüfen: ${summe} Min. verplant, verfügbar sind ${minuten} Min.` },
    fehlend.length === 0
      ? { art: 'ok', text: 'Alle Phasen des Modells sind abgedeckt oder begründet entfallen.' }
      : { art: 'warn', text: `Nicht abgedeckt: ${fehlend.join(', ')}.` },
    ziel?.trim()
      ? { art: 'ok', text: `Bezug zum Stundenziel: „${ziel}“` }
      : { art: 'warn', text: 'Kein Stundenziel festgelegt – der Entwurf ist nur allgemein begründbar.' },
    ...annahmen.map((a) => ({ art: 'frage', text: `Annahme: ${a}` })),
  ];
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Passungsprüfung</p>
      {warnungen.map((w, i) => (
        <p key={`w${i}`} className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}
        </p>
      ))}
      {warnungen.length > 0 && <p className="text-xs text-muted-foreground">Du kannst den Entwurf trotzdem übernehmen.</p>}
      {punkte.map((p, i) => {
        const I = ICON[p.art];
        return <p key={i} className="flex gap-2 text-sm text-muted-foreground"><I className={`mt-0.5 h-4 w-4 shrink-0 ${FARBE[p.art]}`} />{p.text}</p>;
      })}
    </div>
  );
}