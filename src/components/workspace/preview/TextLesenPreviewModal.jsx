/**
 * TextLesenPreviewModal.jsx
 *
 * Stufe 1 der Schüler-Vorschau (Pilot, 2026-05-30):
 * Zeigt eine "Text lesen"-Aktivität so an, wie ein Schüler sie später im
 * fertigen Kurs sehen würde. Keine Editier-Logik, kein Lock, keine Sync-Badges
 * – reine Darstellung.
 *
 * Datenquelle: `fieldValues` der LernpaketPhaseAktivitaet (titel, inhalt,
 * bilder, url, dokument_url, aufgabentext, inhalt_typ). Mehr braucht "Text
 * lesen" auf der Schüler-Seite nicht.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, FileText } from 'lucide-react';
import PhaseBadge from '@/components/workspace/preview/PhaseBadge';

function StudentTextBody({ fieldValues = {} }) {
  const inhaltTyp = fieldValues.inhalt_typ;
  const isText = !inhaltTyp || inhaltTyp === 'text';
  const bilder = Array.isArray(fieldValues.bilder) ? fieldValues.bilder : [];

  return (
    <article className="space-y-5 bg-white rounded-xl border border-slate-200 px-6 py-6 sm:px-8 sm:py-7 shadow-sm">
      {/* Aufgabenstellung (Schüler-Anweisung) */}
      {fieldValues.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[15px] text-blue-900 leading-relaxed">
          {fieldValues.aufgabentext}
        </div>
      )}

      {/* Text-Variante */}
      {isText && (
        <>
          {fieldValues.titel && (
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              {fieldValues.titel}
            </h1>
          )}
          {fieldValues.inhalt && (
            <div className="prose prose-slate max-w-none">
              <p className="text-[16px] leading-relaxed whitespace-pre-wrap text-slate-800">
                {fieldValues.inhalt}
              </p>
            </div>
          )}
          {bilder.length > 0 && (
            <div className={`grid gap-4 ${bilder.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {bilder.map((bild, idx) => (
                <figure key={`${bild?.url}-${idx}`} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <img
                    src={bild?.url}
                    alt={bild?.caption || `Bild ${idx + 1}`}
                    className="w-full h-auto object-contain max-h-96"
                  />
                  {bild?.caption && (
                    <figcaption className="px-3 py-2 text-xs text-slate-600 border-t border-slate-200 bg-white">
                      {bild.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}

      {/* URL-Variante */}
      {inhaltTyp === 'url' && fieldValues.url && (
        <a
          href={fieldValues.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Text öffnen
        </a>
      )}

      {/* Datei-Variante */}
      {inhaltTyp === 'datei' && fieldValues.dokument_url && (
        <a
          href={fieldValues.dokument_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          Dokument öffnen
        </a>
      )}

      {/* Leerzustand */}
      {!fieldValues.titel && !fieldValues.inhalt && bilder.length === 0 && !fieldValues.url && !fieldValues.dokument_url && (
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">
              · {catalogName || 'Aktivität'}
            </span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sehen Schüler:innen diese Aktivität im fertigen Kurs.
          </p>
        </DialogHeader>

        <div className="pt-3 space-y-3">
          <PhaseBadge phase={phase} />
          <StudentTextBody fieldValues={fieldValues || {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}