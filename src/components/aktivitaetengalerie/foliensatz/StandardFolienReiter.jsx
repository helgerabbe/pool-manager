import React from 'react';
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { CI_FOLIENTYPEN } from '@/lib/folienCI';
import { CI_STANDARD_REGEL } from '@/lib/folienCIStandard';
import { EINSATZ, FOLIEN_EINSATZ, scrollText } from '@/lib/standardFolienEinsatz';
import StandardFolienRegeln from './StandardFolienRegeln';
import StandardFolieAnsicht from './StandardFolieAnsicht';
import { INHALTS_FUNKTIONEN } from '@/lib/inhaltsFolienFunktionen';
import InhaltsFunktionAnsicht from './InhaltsFunktionAnsicht';

// Fertige Inhaltsfolien stehen oben bei den Inhaltsfolien und verschwinden aus „nach Funktion“.
const FERTIG = new Set(STANDARD_FOLIEN.filter((s) => s.folientyp === 'inhalt').map((s) => s.name));
const OFFENE_FUNKTIONEN = INHALTS_FUNKTIONEN.filter((f) => !FERTIG.has(f.name));

// Rahmenfolien = wer sieht was wo (mit Leerstelle); Aufgabenformate = füllen die Leerstelle (Tablet- und Tafel-Fassung).
const GRUPPEN = [
  { typ: 'rahmen', name: 'Rahmenfolien', farbe: '#DCE7F5', keys: ['einzelphase', 'partnerphase', 'gruppenphase', 'arbeitsphase_analog', 'aufgabenerklaerung', 'klassenmodus'] },
  { typ: 'interaktiv', name: 'Interaktive Aufgabenfolien', farbe: '#DCE8F5', keys: ['kartenabfrage'] },
];
// Aufgabenformate haben einen eigenen Bereich (UebungsformateReiter) und erscheinen hier nicht.
const FORMATE = ['lueckentext', 'notizen', 'satzanfaenge'];
const SONDER = [...GRUPPEN.flatMap((g) => g.keys), ...FORMATE];

/** Standardfolien-Galerie: links alle Standardsituationen, rechts Tablet, Tafel und Regeln der gewählten Folie. */
export default function StandardFolienReiter() {
  const [key, setKey] = React.useState(STANDARD_FOLIEN[0].key);
  const [funktion, setFunktion] = React.useState(null);
  const s = STANDARD_FOLIEN.find((x) => x.key === key);
  const waehle = (k) => { setFunktion(null); setKey(k); };
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="w-64 shrink-0 overflow-y-auto rounded-xl border p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">{STANDARD_FOLIEN.length} Standardfolien</p>
        {[...GRUPPEN, ...Object.entries(CI_FOLIENTYPEN).map(([typ, t]) => ({ typ, name: `${t.name}n`, farbe: t.farbe }))].map(({ typ, name, farbe, keys }) => {
          const t = { name, farbe };
          const gruppe = STANDARD_FOLIEN.filter((x) => (keys ? keys.includes(x.key) : x.folientyp === typ && !SONDER.includes(x.key)));
          if (!gruppe.length) return null;
          return (
            <div key={typ} className="mb-3">
              <p className="mb-1 flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold" style={{ background: t.farbe }}>{t.name} <span className="ml-auto font-normal">{gruppe.length}</span></p>
              {gruppe.map((x) => (
                <button key={x.key} onClick={() => waehle(x.key)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${x.key === key && !funktion ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.farbe }} /><span className="flex-1">{x.name}</span><span className={`rounded px-1 text-[10px] font-semibold ${EINSATZ[FOLIEN_EINSATZ[x.key]].klasse}`}>{EINSATZ[FOLIEN_EINSATZ[x.key]].kurz}</span>
                </button>
              ))}
            </div>
          );
        })}
        <p className="mb-1 rounded-md bg-[#F3E8D6] px-2 py-1 text-xs font-semibold">Inhaltsfolien nach Funktion <span className="float-right font-normal">{OFFENE_FUNKTIONEN.length}</span></p>
        {OFFENE_FUNKTIONEN.map((x) => (
          <button key={x.key} onClick={() => { setFunktion(x); if (x.folie) setKey(x.folie); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${funktion?.key === x.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            <img src={x.symbol} alt="" className="h-5 w-5 shrink-0 rounded-full bg-white object-contain" /><span className="flex-1">{x.name}</span>
          </button>
        ))}
      </div>
      {funktion ? <InhaltsFunktionAnsicht f={funktion} /> :
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
        <div><p className="font-display text-lg font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{CI_FOLIENTYPEN[s.folientyp]?.name || s.folientyp} · {scrollText(s.key)}</p>
          <p className={`mt-1 inline-block rounded-md px-2 py-1 text-sm font-medium ${EINSATZ[FOLIEN_EINSATZ[s.key]].klasse}`}>{EINSATZ[FOLIEN_EINSATZ[s.key]].name}: {EINSATZ[FOLIEN_EINSATZ[s.key]].text}</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StandardFolieAnsicht s={s} ansicht="schueler" />
          <StandardFolieAnsicht s={s} ansicht="lehrer" />
        </div>
        <StandardFolienRegeln s={s} />
        <p className="text-xs text-muted-foreground">{CI_STANDARD_REGEL}</p>
      </div>}
    </div>
  );
}