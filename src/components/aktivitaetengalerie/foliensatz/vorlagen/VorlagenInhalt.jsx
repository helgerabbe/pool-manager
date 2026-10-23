import React from 'react';
import { ArrowRight, PenLine, Lightbulb } from 'lucide-react';
import { CI_BOXEN, CI_TEXTFELD } from '@/lib/folienCI';
import SozialSymbol from './SozialSymbol';

const Titel = ({ children }) => <h2 className="line-clamp-1 text-[40px] font-bold leading-tight">{children}</h2>;
const Box = ({ art, children }) => {
  const b = CI_BOXEN[art];
  const Icon = art === 'merksatz' ? Lightbulb : PenLine;
  return (
    <div className="flex-1 rounded-xl border-2 p-6" style={{ background: b.hg, borderColor: b.rand, color: b.text }}>
      <p className="mb-3 flex items-center gap-2 text-xl font-semibold"><Icon className="h-6 w-6" />{b.titel}</p>
      {children}
    </div>
  );
};

/** Inhalt je fester Vorlage; Texte sind begrenzt (line-clamp), damit nichts überläuft. */
export default function VorlagenInhalt({ f }) {
  if (f.vorlage === 'uebersicht') return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="pr-48"><Titel>{f.titel}</Titel><p className="line-clamp-1 text-2xl text-[#3E5C8A]">{f.untertitel}</p></div>
      <div className="flex flex-1 items-center gap-3">
        {(f.phasen || []).slice(0, 4).map((p, i, a) => (
          <React.Fragment key={i}>
            <div className="flex h-full flex-1 flex-col items-center gap-3 rounded-xl border-2 bg-white p-5 text-center" style={{ borderColor: CI_TEXTFELD.rand }}>
              <SozialSymbol form={p.sozialform} mitName />
              <p className="line-clamp-1 text-[28px] font-semibold text-[#3E5C8A]">{p.name}</p>
              <p className="line-clamp-3 text-lg leading-snug">{p.satz}</p>
            </div>
            {i < a.length - 1 && <ArrowRight className="h-8 w-8 shrink-0 text-[#9AA3B2]" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
  if (f.vorlage === 'uebergang') return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <SozialSymbol form={f.sozialform} gross mitName />
      <Titel>{f.titel}</Titel>
      <p className="line-clamp-2 max-w-2xl text-[26px]">{f.satz}</p>
    </div>
  );
  if (f.vorlage === 'sicherung') return (
    <div className="flex flex-1 flex-col gap-5 pr-48"><Titel>{f.titel}</Titel>
      <Box art="merksatz"><ul className="space-y-2 text-[22px]">{(f.punkte || []).slice(0, 4).map((p, i) => <li key={i} className="line-clamp-1">• {p}</li>)}</ul></Box>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col gap-5 pr-48">
      <Titel>{f.titel}</Titel>
      <Box art="aufgabe">
        <p className="line-clamp-4 text-[24px] leading-snug">{f.vorlage === 'aufgabe' ? 'Hier steht die Aufgabe der Stunde.' : f.auftrag}</p>
      </Box>
      {f.hinweis && <p className="line-clamp-1 text-xl text-[#24553A]">{f.hinweis}</p>}
    </div>
  );
}