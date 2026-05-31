/**
 * ConfirmationPreviewModal.jsx
 *
 * Schüler-Vorschau für die Abschluss-Aktivität „Bearbeitung bestätigen" im iPad-Frame.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import ConfirmationBody from '@/components/workspace/preview/bodies/ConfirmationBody';

export default function ConfirmationPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Bearbeitung bestätigen', phase = 'Abschluss' }) {
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
            So bestätigt der Schüler den Abschluss auf dem iPad (960 × 600 px Slide).
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <div className="px-4 py-1.5 bg-emerald-50 border-b border-emerald-100 text-[12px] text-emerald-800 shrink-0">
                <span className="font-semibold">Abschluss ·</span> Bestätige, dass du das Lernpaket bearbeitet hast.
              </div>
              <div className="flex-1 min-h-0">
                <ConfirmationBody fieldValues={fieldValues} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}