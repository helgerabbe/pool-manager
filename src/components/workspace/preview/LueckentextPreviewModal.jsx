/**
 * LueckentextPreviewModal.jsx
 *
 * Schüler-Vorschau für Lückentext-Aufgaben.
 *
 * Seit dem "Deckungsgleiche Vorschau"-Pilot (2026-06-11) rendert dieses Modal
 * die ECHTE Schüler-Komponente (components/schueler/lesen/LueckentextSeite)
 * statt eines nachgebauten Preview-Bodys. Damit ist die Lehrer-Vorschau
 * garantiert 1:1 identisch mit dem, was Schüler:innen in der Schüleransicht
 * sehen – jede Änderung an der Schüleransicht wirkt automatisch auch hier.
 * Die Aktions-Callbacks (onErledigt/onBack) sind in der Vorschau Leerlauf.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import LueckentextSeite from '@/components/schueler/lesen/LueckentextSeite';

export default function LueckentextPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Lückentext', phase = 'Übung' }) {
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
            Diese Vorschau zeigt exakt die Schüleransicht – du kannst die Aufgabe wie ein:e Schüler:in durchspielen. Die Buttons „Zurück" und „Erledigt" sind in der Vorschau ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <LueckentextSeite
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