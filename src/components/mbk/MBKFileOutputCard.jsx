/**
 * MBKFileOutputCard.jsx
 *
 * Eine einzelne Output-Karte in der MBK-Konsole. Zeigt den Quelltext
 * einer generierten Datei in einem Read-Only-Textfeld + Copy-Button.
 *
 * Wird von ArchitektTab und später von den anderen Generator-Tabs
 * gemeinsam genutzt — bewusst klein und ohne eigene Datenlogik.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, FileText, Hash, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MBKFileOutputCard({
  filename,
  content,
  kind = null,
  isEmpty = false,
  onGenerate = null,
  isGenerating = false,
  canGenerate = true,
  // Optionaler menschen-lesbarer Titel ("Themenfeld X · Lernpaket Y"). Wenn
  // gesetzt, wird er prominent angezeigt; der technische Dateiname rutscht
  // als kleine Mono-Zeile darunter. Ohne displayTitle bleibt das alte
  // Layout (nur Dateiname) erhalten — wichtig für ArchitektTab.
  displayTitle = null,
  subtitle = null,
}) {
  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${filename} in Zwischenablage kopiert.`);
    } catch (e) {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30">
        <div className="flex items-start gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {displayTitle ? (
                <span className="text-sm font-semibold truncate">{displayTitle}</span>
              ) : (
                <code className="text-xs font-mono font-semibold truncate">{filename}</code>
              )}
              {kind && (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                  {kind}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
            {displayTitle && (
              <code className="text-[10px] font-mono text-muted-foreground/70 truncate block mt-0.5">
                {filename}
              </code>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onGenerate && (
            <Button
              size="sm"
              variant={isEmpty ? 'default' : 'outline'}
              onClick={onGenerate}
              disabled={!canGenerate || isGenerating}
              className="gap-1.5 h-7"
              title={isEmpty ? 'Diese Datei generieren' : 'Diese Datei neu generieren'}
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isEmpty ? 'Generieren' : 'Neu'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={isEmpty || !content}
            className="gap-1.5 h-7"
          >
            <Copy className="w-3.5 h-3.5" />
            Kopieren
          </Button>
        </div>
      </div>
      {isEmpty || !content ? (
        <div className="px-3 py-8 text-center text-xs text-muted-foreground italic">
          <Hash className="w-4 h-4 mx-auto mb-2 opacity-40" />
          Noch nicht generiert.
        </div>
      ) : (
        <pre className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto bg-background">
          {content}
        </pre>
      )}
    </div>
  );
}