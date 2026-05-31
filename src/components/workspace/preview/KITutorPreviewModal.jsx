/**
 * KITutorPreviewModal.jsx
 *
 * Schüler-Vorschau für "KI-Tutor Aufgabe" im iPad-Frame (960×600-Slot).
 *
 * Schüler sehen NUR:
 *  - die Aufgabenstellung der Lehrkraft
 *  - einen klar markierten CTA-Button "Zum KI-Tutor (brian.study)"
 *
 * Der Erwartungshorizont der Lehrkraft fließt später als Kontext an Brian,
 * wird dem Schüler aber NIE angezeigt.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import KITutorBody from '@/components/workspace/preview/bodies/KITutorBody';

// Inline Phasen-Kopfleiste (schlanker Ersatz für PhaseBadge im 960×600-Slot).
const PHASE_BAR = {
  'Input':     { label: 'Input',     subtitle: 'Hier erklären wir dir, was du wissen und können sollst.', bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-900' },
  'Übung':     { label: 'Übung',     subtitle: 'Hier übst du, was du gelernt hast.',                       bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-800' },
  'Abschluss': { label: 'Abschluss', subtitle: 'Hier zeigst du, was du kannst.',                           bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' },
};
function PhaseSubtitleBar({ phase }) {
  const c = PHASE_BAR[phase];
  if (!c) return null;
  return (
    <div className={`px-4 py-1.5 ${c.bg} border-b ${c.border} text-[12px] ${c.text} shrink-0`}>
      <span className="font-semibold">{c.label} ·</span> {c.subtitle}
    </div>
  );
}

export default function KITutorPreviewModal({ open, onOpenChange, activityRecord, master, catalogName, phase }) {
  // Body-Komponente übernimmt das robuste Auslesen der Aufgabe.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'KI-Tutor Aufgabe'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler die Aufgabe auf dem iPad (960 × 600 px Slide). Der Erwartungshorizont bleibt für den Schüler unsichtbar.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'KI-Tutor Aufgabe'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0">
                <KITutorBody masterFieldValues={master?.field_values} activityFieldValues={activityRecord?.field_values} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}