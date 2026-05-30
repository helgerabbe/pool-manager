/**
 * LinkUrlPreviewModal.jsx
 *
 * Schüler-Vorschau für "Link / URL" im iPad-Frame (960×600-Slot).
 * Webressourcen werden als Screenshot-Karten gezeigt; alles passt in die Slide.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, ImageOff } from 'lucide-react';
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

function LinkPreviewCard({ url, label, compact = false }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const screenshotSrc = `https://image.thum.io/get/width/1200/${url}`;
  let hostname = url;
  try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="block group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
      <div className={`relative ${compact ? 'aspect-[16/8]' : 'aspect-[16/9]'} bg-slate-100 overflow-hidden`}>
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-2 flex items-center justify-between">
          <span className="text-white text-xs font-medium truncate">{label || hostname}</span>
          <ExternalLink className="w-4 h-4 text-white drop-shadow shrink-0 ml-2" />
        </div>
      </div>
    </a>
  );
}

function StudentLinkUrlBody({ fieldValues = {} }) {
  const aufgabentext = fieldValues?.aufgabentext;
  const titel = fieldValues?.titel;
  const rawList = Array.isArray(fieldValues?.webadressen) ? fieldValues.webadressen : [];
  const webadressen = rawList.length > 0
    ? rawList
    : (fieldValues?.url ? [{ url: fieldValues.url, label: fieldValues?.titel || null }] : []);
  const compact = webadressen.length > 1;
  const isEmpty = !aufgabentext && !titel && webadressen.length === 0;

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-3">
      {aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900 leading-relaxed shrink-0">
          {aufgabentext}
        </div>
      )}
      {titel && (
        <h1 className="text-lg font-bold text-slate-900 leading-tight shrink-0">{titel}</h1>
      )}
      {webadressen.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {webadressen.map((link, idx) => {
              const url = typeof link === 'string' ? link : link?.url;
              const label = typeof link === 'string' ? null : link?.label;
              if (!url) return null;
              return <LinkPreviewCard key={`${url}-${idx}`} url={url} label={label} compact={compact} />;
            })}
          </div>
        </div>
      )}
      {isEmpty && (
        <p className="text-sm text-slate-500 italic text-center py-8">Für diese Aktivität sind noch keine Links hinterlegt.</p>
      )}
    </div>
  );
}

export default function LinkUrlPreviewModal({ open, onOpenChange, fieldValues, catalogName, phase }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'Link / URL'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler diese Aktivität auf dem iPad (960 × 600 px Slide).
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'Link / URL'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0">
                <StudentLinkUrlBody fieldValues={fieldValues || {}} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}