import React from 'react';
import { Image, Play, Music, Link } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { videoEinbettung } from '@/lib/videoEinbettung';

const platz = 'flex h-full w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-sm text-primary';

/** Darstellung von Bild, Video, Audio und Link. */
export default function MedienInhalt({ el }) {
  const { url } = useSignedUrl(el.typ === 'bild' || el.typ === 'audio' ? el.quelle : null);
  if (el.typ === 'bild') return url ? <figure className="h-full w-full"><img src={url} alt="" className="h-full w-full object-contain" />{el.nachweis && <figcaption className="text-[10px] text-muted-foreground">{el.nachweis}</figcaption>}</figure> : <div className={platz}><Image className="h-6 w-6" />Bild</div>;
  if (el.typ === 'video') {
    const v = videoEinbettung(el.quelle);
    if (v && el.darstellung === 'einbetten' && v.art === 'iframe') return <iframe src={v.src} title="Video" className="h-full w-full rounded-lg" allowFullScreen />;
    if (v && el.darstellung === 'einbetten' && v.art === 'datei') return <video src={v.src} controls className="h-full w-full rounded-lg" />;
    return <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg bg-foreground/90 text-background"><Play className="h-10 w-10" />{v && <span className="text-xs underline">Video öffnen{v.anbieter ? ` (${v.anbieter})` : ''}</span>}</div>;
  }
  if (el.typ === 'audio') return url ? <audio src={url} controls className="w-full" /> : <div className="flex h-full w-full items-center gap-2 rounded-full bg-muted px-3"><Music className="h-4 w-4 text-primary" /><div className="h-1.5 flex-1 rounded-full bg-primary/30" /></div>;
  return <span className="flex items-center gap-1 text-primary underline"><Link className="h-4 w-4" />{el.anzeige === 'adresse' ? (el.quelle || 'https://…') : (el.inhalt || 'Zur Webseite')}</span>;
}