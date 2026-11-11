import React from 'react';
import { Lock, ClipboardCheck } from 'lucide-react';

/**
 * Sichtbarer Übergang im gemeinsamen Plan.
 * E-Plan: ab hier der Bereich nach der schriftlichen Arbeit.
 * G-Plan (nurPragmatiker): ab hier der Abschlusstest, den nur der Pragmatiker macht.
 */
export default function AbschnittTrenner({ nurPragmatiker = false }) {
  const Icon = nurPragmatiker ? ClipboardCheck : Lock;
  const linie = nurPragmatiker ? 'bg-blue-300' : 'bg-violet-300';
  const marke = nurPragmatiker ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-violet-200 bg-violet-50 text-violet-800';
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`h-px flex-1 ${linie}`} />
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${marke}`}>
        <Icon className="h-3 w-3" />
        {nurPragmatiker ? 'Nur Pragmatiker · Abschlusstest (Online-Test)' : 'Nach der schriftlichen Arbeit · Projektbereich'}
      </span>
      <span className={`h-px flex-1 ${linie}`} />
    </div>
  );
}