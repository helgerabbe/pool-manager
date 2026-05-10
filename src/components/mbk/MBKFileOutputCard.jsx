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
import { Copy, FileText, Hash } from 'lucide-react';
import { toast } from 'sonner';

export default function MBKFileOutputCard({ filename, content, kind = null, isEmpty = false }) {
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
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <code className="text-xs font-mono font-semibold truncate">{filename}</code>
          {kind && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              {kind}
            </span>
          )}
        </div>
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