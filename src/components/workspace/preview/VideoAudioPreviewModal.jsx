/**
 * VideoAudioPreviewModal.jsx
 *
 * Stufe 1 der Schüler-Vorschau (Pilot, 2026-05-30):
 * Zeigt eine "Video / Audio"-Aktivität so an, wie ein Schüler sie später im
 * fertigen Kurs sehen würde. Rendert das Video/Audio mit Transkript-Info.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, FileText } from 'lucide-react';
import PhaseBadge from '@/components/workspace/preview/PhaseBadge';

function StudentVideoAudioBody({ fieldValues = {}, activityRecord = {} }) {
  const url = fieldValues?.url;
  const transkript = activityRecord?.transkript || '';
  const aufgabentext = fieldValues?.aufgabentext;
  const titel = fieldValues?.titel;

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

      {/* Video/Audio-Embed oder Link */}
      {url && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Video / Audio
          </p>
          {/* Einfache Embed-Strategie: wenn YouTube oder Vimeo, <iframe>;
              sonst: <video> oder <audio> tags; sonst Link. */}
          {(() => {
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
              return videoId ? (
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube-Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : null;
            }
            if (url.includes('vimeo.com')) {
              const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
              return videoId ? (
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://player.vimeo.com/video/${videoId}`}
                    title="Vimeo-Video"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : null;
            }
            // HTML5 <video> oder <audio>
            if (url.match(/\.(mp4|webm|ogg|m4a|mp3|wav)$/i)) {
              const isAudio = url.match(/\.(m4a|mp3|wav|ogg)$/i);
              return isAudio ? (
                <audio
                  controls
                  className="w-full"
                  controlsList="nodownload"
                >
                  <source src={url} />
                  Dein Browser unterstützt Audio nicht.
                </audio>
              ) : (
                <video
                  controls
                  className="w-full rounded-lg border border-slate-200 bg-black max-h-96"
                  controlsList="nodownload"
                >
                  <source src={url} />
                  Dein Browser unterstützt Video nicht.
                </video>
              );
            }
            // Fallback: Link
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Video / Audio öffnen
              </a>
            );
          })()}
        </div>
      )}


      {/* Leerzustand */}
      {!aufgabentext && !titel && !url && !transkript && (
        <p className="text-sm text-slate-500 italic text-center py-8">
          Für diese Aktivität sind noch keine Inhalte hinterlegt.
        </p>
      )}
    </article>
  );
}

export default function VideoAudioPreviewModal({ open, onOpenChange, fieldValues, activityRecord, catalogName, phase }) {
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
          <StudentVideoAudioBody fieldValues={fieldValues || {}} activityRecord={activityRecord || {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}