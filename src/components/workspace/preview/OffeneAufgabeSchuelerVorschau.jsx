/**
 * OffeneAufgabeSchuelerVorschau.jsx
 *
 * Reine Schüleransicht einer offenen Aufgabe: zeigt genau den übernommenen
 * Stand (Vorschau-Vorlage) im iPad-Rahmen — ohne Werkstatt, ohne Bau- oder
 * Änderungsfunktionen. Gebaut und geändert wird ausschließlich in der
 * Aufgabenwerkstatt („Inhalt bearbeiten").
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Sparkles } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';

export default function OffeneAufgabeSchuelerVorschau({
  open,
  onOpenChange,
  snapshotHtml = '',
  catalogName = 'Offene Aufgabe',
  phase = 'Übung',
}) {
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
            So sehen die Schüler diese Aufgabe. Ändern kannst du sie über „Inhalt bearbeiten".
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[12px] text-amber-800 shrink-0">
                <span className="font-semibold">{phase} ·</span> Hier übst du, was du gelernt hast.
              </div>
              <div className="flex-1 min-h-0">
                {snapshotHtml ? (
                  <iframe
                    title="Schüleransicht der offenen Aufgabe"
                    srcDoc={snapshotHtml}
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      Noch keine Aufgabe gebaut. Klicke auf „Inhalt bearbeiten", um sie in der Aufgabenwerkstatt zu erstellen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}