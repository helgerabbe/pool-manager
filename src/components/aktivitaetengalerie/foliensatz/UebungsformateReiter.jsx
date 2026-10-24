import React from 'react';
import { Button } from '@/components/ui/button';
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { UEBUNGSFORMATE, ANALOG_HINWEIS } from '@/lib/uebungsformate';
import StandardFolieAnsicht from './StandardFolieAnsicht';
import AufgabeTafelUmschalter from './AufgabeTafelUmschalter';

const basis = (key) => STANDARD_FOLIEN.find((x) => x.key === key) || {};

/** Übungsformate: je Format die digitale (Tablet + Tafel-Arbeitsauftrag) und ggf. analoge Fassung (Übung an der Tafel). */
export default function UebungsformateReiter() {
  const [key, setKey] = React.useState(UEBUNGSFORMATE[0].key);
  const [modus, setModus] = React.useState('digital');
  const f = UEBUNGSFORMATE.find((x) => x.key === key);
  const b = basis(key);
  const m = f[modus] ? modus : 'digital';
  const s = { ...b, key, folie: f.folie || b.folie, tablet_format: true };
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="w-64 shrink-0 overflow-y-auto rounded-xl border p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">{UEBUNGSFORMATE.length} Übungsformate</p>
        {UEBUNGSFORMATE.map((x) => (
          <button key={x.key} onClick={() => setKey(x.key)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${x.key === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            <span className="flex-1">{x.name}</span>
            <span className="rounded bg-sky-100 px-1 text-[10px] font-semibold text-sky-800">D</span>
            {x.analog && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">A</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-lg font-bold">{f.name}</p>
          <span className="ml-auto flex gap-1">
            <Button size="sm" variant={m === 'digital' ? 'secondary' : 'ghost'} onClick={() => setModus('digital')}>Digital (Schüler am Tablet)</Button>
            <Button size="sm" variant={m === 'analog' ? 'secondary' : 'ghost'} disabled={!f.analog} onClick={() => setModus('analog')}>Analog (Übung an der Tafel)</Button>
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {m === 'digital' ? <>
            <StandardFolieAnsicht s={{ ...s, ci: false, folie: f.folie ? { ...f.folie, vorlage: 'lueckentext' } : s.folie, schueler: f.tablet || b.schueler }} ansicht="schueler" />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Lehrkraft (Tafel)</p>
              <AufgabeTafelUmschalter s={s} />
              <p className="text-xs text-muted-foreground">{f.tafel_digital || b.lehrer}</p>
            </div>
          </> : <>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Schüler (Tablet)</p>
              <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm">{ANALOG_HINWEIS}</div>
              <p className="text-xs text-muted-foreground">Kein Gerät nötig; im digitalen Unterricht steht nur dieser Hinweis.</p>
            </div>
            <StandardFolieAnsicht s={{ ...s, ci: true, lehrer: f.tafel_analog }} ansicht="lehrer" />
          </>}
        </div>
      </div>
    </div>
  );
}