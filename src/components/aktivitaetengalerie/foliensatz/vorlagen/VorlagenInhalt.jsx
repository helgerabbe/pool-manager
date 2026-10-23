import React from 'react';
import { PenLine, Lightbulb } from 'lucide-react';
import { CI_BOXEN } from '@/lib/folienCI';
import SozialSymbol from './SozialSymbol';
import AblaufKarten from './AblaufKarten';

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
      <AblaufKarten karten={f.phasen} />
    </div>
  );
  if (f.vorlage === 'uebergang') return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <SozialSymbol form={f.sozialform} gross mitName />
      <Titel>{f.titel}</Titel>
      <p className="line-clamp-2 max-w-2xl text-[26px]">{f.satz}</p>
    </div>
  );
  if (f.vorlage === 'fokus') return (
    <div className="relative flex flex-1 flex-col gap-6">
      {f.bild && <img src={f.bild} alt="" className="pointer-events-none absolute -bottom-24 -right-10 h-[62%] w-[58%] object-cover opacity-80" style={{ WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent), linear-gradient(to top, black 60%, transparent)', WebkitMaskComposite: 'source-in', maskImage: 'linear-gradient(to left, black 55%, transparent), linear-gradient(to top, black 60%, transparent)', maskComposite: 'intersect' }} />}
      <div className="relative max-w-[60%]"><Titel>{f.titel}</Titel><p className="mt-4 line-clamp-3 text-[30px] leading-snug text-[#3E5C8A]">{f.satz}</p></div>
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