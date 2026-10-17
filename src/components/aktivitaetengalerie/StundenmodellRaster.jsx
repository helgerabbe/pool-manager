import React from 'react';
import { STUNDEN_MODELLE, PASSUNG, BEITRAG } from '@/lib/stundenModelle';
import VariantenPassung, { VARIANTEN_LISTEN, BEITRAG_CLS } from './VariantenPassung';

const GRUPPEN = { uebung_: 'Individuelle Übung', diagnose_: 'Diagnose' };
const gruppeVon = (key) => Object.keys(GRUPPEN).find((g) => key.startsWith(g));

function ModellInhalt({ m, e }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {m.phasen.map((ph) => {
          const b = e.phasen[ph];
          return (
            <span key={ph} title={b ? BEITRAG[b] : 'nicht abgedeckt'}
              className={`rounded px-1.5 py-0.5 text-xs ${b ? BEITRAG_CLS[b] : 'bg-muted text-muted-foreground/60'}`}>{ph}</span>
          );
        })}
      </div>
      {e.hinweis && <p className="text-xs text-muted-foreground">{e.hinweis}</p>}
    </div>
  );
}

function PassungBadge({ e }) {
  const p = PASSUNG[e.passung];
  return <span className={`h-fit rounded-md px-2 py-1 text-center text-xs font-semibold ${p.cls}`}>{e.passung} · {p.label}</span>;
}

/** Raster: Passung je Stundenmodell + abgedeckte Phasen. Übungen und Diagnosen gruppiert. */
export default function StundenmodellRaster({ einordnung, varianten }) {
  const eintrag = (m) => einordnung[m.key] || { passung: 5, phasen: {} };
  const zeilen = [];
  STUNDEN_MODELLE.forEach((m) => {
    const g = gruppeVon(m.key);
    const letzte = zeilen[zeilen.length - 1];
    if (g && letzte?.gruppe === g) letzte.modelle.push(m);
    else if (g) zeilen.push({ gruppe: g, modelle: [m] });
    else if (VARIANTEN_LISTEN[m.key] && varianten) zeilen.push({ variantenVon: m });
    else zeilen.push({ modell: m });
  });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">In welchen Stundenmodellen passt sie, und welche Phasen deckt sie ab?</p>
      <div className="overflow-hidden rounded-xl border">
        {zeilen.map((z) => z.variantenVon ? (
          <div key={z.variantenVon.key} className="border-b p-3 last:border-b-0 text-sm">
            <p className="mb-2 font-semibold">{z.variantenVon.name}</p>
            <div className="space-y-2 border-l-2 border-primary/20 pl-3">
              {eintrag(z.variantenVon).hinweis && <p className="text-xs"><span className="font-medium">Insgesamt: </span><span className="text-muted-foreground">{eintrag(z.variantenVon).hinweis}</span></p>}
              <VariantenPassung modell={z.variantenVon} eintrag={eintrag(z.variantenVon)} varianten={varianten} />
            </div>
          </div>
        ) : z.modell ? (
          <div key={z.modell.key} className="grid grid-cols-[200px_150px_1fr] gap-3 border-b p-3 last:border-b-0 text-sm">
            <span className="font-semibold">{z.modell.name}</span>
            <PassungBadge e={eintrag(z.modell)} />
            <ModellInhalt m={z.modell} e={eintrag(z.modell)} />
          </div>
        ) : (
          <div key={z.gruppe} className="border-b p-3 last:border-b-0 text-sm">
            <p className="mb-2 font-semibold">{GRUPPEN[z.gruppe]}</p>
            <div className="space-y-2 border-l-2 border-primary/20 pl-3">
              {z.modelle.map((m) => (
                <div key={m.key} className="grid grid-cols-[185px_150px_1fr] gap-3">
                  <span className="text-xs font-medium">{m.name.replace(`${GRUPPEN[z.gruppe]} · `, '')}</span>
                  <PassungBadge e={eintrag(m)} />
                  <ModellInhalt m={m} e={eintrag(m)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(BEITRAG).map(([k, l]) => <span key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${BEITRAG_CLS[k]}`} />{l}</span>)}
      </div>
    </div>
  );
}