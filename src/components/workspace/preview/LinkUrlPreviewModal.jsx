/**
 * LinkUrlPreviewModal.jsx
 *
 * Stufe 1 der Schüler-Vorschau (Pilot, 2026-05-30):
 * Zeigt eine "Link / URL"-Aktivität so an, wie ein Schüler sie später im
 * fertigen Kurs sehen würde. Rendert Aufgabenstellung und Links.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, Globe, ImageOff } from 'lucide-react';
import PhaseBadge from '@/components/workspace/preview/PhaseBadge';

function StudentLinkUrlBody({ fieldValues = {} }) {
  const aufgabentext = fieldValues?.aufgabentext;
  const titel = fieldValues?.titel;
  // Normalisierung: 'Link / URL'-Aktivitäten speichern den Link oft als einzelnes
  // 'url'-Feld; ältere/neue Varianten ggf. als 'webadressen'-Array. Wir akzeptieren beides.
  const rawList = Array.isArray(fieldValues?.webadressen) ? fieldValues.webadressen : [];
  const webadressen = rawList.length > 0
    ? rawList
    : (fieldValues?.url ? [{ url: fieldValues.url, label: fieldValues?.titel || null }] : []);

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

      {/* Links / Webadressen mit Screenshot-Preview-Karten */}
      {webadressen.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Webressourcen
          </p>
          <div className="space-y-3">
            {webadressen.map((link, idx) => {
              const url = typeof link === 'string' ? link : link?.url;
              const label = typeof link === 'string' ? null : link?.label;
              if (!url) return null;
              return <LinkPreviewCard key={`${url}-${idx}`} url={url} label={label} />;
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

function LinkPreviewCard({ url, label }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // thum.io liefert kostenlos einen Screenshot direkt als Bild. Wichtig: Ziel-URL
  // MUSS unenkodiert am Ende stehen, sonst wird sie als Optionspfad fehlinterpretiert.
  const screenshotSrc = `https://image.thum.io/get/width/1200/${url}`;

  let hostname = url;
  try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch (_) { /* keep raw */ }
  const faviconSrc = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
    >
      {/* Screenshot-Bereich */}
      <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={screenshotSrc}
              alt={`Vorschau von ${hostname}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover object-top transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.02] transition-transform duration-300`}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <ImageOff className="w-10 h-10" />
            <span className="text-xs">Vorschau nicht verfügbar</span>
          </div>
        )}
        {/* Klick-Hinweis-Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-3 flex items-center justify-between">
          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Klicken, um die Seite zu öffnen
          </span>
          <ExternalLink className="w-5 h-5 text-white drop-shadow" />
        </div>
      </div>
    </a>
  );
}

export default function LinkUrlPreviewModal({ open, onOpenChange, fieldValues, catalogName, phase }) {
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
          <StudentLinkUrlBody fieldValues={fieldValues || {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}