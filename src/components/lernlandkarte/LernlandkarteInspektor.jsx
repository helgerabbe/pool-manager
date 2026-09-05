/**
 * LernlandkarteInspektor.jsx
 *
 * Die Seitenschiene der Lernlandkarte: Was ist das hier — und wie geht es
 * weiter? Beim Lernziel stehen drei Knöpfe: zum Wissensspeicher, vertieft
 * lernen und die vierstufige Selbsteinschätzung (rot → grün), die zugleich
 * den Knoten auf der Karte einfärbt.
 *
 * Ohne ausgewählten Knoten gehört der Platz der Karte — dann rendert hier
 * nichts.
 */
import React from 'react';
import { ArrowRight, BookOpen, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { naechsteStufe, stufeVon } from '@/lib/lernlandkarteEinschaetzung';

const ART_LABEL = {
  aufgaben: 'Aufgaben',
  vorwissen: 'Vorwissen',
  basispaket: 'Vorwissen',
  themenfeld: 'Thema',
  einheit: 'Deine Einheit',
  lernpaket: 'Lernziel',
};

export default function LernlandkarteInspektor({
  node,
  status,
  kannSelbstMarkieren,
  onOeffnen,
  onMarkieren,
  busy,
}) {
  if (!node) return null;

  const gesperrt = status?.gesperrt;
  const istLernziel = node.typ === 'lernpaket';
  const stufe = stufeVon(status?.einschaetzung);

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col border-l border-white/10 bg-[#0f1830] px-6 py-6 lg:flex">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#48cae4]">
        {ART_LABEL[node.typ] || 'Lernziel'}
      </p>
      <h2 className="mt-2 font-display text-xl font-bold leading-tight text-white">
        {node.titel}
      </h2>
      {/* Beim Lernziel bewusst kein Zusatztext: die Frage selbst genügt. */}
      {!istLernziel && node.kurz && (
        <p className="mt-3 text-sm leading-relaxed text-white/70">{node.kurz}</p>
      )}

      {!istLernziel && status?.zaehler?.gesamt > 0 && (
        <p className="mt-4 text-sm font-medium text-[#06d6a0]">
          {status.zaehler.fertig} von {status.zaehler.gesamt} geschafft
        </p>
      )}

      <div className="mt-auto space-y-2.5 pt-8">
        {gesperrt && (
          <p className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/60">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Das ist noch zu. Arbeite erst den Schritt davor ab — dann geht es hier weiter.
          </p>
        )}

        {!gesperrt && (istLernziel || node.typ === 'basispaket') && (
          <Button
            variant="outline"
            onClick={() => onOeffnen?.(node, 'wissensspeicher')}
            className="h-11 w-full gap-2 border-white/20 bg-transparent text-sm font-semibold text-white hover:bg-white/10"
          >
            <BookOpen className="h-4 w-4" />
            Zum Wissensspeicher
          </Button>
        )}

        {!gesperrt && (istLernziel || node.typ === 'aufgaben') && (
          <Button
            className="h-11 w-full gap-2 bg-[#48cae4] text-sm font-semibold text-[#0b132b] hover:bg-[#48cae4]/90"
            onClick={() => onOeffnen?.(node, 'lernen')}
          >
            {node.typ === 'aufgaben' ? 'Zu den Aufgaben' : 'Vertieft lernen'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {kannSelbstMarkieren && istLernziel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkieren?.(node, naechsteStufe(status?.einschaetzung))}
            style={{
              borderColor: stufe?.farbe || 'rgba(255,255,255,0.2)',
              color: stufe?.farbe || '#ffffff',
              backgroundColor: stufe ? `${stufe.farbe}1f` : 'transparent',
            }}
            className="h-11 w-full rounded-md border text-sm font-semibold transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {stufe ? stufe.label : 'Wie sicher bist du?'}
          </button>
        )}
      </div>
    </aside>
  );
}