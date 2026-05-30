/**
 * VideoAudioPreviewModal.jsx
 *
 * Schüler-Vorschau für "Video / Audio" im iPad-Frame (960×600-Slot).
 * Das Medium wird so eingepasst, dass es vollständig innerhalb des Slots sichtbar ist.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink } from 'lucide-react';
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

function MediaEmbed({ url }) {
  if (!url) return null;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-black">
        <iframe
          width="100%" height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube-Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className="w-full h-full"
        />
      </div>
    );
  }
  if (url.includes('vimeo.com')) {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-black">
        <iframe
          width="100%" height="100%"
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Vimeo-Video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen className="w-full h-full"
        />
      </div>
    );
  }
  if (url.match(/\.(m4a|mp3|wav|ogg)$/i)) {
    return (
      <audio controls className="w-full" controlsList="nodownload">
        <source src={url} /> Dein Browser unterstützt Audio nicht.
      </audio>
    );
  }
  if (url.match(/\.(mp4|webm)$/i)) {
    return (
      <video controls className="w-full h-full rounded-lg border border-slate-200 bg-black object-contain" controlsList="nodownload">
        <source src={url} /> Dein Browser unterstützt Video nicht.
      </video>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
      <ExternalLink className="w-4 h-4" /> Video / Audio öffnen
    </a>
  );
}

function StudentVideoAudioBody({ fieldValues = {} }) {
  const { url, aufgabentext, titel } = fieldValues;
  const isEmpty = !aufgabentext && !titel && !url;

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
      {url && (
        <div className="flex-1 min-h-0">
          <MediaEmbed url={url} />
        </div>
      )}
      {isEmpty && (
        <p className="text-sm text-slate-500 italic text-center py-8">Für diese Aktivität sind noch keine Inhalte hinterlegt.</p>
      )}
    </div>
  );
}

export default function VideoAudioPreviewModal({ open, onOpenChange, fieldValues, activityRecord, catalogName, phase }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'Video / Audio'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler diese Aktivität auf dem iPad (960 × 600 px Slide).
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'Video / Audio'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0">
                <StudentVideoAudioBody fieldValues={fieldValues || {}} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}