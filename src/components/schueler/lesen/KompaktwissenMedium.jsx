/**
 * KompaktwissenMedium.jsx
 *
 * Zeigt das hochgeladene Kompaktwissen-Medium in der Schüleransicht — je nach
 * Datei entweder als Bild oder als PDF im eingebetteten Viewer (2026-08-22).
 * Für die PDF gibt es zusätzlich einen Button zum Öffnen in einem neuen Tab,
 * damit Schüler auf kleinen Geräten bequem zoomen und blättern können.
 */
import { Image as ImageIcon, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { istPdfUrl } from '@/lib/dateiTyp';

export default function KompaktwissenMedium({ url }) {
  if (!url) return null;

  if (istPdfUrl(url)) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <iframe
          src={url}
          title="Kompaktwissen – Übersicht (PDF)"
          className="w-full border-0 bg-muted/20"
          style={{ height: '60vh', minHeight: '340px' }}
        />
        <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            Übersicht als PDF – verschaffe dir einen Überblick über die wichtigsten Inhalte.
          </p>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-7">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Größer anzeigen
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <img
        src={url}
        alt="Kompaktwissen – Übersichtsgrafik"
        className="w-full h-auto object-contain max-h-[60vh]"
      />
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="w-3.5 h-3.5" />
          Übersichtsgrafik – verschaffe dir einen Überblick über die wichtigsten Inhalte.
        </p>
      </div>
    </div>
  );
}