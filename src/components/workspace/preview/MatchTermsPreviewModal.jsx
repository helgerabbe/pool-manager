/**
 * MatchTermsPreviewModal.jsx
 *
 * Schüler-Vorschau für "Begriffe zuordnen" – rendert seit dem "Deckungsgleiche
 * Vorschau"-Umbau (2026-06-12) die ECHTE Schüler-Komponente
 * (components/schueler/lesen/BegriffeZuordnenSeite) im iPad-Rahmen.
 *
 * Masterfähig: zeigt EINE Master-Variante (fieldValues der gewählten
 * MasterAufgabe); das Umschalten zwischen mehreren Mastern übernimmt der
 * Aufrufer. Optional kann `masterHinweis` ({ aktuell, gesamt }) durchgereicht
 * werden, um den "Aufgabe x von y"-Badge wie in der Schüleransicht zu zeigen.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import BegriffeZuordnenSeite from '@/components/schueler/lesen/BegriffeZuordnenSeite';

export default function MatchTermsPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Begriffe zuordnen', phase = 'Übung', masterHinweis }) {
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
            Diese Vorschau zeigt exakt die Schüleransicht (eine Master-Variante) – du kannst die Aufgabe wie ein:e Schüler:in durchspielen. Die Buttons „Zurück" und „Erledigt" sind in der Vorschau ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <BegriffeZuordnenSeite
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