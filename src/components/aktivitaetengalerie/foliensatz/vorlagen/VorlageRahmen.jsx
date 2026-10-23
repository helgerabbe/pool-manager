import React from 'react';
import { Lock, ArrowRight, VolumeX } from 'lucide-react';
import { FOLIE_B, FOLIE_H } from '@/lib/kiFoliensatz';
import { CI_GRUND, CI_FOLIENTYPEN, CI_TIMER, CI_BUTTONS } from '@/lib/folienCI';
import SozialSymbol from './SozialSymbol';

/** Fester Folienrahmen: Off-White, Folientyp-Ecke, Kopfleiste, Status oben rechts, Steuerung unten rechts. */
export default function VorlageRahmen({ folie, kopf, klein, children }) {
  const ref = React.useRef(null);
  const [faktor, setFaktor] = React.useState(1);
  React.useEffect(() => {
    const ro = new ResizeObserver(([e]) => setFaktor(e.contentRect.width / FOLIE_B));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const typ = CI_FOLIENTYPEN[folie.folientyp];
  const knopf = folie.freigabe === 'lehrkraft' || !folie.freigabe ? CI_BUTTONS.weiter_gesperrt : CI_BUTTONS.weiter;
  return (
    <div ref={ref} className={`relative aspect-video w-full overflow-hidden ring-1 ring-border ${klein ? 'rounded-md' : 'rounded-xl shadow-lg'}`}>
      <div className="absolute left-0 top-0 origin-top-left font-inter" style={{ width: FOLIE_B, height: FOLIE_H, transform: `scale(${faktor})`, background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
        {typ && <div className="absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full" style={{ background: typ.farbe }} />}
        <div className="absolute left-10 top-4 text-sm text-[#6A7181]">{kopf}</div>
        <div className="absolute right-8 top-6 flex items-center gap-3">
          {folie.leise && <span title="Bitte leise arbeiten" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E3EFE6] text-[#24553A]"><VolumeX className="h-7 w-7" /></span>}
          {folie.sozialform && <SozialSymbol form={folie.sozialform} />}
          {folie.minuten > 0 && <span className="rounded-full px-4 py-1.5 text-lg font-semibold" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text }}>{folie.minuten}:00</span>}
        </div>
        <div className="absolute inset-x-10 bottom-24 top-16 flex flex-col">{children}</div>
        <div className="absolute bottom-6 right-8 flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-lg font-semibold" style={{ background: knopf.hg, color: knopf.text, borderColor: knopf.rand }}>
          {knopf.gesperrt ? <Lock className="h-5 w-5" /> : null}Weiter{!knopf.gesperrt && <ArrowRight className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}