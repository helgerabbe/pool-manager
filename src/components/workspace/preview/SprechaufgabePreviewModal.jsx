/**
 * SprechaufgabePreviewModal.jsx
 *
 * Schüler-Vorschau für „Sprechaufgabe" – die echte Schülerseite im iPad-Rahmen.
 * Die Lehrkraft kann selbst eine Aufnahme machen und die KI-Rückmeldung testen.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import SprechaufgabeSeite from '@/components/schueler/lesen/SprechaufgabeSeite';

export default function SprechaufgabePreviewModal({ open, onOpenChange, fieldValues, catalogName, phase }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[820px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'Sprechaufgabe'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Du kannst hier selbst eine Aufnahme machen und die Rückmeldung prüfen. „Zurück" und „Erledigt" sind ohne Funktion.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'Sprechaufgabe'} phaseLabel={phase}>
            <div className="bg-background h-full overflow-hidden">
              <SprechaufgabeSeite
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