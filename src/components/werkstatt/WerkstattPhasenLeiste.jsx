import React from 'react';
import { FolderOpen, ListOrdered, Hammer, Check } from 'lucide-react';

const PHASEN = [
  { id: 'einstieg', nr: 1, label: 'Material & Idee', Icon: FolderOpen },
  { id: 'struktur', nr: 2, label: 'Ablauf planen', Icon: ListOrdered },
  { id: 'werkstatt', nr: 3, label: 'Aufgaben ausarbeiten', Icon: Hammer },
];

/**
 * Die drei Bereiche der Werkstatt als Leiste — damit jederzeit klar ist,
 * WO man gerade arbeitet und was in diesem Bereich passiert (und was nicht).
 */
export default function WerkstattPhasenLeiste({ ansicht }) {
  const aktiv = PHASEN.findIndex((p) => p.id === ansicht);
  return (
    <ol className="flex items-center gap-1 text-xs">
      {PHASEN.map((p, i) => {
        const istAktiv = i === aktiv;
        const erledigt = i < aktiv;
        return (
          <li key={p.id} className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              istAktiv
                ? 'bg-violet-600 border-violet-600 text-white font-semibold'
                : erledigt
                  ? 'bg-violet-50 border-violet-200 text-violet-800'
                  : 'bg-white border-slate-200 text-slate-500'
            }`}>
              {erledigt ? <Check className="w-3 h-3" /> : <p.Icon className="w-3 h-3" />}
              {p.nr}. {p.label}
            </span>
            {i < PHASEN.length - 1 && <span className="w-4 h-px bg-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
}