/**
 * TestPreviewModal.jsx
 *
 * Schüler-Vorschau für die Abschluss-Aktivität "Test" im iPad-Frame (960×600-Slot).
 * Tests dürfen scrollen — Schüler:innen sollen alle Fragen beantworten können.
 * Unterstützt Fragetypen: single-/multiple-choice, true_false, solution_word/text.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import TestBody from '@/components/workspace/preview/bodies/TestBody';

function PhaseSubtitleBar() {
  return (
    <div className="px-4 py-1.5 bg-emerald-50 border-b border-emerald-100 text-[12px] text-emerald-800 shrink-0">
      <span className="font-semibold">Abschluss ·</span> Hier zeigst du, was du kannst.
    </div>
  );
}

export default function TestPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Test', phase = 'Abschluss' }) {
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
            So sieht der Schüler diesen Test auf dem iPad. Tests dürfen scrollen — alle Fragen müssen beantwortet werden.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar />
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