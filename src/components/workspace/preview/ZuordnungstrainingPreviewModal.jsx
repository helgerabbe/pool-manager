/**
 * ZuordnungstrainingPreviewModal.jsx
 *
 * Schüler-Vorschau für das „Zuordnungstraining" — rendert die ECHTE
 * Schüler-Komponente im iPad-Rahmen, sodass die Lehrkraft das
 * Rotationsüben 1:1 durchspielen kann.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import ZuordnungstrainingSeite from '@/components/schueler/lesen/ZuordnungstrainingSeite';

export default function ZuordnungstrainingPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Zuordnungstraining', phase = 'Übung' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[820px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Du kannst das Training wie ein:e Schüler:in durchspielen — Runden, Rotation und Meister-Fortschritt
            verhalten sich exakt wie in der Schüleransicht. „Zurück" und „Erledigt" sind hier ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <ZuordnungstrainingSeite
                aktivitaet={{ field_values: fieldValues }}
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