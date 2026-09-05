/**
 * LernlandkarteInspektor.jsx
 *
 * Die Seitenschiene der Lernlandkarte: „nur mal gucken" (Kurzerklärung) und
 * „jetzt richtig lernen" (Sprung). Der Knopf „Kann ich schon" erscheint nur
 * für die Lerntypen, die ihren Stand selbst setzen dürfen.
 */
import React from 'react';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CTA_TEXT = {
  lernpaket: 'Vertieft lernen',
  wissensspeicher: 'Wissensspeicher öffnen',
  basispaket: 'Wissensspeicher öffnen',
  aufgaben: 'Zu den Aufgaben',
};

export default function LernlandkarteInspektor({
  node,
  status,
  kannSelbstMarkieren,
  onOeffnen,
  onMarkieren,
  busy,
}) {
  // Ohne ausgewählten Knoten gehört der Platz der Karte.
  if (!node) return null;

  const ctaText = CTA_TEXT[node.typ];
  const gesperrt = status?.gesperrt;

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col border-l border-white/10 bg-[#0f1830] px-7 py-7 lg:flex">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#48cae4]">
        {node.typ === 'aufgaben'
          ? 'Aufgaben'
          : node.typ === 'vorwissen' || node.typ === 'basispaket'
            ? 'Vorwissen'
            : node.typ === 'wissensspeicher'
              ? 'Wissensspeicher'
              : node.typ === 'themenfeld'
                ? 'Thema'
                : node.typ === 'einheit'
                  ? 'Deine Einheit'
                  : 'Lernziel'}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-white">
        {node.titel}
      </h2>
      {node.kurz && (
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">{node.kurz}</p>
      )}

      {status?.zaehler?.gesamt > 0 && (
        <p className="mt-4 text-sm font-medium text-[#06d6a0]">
          {status.zaehler.fertig} von {status.zaehler.gesamt} geschafft
        </p>
      )}

      <div className="mt-auto space-y-3 pt-8">
        {gesperrt && (
          <p className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/60">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Das ist noch zu. Arbeite erst den Schritt davor ab — dann geht es hier weiter.
          </p>
        )}

        {ctaText && !gesperrt && (
          <Button
            className="h-12 w-full gap-2 bg-[#48cae4] text-base font-semibold text-[#0b132b] hover:bg-[#48cae4]/90"
            onClick={() => onOeffnen?.(node)}
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {kannSelbstMarkieren && node.typ === 'lernpaket' && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onMarkieren?.(node)}
            className={`h-12 w-full gap-2 border-white/20 bg-transparent text-base font-semibold hover:bg-white/10 ${
              status?.geschafft ? 'text-[#06d6a0]' : 'text-white'
            }`}
          >
            <Check className="h-4 w-4" />
            {status?.geschafft ? 'Kann ich schon ✓' : 'Kann ich schon'}
          </Button>
        )}
      </div>
    </aside>
  );
}