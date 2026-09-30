import React from 'react';
import { Sparkles } from 'lucide-react';

const LABELS = {
  sys_themenfeld_intro: 'Einführung in den Sektor',
  kompaktwissen: 'Kompaktwissen',
  onboarding_einfuehrung: 'Onboarding: Einführung',
  onboarding_fragenblock: 'Onboarding: Fragenblock',
  onboarding_einstiegsdiagnose: 'Onboarding: Einstiegsdiagnose',
  onboarding_lerntyp_diagnose: 'Onboarding: Lerntyp-Diagnose',
};

export default function KiInhaltHinweis({ parameter = {} }) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-semibold text-violet-900">
        <Sparkles className="h-4 w-4" />
        {LABELS[parameter.baustein_id] || parameter.baustein_id}
        <span className="font-normal text-violet-700">· {parameter.stelle || 'Einheit'}</span>
      </p>
      {parameter.hinweis && <p className="mt-1.5 text-violet-900">{parameter.hinweis}</p>}
      <p className="mt-1.5 text-xs text-violet-700">
        Beim Durchführen wird der bisherige Inhalt durch die MBK-Fassung ersetzt und muss neu gesichtet werden.
      </p>
    </div>
  );
}