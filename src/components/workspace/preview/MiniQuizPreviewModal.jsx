/**
 * MiniQuizPreviewModal.jsx
 *
 * Schüler-Vorschau für die masterfähige Aktivität "Mini-Quiz" im iPad-Frame.
 * Mini-Quiz nutzt dasselbe Fragenformat (fieldValues.questions mit answers
 * [{ text, isCorrect }]) wie der Test, daher wird die interaktive TestBody
 * wiederverwendet.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import TestBody from '@/components/workspace/preview/bodies/TestBody';

function PhaseSubtitleBar({ phase }) {
  return (
    <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-800 shrink-0">
      <span className="font-semibold">{phase} ·</span> Beantworte die Quiz-Fragen.
    </div>
  );
}

export default function MiniQuizPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Mini-Quiz', phase = 'Übung' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler dieses Mini-Quiz auf dem iPad.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0">
                <TestBody fieldValues={fieldValues} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}