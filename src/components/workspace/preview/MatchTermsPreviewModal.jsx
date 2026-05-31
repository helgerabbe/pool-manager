/**
 * MatchTermsPreviewModal.jsx
 *
 * Schüler-Vorschau für "Begriffe zuordnen" im iPad-Frame (960×600-Slot).
 * Masterfähig: zeigt EINE Master-Variante; das Umschalten zwischen mehreren
 * Mastern wird vom Lernpaket-Modal übernommen.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import MatchTermsBody from '@/components/workspace/preview/bodies/MatchTermsBody';

export default function MatchTermsPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Begriffe zuordnen', phase = 'Übung' }) {
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
            So bearbeitet der Schüler diese Aufgabe auf dem iPad (960 × 600 px Slide).
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[12px] text-amber-800 shrink-0">
                <span className="font-semibold">Übung ·</span> Hier übst du, was du gelernt hast.
              </div>
              <div className="flex-1 min-h-0">
                <MatchTermsBody fieldValues={fieldValues} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}