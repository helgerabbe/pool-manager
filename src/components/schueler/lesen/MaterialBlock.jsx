import { FileText, Film, Music, Image, ExternalLink } from 'lucide-react';

/** Erkennt YouTube-Video-IDs. */
function youtubeEmbed(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** Erkennt Vimeo-IDs. */
function vimeoEmbed(url = '') {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export function MaterialIcon({ typ, className = 'w-5 h-5' }) {
  switch (typ) {
    case 'video': return <Film className={className} />;
    case 'audio': return <Music className={className} />;
    case 'bild': return <Image className={className} />;
    case 'link': return <ExternalLink className={className} />;
    default: return <FileText className={className} />;
  }
}

/**
 * Darstellung EINES Materials (Text, Bild, Audio, Video, PDF, Link) in der
 * Schüleransicht. Wird von der Aktivität „Materialaufgabe" verwendet.
 */
export default function MaterialBlock({ material = {} }) {
  const mt = material.material_typ || 'text';
  const medienUrl = material.url || material.datei_url || '';
  const yt = mt === 'video' ? youtubeEmbed(material.url || '') : null;
  const vm = mt === 'video' ? vimeoEmbed(material.url || '') : null;

  return (
    <div className="space-y-3">
      {material.beschreibung && (
        <p className="text-sm text-muted-foreground">{material.beschreibung}</p>
      )}

      {mt === 'text' && material.inhalt && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {material.inhalt}
        </div>
      )}

      {mt === 'bild' && material.datei_url && (
        <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
          <img src={material.datei_url} alt={material.beschreibung || 'Material'} className="w-full h-auto object-contain max-h-72" />
        </div>
      )}

      {mt === 'video' && (yt || vm) && (
        <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
          <iframe
            src={yt || vm}
            title="Video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {mt === 'video' && !yt && !vm && medienUrl && (
        <div className="rounded-xl overflow-hidden border border-border bg-black">
          {material.datei_url && !material.url ? (
            <video src={material.datei_url} controls className="w-full h-auto max-h-72" />
          ) : (
            <div className="bg-card p-4 text-center">
              <a href={medienUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm break-all">
                Video öffnen
              </a>
            </div>
          )}
        </div>
      )}

      {mt === 'audio' && medienUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-2">Hör dir die Aufnahme an</p>
          <audio src={medienUrl} controls className="w-full" />
        </div>
      )}

      {mt === 'text' && material.datei_url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <a href={material.datei_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
            Dokument öffnen
          </a>
        </div>
      )}

      {mt === 'pdf' && material.datei_url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-sm mb-2">PDF-Dokument</p>
          <a href={material.datei_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
            PDF öffnen
          </a>
        </div>
      )}

      {mt === 'link' && material.url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm break-all">
            {material.url}
          </a>
        </div>
      )}

      {!material.inhalt && !material.url && !material.datei_url && (
        <p className="text-sm text-muted-foreground italic">Kein Material hinterlegt.</p>
      )}
    </div>
  );
}