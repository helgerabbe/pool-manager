import React from 'react';
import { PenLine, Lightbulb, Info } from 'lucide-react';
import { CI_BOXEN } from '@/lib/folienCI';
import SozialSymbol from './SozialSymbol';
import AblaufKarten from './AblaufKarten';
import SatzZeilen from './SatzZeilen';
import PartnersucheInhalt from './PartnersucheInhalt';
import SammlungInhalt from './SammlungInhalt';
import AbstimmungInhalt from './AbstimmungInhalt';
import EinschubInhalt from './EinschubInhalt';
import SatzImpulse from './SatzImpulse';

const Titel = ({ children }) => <h2 className="line-clamp-1 text-[40px] font-bold leading-tight">{children}</h2>;
const Box = ({ art, children }) => {
  const b = CI_BOXEN[art];
  const Icon = art === 'merksatz' ? Lightbulb : art === 'hinweis' ? Info : PenLine;
  const klein = art === 'hinweis';
  return (
    <div className={`rounded-xl border-2 ${klein ? 'px-5 py-3' : 'flex-1 p-6'}`} style={{ background: b.hg, borderColor: b.rand, borderLeft: `6px solid ${b.akzent}`, color: b.text }}>
      <p className={`flex items-center gap-2 font-semibold ${klein ? 'mb-1 text-base' : 'mb-3 text-xl'}`}><Icon className={klein ? 'h-5 w-5' : 'h-6 w-6'} />{b.titel}</p>
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
  if (f.vorlage === 'impuls') return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-4">
      {f.bild
        ? <img src={f.bild} alt="" className="h-full max-w-[75%] rounded-xl object-contain shadow-lg" />
        : <p className="text-2xl text-[#9AA1AE]">Hier erscheint der Impuls (Bild, Gegenstand oder Text).</p>}
    </div>
  );
  if (f.vorlage === 'einschub') return <EinschubInhalt f={f} />;
  if (f.vorlage === 'satzanfaenge') return (
    <div className="flex flex-1 flex-col gap-6 pr-48">
      <Titel>{f.titel}</Titel>
      <Box art="aufgabe"><p className="mb-6 line-clamp-2 text-[24px] leading-snug">{f.inhalt}</p><SatzImpulse impulse={f.satzimpulse} /></Box>
    </div>
  );
  if (f.vorlage === 'partnersuche') return <PartnersucheInhalt f={f} />;
  if (f.vorlage === 'sammlung') return <SammlungInhalt f={f} />;
  if (f.vorlage === 'abstimmung') return <AbstimmungInhalt f={f} />;
  if (f.vorlage === 'fokus') return (
    <div className="relative flex flex-1 flex-col gap-6">
      {f.bild && f.bild_verblassend && <img src={f.bild} alt="" className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full object-cover" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)' }} />}
      {f.bild && !f.bild_verblassend && <img src={f.bild} alt="" className="pointer-events-none absolute -bottom-24 -right-10 h-[95%] w-[58%] object-cover opacity-90" style={{ WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent), linear-gradient(to top, black 75%, transparent)', WebkitMaskComposite: 'source-in', maskImage: 'linear-gradient(to left, black 55%, transparent), linear-gradient(to top, black 75%, transparent)', maskComposite: 'intersect' }} />}
      <div className="relative max-w-[60%]"><Titel>{f.titel}</Titel><p className="mt-4 line-clamp-3 text-[30px] leading-snug text-[#3E5C8A]">{f.satz}</p></div>
    </div>
  );
  if (f.vorlage === 'sicherung') return (
    <div className="flex flex-1 flex-col gap-5 pr-48"><Titel>{f.titel}</Titel>
      <Box art="merksatz"><ul className="space-y-2 text-[22px]">{(f.punkte || []).slice(0, 4).map((p, i) => <li key={i} className="line-clamp-1">• {p}</li>)}</ul></Box>
    </div>
  );
  if (f.inhalt) return (
    <div className="flex flex-1 flex-col gap-4 pr-16">
      <div className="pr-32"><Titel>{f.titel}</Titel></div>
      <Box art="hinweis"><SatzZeilen text={f.methodisch} groesse={20} min={16} /></Box>
      <Box art="aufgabe"><SatzZeilen text={f.inhalt} groesse={28} min={20} className="font-semibold" /></Box>
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