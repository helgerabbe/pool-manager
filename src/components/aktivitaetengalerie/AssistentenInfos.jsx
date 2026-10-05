import React from 'react';
import { Bot, Palette } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const FELDER = [
  ['info_unterrichtsassistent', 'Informationen für den Unterrichtsassistenten', Bot],
  ['info_grafikassistent', 'Informationen für den Grafikassistenten', Palette],
];

/** Arbeitsgrundlagen für Unterrichts- und Grafikassistent. */
export default function AssistentenInfos({ werte, setze }) {
  return (
    <div className="space-y-4">
      {FELDER.map(([k, label, Icon]) => (
        <div key={k} className="space-y-1.5">
          <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{label}</p>
          <Textarea rows={10} value={werte[k] || ''} onChange={(e) => setze(k, e.target.value)} />
        </div>
      ))}
    </div>
  );
}