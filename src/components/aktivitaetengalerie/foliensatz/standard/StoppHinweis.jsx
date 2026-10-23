import React from 'react';
import { Lock, Hourglass } from 'lucide-react';
import { CI_BUTTONS } from '@/lib/folienCI';

const b = CI_BUTTONS.weiter_gesperrt;

/** Stopp-Folie: gesperrter Weiter-Knopf + Hinweis, dass die Lehrkraft gleich freigibt. */
export default function StoppHinweis() {
  return (
    <div className="mt-2 flex items-center justify-center gap-2 text-[10px]">
      <span className="flex items-center gap-1 text-[#6A7181]"><Hourglass className="h-3 w-3 animate-pulse" />Gleich geht es weiter, deine Lehrkraft gibt frei.</span>
      <span className="flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 font-semibold" style={{ background: b.hg, color: b.text, borderColor: b.rand }}><Lock className="h-3 w-3" />Weiter</span>
    </div>
  );
}