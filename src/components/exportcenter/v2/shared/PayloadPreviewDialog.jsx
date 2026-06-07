/**
 * PayloadPreviewDialog.jsx
 *
 * Eigenes Fenster, das auf bewusste Anforderung ("Payload ansehen") den
 * generierten JSON-Payload eines Übergabe-Schritts zeigt. Hält die
 * To-Do-Zeilen schlank: Die Vorschau lebt nicht mehr inline, sondern nur
 * hier im Dialog.
 *
 * Reine Präsentation.
 */
import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';

export default function PayloadPreviewDialog({
  open,
  onOpenChange,
  title,
  payload,
  onCopy,
  onDownload,
}) {
  const payloadJson = useMemo(() => {
    try {
      return payload ? JSON.stringify(payload, null, 2) : '';
    } catch {
      return '';
    }
  }, [payload]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payload-Vorschau · {title}</DialogTitle>
          <DialogDescription>
            Genau dieser Inhalt wird beim Kopieren an die MBK übergeben.
          </DialogDescription>
        </DialogHeader>

        {(onCopy || onDownload) && (
          <div className="flex items-center gap-2">
            {onCopy && (
              <Button size="sm" onClick={onCopy} className="gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                Kopieren
              </Button>
            )}
            {onDownload && (
              <Button size="sm" variant="outline" onClick={onDownload} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                JSON
              </Button>
            )}
          </div>
        )}

        <pre className="rounded-lg border bg-muted/40 p-4 text-xs whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto">
          {payloadJson || 'Kein Payload-Inhalt vorhanden.'}
        </pre>
      </DialogContent>
    </Dialog>
  );
}