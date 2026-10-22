import React from 'react';
import { Timer } from 'lucide-react';
import { CI_GRUND, CI_TEXT, CI_TEXTFELD, CI_TIMER } from '@/lib/folienCI';

const BEISPIEL = { titel: 'Warum ziehen Menschen in die Städte?', zwischen: 'Think: Denke allein nach', fliess: 'Lies den Text und notiere drei Gründe.', klein: 'Du hast dafür 5 Minuten Zeit.' };
const ZEITEN = { normal: ['04:12', 'Läuft'], bald: ['00:45', 'Letzte Minute'], vorbei: ['00:00', 'Zeit ist um'] };

/** Vorschau Teil 3: Überschriften, Textfelder und Timer (statisch, verkleinert). */
export default function CiTextTimerVorschau() {
  const f = CI_TEXTFELD;
  return (
    <div className="space-y-4 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="border-2" style={{ background: f.hg, borderColor: f.rand, borderRadius: f.ecke, padding: f.innen }}>
        {Object.entries(CI_TEXT).map(([k, t]) => (
          <div key={k} className="mb-2">
            <p style={{ fontSize: t.groesse * 0.6, fontWeight: t.gewicht, color: t.farbe, lineHeight: t.zeile || 1.2 }}>{BEISPIEL[k]}</p>
            <p className="text-[10px] text-muted-foreground">{t.name} · {t.groesse} pt</p>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">Textfeld: weiße Karte, feiner Rand, runde Ecken, kein Schatten</p>
      </div>
      <div className="flex flex-wrap gap-4">
        {Object.entries(CI_TIMER).map(([k, t]) => (
          <div key={k} className="space-y-1 text-center">
            <span className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-bold tabular-nums" style={{ background: t.hg, color: t.text, boxShadow: `0 0 0 3px ${t.ring}` }}>
              <Timer className="h-5 w-5" />{ZEITEN[k][0]}
            </span>
            <p className="text-xs text-muted-foreground">{ZEITEN[k][1]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}