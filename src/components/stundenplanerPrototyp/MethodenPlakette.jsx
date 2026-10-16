import React from 'react';
import { User, Users, UsersRound, Presentation } from 'lucide-react';
import { KATEGORIEN, kategorienVon } from '@/lib/methodenKategorien';

const SOZIAL = { EA: User, PA: Users, GA: UsersRound, PL: Presentation };
const kuerzel = (s = '') => (/einzel|still/i.test(s) ? 'EA' : /partner/i.test(s) ? 'PA' : /gruppe/i.test(s) ? 'GA' : /plenum|klasse/i.test(s) ? 'PL' : s.slice(0, 2).toUpperCase());

/** Deutliche Kennzeichnung der gewählten Methode einer Phase, farbig nach Kategorie. */
export default function MethodenPlakette({ phase }) {
  const kat = KATEGORIEN[kategorienVon(phase.methode).haupt];
  const k = kuerzel(phase.sozialform);
  const Icon = SOZIAL[k] || Users;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${kat ? kat.cls : 'bg-muted text-foreground'}`} title={kat?.name}>
        {phase.methode || 'Freie Gestaltung'}
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground" title={phase.sozialform}>
        <Icon className="h-3 w-3" /> {k}
      </span>
    </div>
  );
}