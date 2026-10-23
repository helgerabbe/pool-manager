import React from 'react';
import { GripVertical, Check } from 'lucide-react';
import { CI_GRUND, CI_INTERAKTIV as I, CI_SCHATTEN } from '@/lib/folienCI';

/** Vorschau Teil 7: interaktive Elemente. */
export default function CiInteraktivVorschau() {
  const karte = { background: I.karte.hg, borderColor: I.karte.rand, color: I.karte.text };
  return (
    <div className="grid gap-4 rounded-xl p-4 ring-1 ring-border sm:grid-cols-2" style={{ background: CI_GRUND.hintergrund }}>
      <div className="space-y-2">
        <p className="text-xs font-semibold">Karten und Ablage</p>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={karte}><GripVertical className="h-4 w-4" style={{ color: I.karte.griff }} />Landflucht</div>
        <div className="flex rotate-1 items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm" style={{ ...karte, borderColor: I.gezogen.rand, boxShadow: CI_SCHATTEN.gehoben }}><GripVertical className="h-4 w-4" style={{ color: I.karte.griff }} />Wird gezogen</div>
        <div className="rounded-xl border-2 border-dashed p-3 text-center text-xs" style={{ background: I.ablage.hg, borderColor: I.ablage.rand }}>Hier ablegen</div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold">Auswahl, Notiz, Regler</p>
        {[false, true].map((g) => (
          <div key={String(g)} className="flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm" style={{ background: g ? I.auswahl.gewaehlt_hg : I.auswahl.hg, borderColor: g ? I.auswahl.gewaehlt_rand : I.auswahl.rand }}>
            <span className="flex h-5 w-5 items-center justify-center rounded-md border" style={{ borderColor: I.auswahl.gewaehlt_rand, background: g ? I.auswahl.gewaehlt_rand : '#fff' }}>{g && <Check className="h-3 w-3 text-white" />}</span>{g ? 'Gewählt' : 'Nicht gewählt'}
          </div>
        ))}
        <div className="rounded-lg border p-2 text-sm" style={{ background: I.notiz.hg, borderColor: I.notiz.rand, color: I.notiz.text }}>Notizzettel: „Mehr Arbeitsplätze“</div>
        <div className="relative h-2 rounded-full" style={{ background: I.regler.spur }}><div className="h-2 w-3/5 rounded-full" style={{ background: I.regler.fuellung }} /><span className="absolute -top-1.5 h-5 w-5 rounded-full" style={{ left: 'calc(60% - 10px)', background: I.regler.knopf }} /></div>
      </div>
    </div>
  );
}