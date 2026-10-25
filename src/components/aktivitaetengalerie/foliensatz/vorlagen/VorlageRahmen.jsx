import React from 'react';
import { Lock, ArrowRight, VolumeX, Volume1 } from 'lucide-react';
import { FOLIE_B, FOLIE_H } from '@/lib/kiFoliensatz';
import { CI_GRUND, CI_FOLIENTYPEN, CI_TIMER, CI_BUTTONS } from '@/lib/folienCI';
import SozialSymbol from './SozialSymbol';
import FolienTimer from './FolienTimer';
import TabletKopfAktionen from './TabletKopfAktionen';
import SchrittPunkte from './SchrittPunkte';
import NotizHeft from './NotizHeft';

/** Fester Folienrahmen: Off-White, Folientyp-Ecke, Kopfleiste, Status oben rechts, Steuerung unten rechts. */
export default function VorlageRahmen({ folie, kopf, klein, tablet, children }) {
  const ref = React.useRef(null);
  const innen = React.useRef(null);
  const [faktor, setFaktor] = React.useState(1);
  const [hoehe, setHoehe] = React.useState(FOLIE_H);
  React.useEffect(() => {
    const ro = new ResizeObserver(([e]) => setFaktor(e.contentRect.width / FOLIE_B));
    ro.observe(ref.current);
    const ri = new ResizeObserver(([e]) => setHoehe(e.target.offsetHeight));
    ri.observe(innen.current);
    return () => { ro.disconnect(); ri.disconnect(); };
  }, []);
  const typ = CI_FOLIENTYPEN[folie.folientyp];
  const knopf = folie.freigabe === 'lehrkraft' || !folie.freigabe ? CI_BUTTONS.weiter_gesperrt : CI_BUTTONS.weiter;
  return (
    <div ref={ref} className={`relative w-full overflow-hidden ring-1 ring-border ${tablet ? '' : 'aspect-video'} ${klein ? 'rounded-md' : 'rounded-xl shadow-lg'}`} style={tablet ? { height: hoehe * faktor } : undefined}>
      <div ref={innen} className="absolute left-0 top-0 origin-top-left font-inter" style={{ width: FOLIE_B, height: tablet ? undefined : FOLIE_H, minHeight: FOLIE_H, transform: `scale(${faktor})`, background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
        {tablet && <NotizHeft gross />}
        {tablet && hoehe > FOLIE_H + 2 && <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-[#9AA1AE]" style={{ top: FOLIE_H }}><span className="absolute right-4 top-1 text-sm text-[#6A7181]">Bildschirmende · darunter wird gescrollt</span></div>}
        {typ && <div className="absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full" style={{ background: typ.farbe }} />}
        <div className="absolute left-10 top-4 text-sm text-[#6A7181]">{kopf}</div>
        <div className={`absolute flex items-center ${tablet ? 'right-6 top-3 z-20 gap-2' : 'right-8 top-6 gap-3'}`}>
          {tablet && folie.schritte > 1 && <SchrittPunkte schritt={folie.schritt || 1} schritte={folie.schritte} />}
          {tablet && folie.folientyp === 'aufgabe' && <TabletKopfAktionen folie={folie} />}
          {folie.leise && <span title="Bitte leise arbeiten" className={`flex items-center justify-center rounded-full bg-[#E3EFE6] text-[#24553A] ${tablet ? 'h-9 w-9' : 'h-12 w-12'}`}><VolumeX className={tablet ? 'h-5 w-5' : 'h-7 w-7'} /></span>}
          {folie.fluestern && <span title="Bitte mit Flüsterstimme sprechen" className={`flex items-center justify-center rounded-full bg-[#E3EFE6] text-[#24553A] ${tablet ? 'h-9 w-9' : 'h-12 w-12'}`}><Volume1 className={tablet ? 'h-5 w-5' : 'h-7 w-7'} /></span>}
          {folie.sozialform && <span className={tablet ? 'origin-right scale-75' : ''}><SozialSymbol form={folie.sozialform} /></span>}
          {(['aufgabe', 'reflexion'].includes(folie.folientyp) || (folie.folientyp === 'organisation' && folie.minuten > 0)) && <FolienTimer key={folie.id || folie.titel} start={folie.minuten || 5} nurAnzeige={tablet} />}
        </div>
        {tablet
          ? <div className={`relative flex flex-col gap-4 px-10 pb-5 pt-16 ${folie.kein_scroll ? 'overflow-hidden' : ''}`} style={folie.kein_scroll ? { height: FOLIE_H } : { minHeight: FOLIE_H }}><div className="flex flex-1 flex-col">{children}</div><Knopf knopf={knopf} /></div>
          : <><div className="absolute inset-x-10 bottom-24 top-16 flex flex-col">{children}</div><div className="absolute bottom-6 right-8"><Knopf knopf={knopf} /></div></>}
      </div>
    </div>
  );
}

const Knopf = ({ knopf }) => (
        <div className="ml-auto flex w-fit items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-lg font-semibold" style={{ background: knopf.hg, color: knopf.text, borderColor: knopf.rand }}>
          {knopf.gesperrt ? <Lock className="h-5 w-5" /> : null}Weiter{!knopf.gesperrt && <ArrowRight className="h-5 w-5" />}
        </div>
);