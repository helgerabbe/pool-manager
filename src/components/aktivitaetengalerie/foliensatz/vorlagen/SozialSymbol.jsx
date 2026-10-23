import React from 'react';
import { User, Users, Network, Presentation } from 'lucide-react';
import { CI_SOZIALFORM, CI_SYMBOL_STIL } from '@/lib/folienCI';

const ICONS = { EA: User, PA: Users, GA: Network, PL: Presentation };

/** Sozialform als Pastellkreis mit Symbol, optional mit Namen darunter. */
export default function SozialSymbol({ form, gross, mitName }) {
  const Icon = ICONS[form] || User;
  const d = gross ? 'h-24 w-24' : 'h-12 w-12';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center justify-center rounded-full ${d}`} style={{ background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe }}>
        <Icon className={gross ? 'h-12 w-12' : 'h-6 w-6'} />
      </div>
      {mitName && <span className="text-base text-[#6A7181]">{CI_SOZIALFORM[form]?.name}</span>}
    </div>
  );
}