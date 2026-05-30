/**
 * VideoAudioPreviewModal.jsx
 *
 * Schüler-Vorschau für "Video / Audio" im iPad-Frame (960×600-Slot).
 * Das Video wird so eingepasst, dass es zusammen mit Aufgabenstellung
 * und Titel ohne Scrollen in den Slot passt.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import PhaseSubtitleBar from '@/components/workspace/preview/PhaseSubtitleBar';

function MediaEmbed({ url }) {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const id = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    if (!id) return null;
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-black">
        <iframe src={`https://www.youtube.com/embed/${id}`} title="YouTube" frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen className="w-full h-full" />
      </div>
    );
  }
  if (url.includes('vimeo.com')) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!id) return null;
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-black">
        <iframe src={`https://player.vimeo.com/video/${id}`} title="Vimeo" frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="w-full h-full" />
      </div>
    );
  }
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return (
      <video controls controlsList="nodownload" className="w-full h-full rounded-lg border border-slate-200 bg-black object-contain">
        <source src={url} />
      </video>
    );
  }
  if (url.match(/\.(m4a|mp3|wav)$/i)) {
    return (
      <div className="w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 p-6">
        <audio controls controlsList="nodownload" className="w-full max-w-md">
          <source src={url} />
        </audio>
      </div>
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
  const url = fieldValues?.url;
  const aufgabentext = fieldValues?.aufgabentext;
  const titel = fieldValues?.titel;
  const empty = !aufgabentext && !titel && !url;

  return (
    <div className="h-full flex flex-col px-5 py-4 gap-3">
      {aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[13px] text-blue-900 leading-relaxed shrink-0">
          {aufgabentext}
        </div>
      )}
      {titel && (
        <h1 className="text-lg font-bold text-slate-900 leading-tight shrink-0">{titel}</h1>
      )}
      {url && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full" style={{ maxWidth: '720px', aspectRatio: '16/9', maxHeight: '100%' }}>
            <MediaEmbed url={url} />
          </div>
        </div>
      )}
      {empty && (
        <p className="text-sm text-slate-500 italic text-center py-8">
          Für diese Aktivität sind noch keine Inhalte hinterlegt.
        </p>
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
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'Aktivität'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sehen Schüler:innen die Aktivität auf dem iPad (960 × 600 px Slide).
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'Aktivität'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0">
                <StudentVideoAudioBody fieldValues={fieldValues || {}} activityRecord={activityRecord || {}} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}