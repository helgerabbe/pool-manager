import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { AUFGABE_ZIELFLAECHE } from '@/lib/aufgabeFragment';

/**
 * Schüler-Vorschau einer gebauten OFFENEN AUFGABE.
 *
 * Gezeigt wird der fertige Snapshot in genau der Fläche, für die er gebaut
 * wurde (Tablet quer) — die Lehrkraft soll die Aufgabe wirklich durchspielen
 * können, bevor sie sie übernimmt.
 */
export default function OffeneAufgabeVorschauButton({ snapshotHtml, titel = 'Übung' }) {
  const [offen, setOffen] = useState(false);
  if (!snapshotHtml) return null;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)}>
        <Eye className="h-4 w-4" /> Schüler-Vorschau
      </Button>

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-[1040px]">
          <DialogHeader>
            <DialogTitle>{titel} — so sehen es die Schüler</DialogTitle>
          </DialogHeader>
          <div
            className="mx-auto w-full overflow-hidden rounded-xl border border-border bg-white"
            style={{ maxWidth: AUFGABE_ZIELFLAECHE.breite, height: AUFGABE_ZIELFLAECHE.hoehe }}
          >
            <iframe
              title="Offene Aufgabe"
              srcDoc={snapshotHtml}
              sandbox="allow-scripts allow-same-origin"
              className="h-full w-full border-0"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}