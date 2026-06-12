/**
 * MiniQuizPreviewModal.jsx
 *
 * Schüler-Vorschau für "Mini-Quiz" – rendert seit dem "Deckungsgleiche
 * Vorschau"-Umbau (2026-06-12) die ECHTE Schüler-Komponente
 * (components/schueler/lesen/MiniquizSeite) im iPad-Rahmen.
 *
 * Masterfähig: zeigt EINE Master-Variante; das Umschalten zwischen mehreren
 * Mastern übernimmt der Aufrufer. Optional `masterHinweis` ({ aktuell, gesamt }).
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import MiniquizSeite from '@/components/schueler/lesen/MiniquizSeite';

export default function MiniQuizPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Mini-Quiz', phase = 'Übung', masterHinweis }) {
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
            Diese Vorschau zeigt exakt die Schüleransicht (eine Master-Variante) – du kannst das Quiz wie ein:e Schüler:in durchspielen. Die Buttons „Zurück" und „Erledigt" sind in der Vorschau ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <MiniquizSeite
                aktivitaet={{ field_values: fieldValues }}
                busy={false}
                onErledigt={() => {}}
                onBack={() => {}}
                masterHinweis={masterHinweis}
              />
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}