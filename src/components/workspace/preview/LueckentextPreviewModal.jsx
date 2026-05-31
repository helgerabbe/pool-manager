/**
 * LueckentextPreviewModal.jsx
 *
 * Voll interaktive Schüler-Vorschau für Lückentext-Masteraufgaben.
 * Lehrkräfte können die Aufgabe so erleben, wie Schüler:innen sie später
 * bearbeiten: Wörter aus der Wortbank werden per Drag & Drop oder Klick
 * in die Lücken gezogen, beim Überprüfen gibt es bei vollständig richtiger
 * Lösung eine Konfetti-Belohnung.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import LueckentextBody from '@/components/workspace/preview/bodies/LueckentextBody';

export default function LueckentextPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Lückentext', phase = 'Übung' }) {
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
            So sehen Schüler:innen die Aufgabe auf dem iPad (960 × 600 px Slide). Erscheint hier ein Scrollbalken, passt der Inhalt nicht auf eine Seite.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[12px] text-amber-800 shrink-0">
                <span className="font-semibold">Übung ·</span> Hier übst du, was du gelernt hast.
              </div>
              <div className="flex-1 min-h-0">
                <LueckentextBody fieldValues={fieldValues} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}