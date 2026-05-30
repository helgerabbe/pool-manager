/**
 * TextLesenPreviewModal.jsx
 *
 * Schüler-Vorschau für "Text lesen" im iPad-Frame (960×600-Slot).
 * Texte dürfen scrollen — das ist die einzige Aktivität, bei der Scrolling
 * im Schüler-Erlebnis akzeptiert ist.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, FileText } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import PhaseSubtitleBar from '@/components/workspace/preview/PhaseSubtitleBar';

function StudentTextBody({ fieldValues = {} }) {
  const inhaltTyp = fieldValues.inhalt_typ;
  const isText = !inhaltTyp || inhaltTyp === 'text';
  const bilder = Array.isArray(fieldValues.bilder) ? fieldValues.bilder : [];
  const empty = !fieldValues.titel && !fieldValues.inhalt && bilder.length === 0
                && !fieldValues.url && !fieldValues.dokument_url && !fieldValues.aufgabentext;

  return (
    <article className="space-y-4 px-5 py-4">
      {fieldValues.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[13px] text-blue-900 leading-relaxed">
          {fieldValues.aufgabentext}
        </div>
      )}

      {isText && (
        <>
          {fieldValues.titel && (
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {fieldValues.titel}
            </h1>
          )}
          {fieldValues.inhalt && (
            <p className="text-[14px] leading-[1.7] whitespace-pre-wrap text-slate-800">
              {fieldValues.inhalt}
            </p>
          )}
          {bilder.length > 0 && (
            <div className={`grid gap-3 ${bilder.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {bilder.map((bild, idx) => (
                <figure key={`${bild?.url}-${idx}`} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={bild?.url} alt={bild?.caption || `Bild ${idx + 1}`} className="w-full h-auto object-contain max-h-72" />
                  {bild?.caption && (
                    <figcaption className="px-3 py-1.5 text-[11px] text-slate-600 border-t border-slate-200 bg-white">
                      {bild.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}

      {inhaltTyp === 'url' && fieldValues.url && (
        <a href={fieldValues.url} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <ExternalLink className="w-4 h-4" /> Text öffnen
        </a>
      )}

      {inhaltTyp === 'datei' && fieldValues.dokument_url && (
        <a href={fieldValues.dokument_url} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <FileText className="w-4 h-4" /> Dokument öffnen
        </a>
      )}

      {empty && (
        <p className="text-sm text-slate-500 italic text-center py-8">
          Für diese Aktivität sind noch keine Inhalte hinterlegt.
        </p>
      )}
    </article>
  );
}

export default function TextLesenPreviewModal({ open, onOpenChange, fieldValues, catalogName, phase }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'Aktivität'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sehen Schüler:innen die Aufgabe auf dem iPad (960 × 600 px Slide). Bei „Text lesen" darf gescrollt werden.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'Aktivität'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0 overflow-auto">
                <StudentTextBody fieldValues={fieldValues || {}} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}