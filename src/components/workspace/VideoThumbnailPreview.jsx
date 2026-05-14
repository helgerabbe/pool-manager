/**
 * components/workspace/VideoThumbnailPreview.jsx
 *
 * Read-Only-Vorschau für das `url`-Feld einer Video/Audio-Aktivität.
 *
 * Verhalten:
 * - Eigene Video-Uploads (mp4/webm/mov) → echtes <video>-Element mit
 *   `preload="metadata"` und `#t=0.1`-Anker. Das rendert den ersten Frame
 *   („Poster-Frame" / Thumbnail), ohne das Video automatisch abzuspielen,
 *   und ohne Steuerungselemente — die Lehrkraft sieht auf einen Blick,
 *   um welches Video es geht.
 * - Externe URLs (YouTube, Studyflix, Audio, generische Links) → schlichter
 *   Link, da Cross-Origin-Thumbnails technisch nicht zuverlässig möglich
 *   sind.
 *
 * Diese Komponente ist bewusst rein darstellend: kein State, kein Lock,
 * kein Edit-Modus.
 */

import React from 'react';
import { Film, ExternalLink } from 'lucide-react';

const VIDEO_FILE_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];

function isUploadedVideoFile(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().split('?')[0].split('#')[0];
  return VIDEO_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function VideoThumbnailPreview({ url }) {
  if (!url) {
    return <span className="italic text-muted-foreground/60">Noch nicht ausgefüllt.</span>;
  }

  if (isUploadedVideoFile(url)) {
    // `#t=0.1` ist der Media-Fragment-Trick: viele Browser springen direkt
    // zur Sekunde 0.1 und rendern dort den Frame als Poster — ohne dass die
    // Lehrkraft das Video selbst abspielt.
    const posterUrl = `${url}#t=0.1`;
    return (
      <div className="space-y-2">
        <div className="rounded-lg overflow-hidden border border-border bg-black/5 max-w-md">
          <video
            src={posterUrl}
            preload="metadata"
            muted
            playsInline
            controls={false}
            className="w-full h-auto max-h-64 object-contain bg-black"
          />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          <Film className="w-3 h-3" />
          Video in neuem Tab öffnen
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // Externe Quelle (YouTube, Studyflix, Audio, …) → schlichter Link.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline break-all inline-flex items-center gap-1"
    >
      {url}
      <ExternalLink className="w-3 h-3 shrink-0" />
    </a>
  );
}