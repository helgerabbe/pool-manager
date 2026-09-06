import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import HtmlIframePreview from '@/components/allgemeineAufgaben/HtmlIframePreview';
import { fragmentZuDokument, AUFGABE_ZIELFLAECHE } from '@/lib/aufgabeFragment';

/**
 * Zeigt EIN Aufgabenformat der internen Galerie so, wie Schüler es sehen —
 * in der echten Zielfläche (Tablet quer).
 *
 * Wird an zwei Stellen gebraucht: in der Verwaltung (vor der Freigabe) und in
 * der Aufgabenwerkstatt (bevor die Lehrkraft ein Format übernimmt). Deshalb
 * liegt der Dialog hier und nicht in einem der beiden Bereiche.
 */
export default function FormatVorschauDialog({ format, open, onOpenChange }) {
  if (!format) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{format.name || 'Unbenanntes Format'}</DialogTitle>
          <DialogDescription>
            So sehen Schüler:innen dieses Format. Die Inhalte sind Platzhalter — beim Erstellen einer
            Aufgabe werden sie ersetzt. Bitte ausprobieren, ob die Mechanik trägt.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/30 p-3 overflow-auto">
          <div
            className="mx-auto bg-white rounded-md shadow-sm overflow-hidden"
            style={{ width: AUFGABE_ZIELFLAECHE.breite, maxWidth: '100%' }}
          >
            <HtmlIframePreview
              htmlCode={fragmentZuDokument(format.fragment)}
              style={{ height: AUFGABE_ZIELFLAECHE.hoehe }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}