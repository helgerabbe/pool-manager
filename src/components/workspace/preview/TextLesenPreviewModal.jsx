/**
 * TextLesenPreviewModal.jsx
 *
 * Schüler-Vorschau für "Text lesen" im iPad-Frame (960×600-Slot).
 * Bei "Text lesen" ist Scrollen erlaubt – lange Lesetexte sollen vollständig
 * sichtbar bleiben (vom Nutzer ausdrücklich freigegebene Ausnahme).
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, FileText } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';

const PHASE_BAR = {
  'Input':     { label: 'Input',     subtitle: 'Hier erklären wir dir, was du wissen und können sollst.', bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-900' },
  'Übung':     { label: 'Übung',     subtitle: 'Hier übst du, was du gelernt hast.',                       bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-800' },
  'Abschluss': { label: 'Abschluss', subtitle: 'Hier zeigst du, was du kannst.',                           bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' },
};
function PhaseSubtitleBar({ phase }) {
  const c = PHASE_BAR[phase];
  if (!c) return null;
  return (
    <div className={`px-4 py-1.5 ${c.bg} border-b ${c.border} text-[12px] ${c.text} shrink-0`}>
      <span className="font-semibold">{c.label} ·</span> {c.subtitle}
    </div>
  );
}

function StudentTextBody({ fieldValues = {} }) {
  const inhaltTyp = fieldValues.inhalt_typ;
  const isText = !inhaltTyp || inhaltTyp === 'text';
  const bilder = Array.isArray(fieldValues.bilder) ? fieldValues.bilder : [];
  const isEmpty = !fieldValues.titel && !fieldValues.inhalt && bilder.length === 0 && !fieldValues.url && !fieldValues.dokument_url && !fieldValues.aufgabentext;

  return (
    <div className="px-6 py-5 space-y-4">
      {fieldValues.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[14px] text-blue-900 leading-relaxed">
          {fieldValues.aufgabentext}
        </div>
      )}

      {isText && (
        <>
          {fieldValues.titel && (
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{fieldValues.titel}</h1>
          )}
          {fieldValues.inhalt && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800">
              {fieldValues.inhalt}
            </p>
          )}
          {bilder.length > 0 && (
            <div className={`grid gap-3 ${bilder.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {bilder.map((bild, idx) => (
                <figure key={`${bild?.url}-${idx}`} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={bild?.url} alt={bild?.caption || `Bild ${idx + 1}`} className="w-full h-auto object-contain max-h-72" />
                  {bild?.caption && (
                    <figcaption className="px-3 py-2 text-xs text-slate-600 border-t border-slate-200 bg-white">{bild.caption}</figcaption>
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

      {isEmpty && (
        <p className="text-sm text-slate-500 italic text-center py-8">Für diese Aktivität sind noch keine Inhalte hinterlegt.</p>
      )}
    </div>
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
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'Text lesen'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler diese Aktivität auf dem iPad (960 × 600 px Slide). Bei längeren Texten darf gescrollt werden.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'Text lesen'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0 overflow-y-auto">
                <StudentTextBody fieldValues={fieldValues || {}} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}