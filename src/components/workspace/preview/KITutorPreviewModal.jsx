/**
 * KITutorPreviewModal.jsx
 *
 * Schüler-Vorschau für "KI-Tutor Aufgabe" – rendert seit dem "Deckungsgleiche
 * Vorschau"-Umbau (2026-06-12) die ECHTE Schüler-Komponente
 * (components/schueler/lesen/KITutorSeite) im iPad-Rahmen.
 *
 * Masterfähig: Es werden die field_values der gewählten Master-Variante
 * bevorzugt; fehlt eine, fällt die Vorschau auf die Aktivitäts-field_values
 * zurück. Der Erwartungshorizont bleibt für Schüler:innen unsichtbar.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import KITutorSeite from '@/components/schueler/lesen/KITutorSeite';

export default function KITutorPreviewModal({ open, onOpenChange, activityRecord, master, catalogName, phase }) {
  const fieldValues = master?.field_values || activityRecord?.field_values || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[820px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'KI-Tutor Aufgabe'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Diese Vorschau zeigt exakt die Schüleransicht – der Erwartungshorizont bleibt für Schüler:innen unsichtbar. Die Buttons „Zurück" und „Erledigt" sind in der Vorschau ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'KI-Tutor Aufgabe'} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <KITutorSeite
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