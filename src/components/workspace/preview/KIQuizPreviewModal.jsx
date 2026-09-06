/**
 * KIQuizPreviewModal.jsx
 *
 * Schüler-Vorschau für „KI-Quiz" – rendert die echte Schülerseite im
 * iPad-Rahmen; die KI-Auswertung lässt sich durchspielen.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import KIQuizSeite from '@/components/schueler/lesen/KIQuizSeite';

export default function KIQuizPreviewModal({ open, onOpenChange, fieldValues, catalogName, phase }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[820px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'KI-Quiz'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Du kannst die Fragen wie ein:e Schüler:in beantworten und von der KI prüfen lassen. „Zurück" und „Erledigt" sind ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'KI-Quiz'} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <KIQuizSeite
                aktivitaet={{ field_values: fieldValues || {} }}
                busy={false}
                onErledigt={() => {}}
                onBack={() => {}}
              />
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}