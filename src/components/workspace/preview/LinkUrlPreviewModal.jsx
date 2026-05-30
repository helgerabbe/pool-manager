/**
 * LinkUrlPreviewModal.jsx
 *
 * Stufe 1 der Schüler-Vorschau (Pilot, 2026-05-30):
 * Zeigt eine "Link / URL"-Aktivität so an, wie ein Schüler sie später im
 * fertigen Kurs sehen würde. Rendert Aufgabenstellung und Links.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink } from 'lucide-react';

function StudentLinkUrlBody({ fieldValues = {} }) {
  const aufgabentext = fieldValues?.aufgabentext;
  const titel = fieldValues?.titel;
  const webadressen = Array.isArray(fieldValues?.webadressen) ? fieldValues.webadressen : [];

  return (
    <article className="space-y-5 bg-white rounded-xl border border-slate-200 px-6 py-6 sm:px-8 sm:py-7 shadow-sm">
      {/* Aufgabenstellung (Schüler-Anweisung) */}
      {aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[15px] text-blue-900 leading-relaxed">
          {aufgabentext}
        </div>
      )}

      {/* Titel (optional) */}
      {titel && (
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">
          {titel}
        </h1>
      )}

      {/* Links / Webadressen */}
      {webadressen.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Webressourcen
          </p>
          <div className="space-y-2">
            {webadressen.map((link, idx) => {
              const url = typeof link === 'string' ? link : link?.url;
              const label = typeof link === 'string' ? null : link?.label;
              
              if (!url) return null;
              
              return (
                <a
                  key={`${url}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors break-all"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  {label || url}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Leerzustand */}
      {!aufgabentext && !titel && webadressen.length === 0 && (
        <p className="text-sm text-slate-500 italic text-center py-8">
          Für diese Aktivität sind noch keine Links hinterlegt.
        </p>
      )}
    </article>
  );
}

export default function LinkUrlPreviewModal({ open, onOpenChange, fieldValues, catalogName }) {
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

        <div className="pt-3">
          <StudentLinkUrlBody fieldValues={fieldValues || {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}