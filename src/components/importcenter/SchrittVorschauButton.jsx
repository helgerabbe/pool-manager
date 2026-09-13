import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import ActivityPreviewModal from '@/components/workspace/ActivityPreviewModal';

/**
 * Zeigt, was ein Schritt eines Auftrags für Schüler bedeutet — OHNE dass der
 * Schritt dafür schon im Bestand liegen muss. Schritte aus dem Aktivitäten-
 * katalog laufen durch die bestehende Schüler-Vorschau; die übrigen Arten
 * zeigen ihren Inhalt in schülernaher Form.
 */
export default function SchrittVorschauButton({ schritt = {}, aufgabenarten = [], label = 'Vorschau' }) {
  const [offen, setOffen] = useState(false);

  if (schritt.typ === 'katalog') {
    const name = aufgabenarten.find((a) => a.id === schritt.aktivitaet_id)?.name || 'Aufgabe';
    return (
      <>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)}>
          <Eye className="h-4 w-4" /> {label}
        </Button>
        <ActivityPreviewModal
          open={offen}
          onOpenChange={setOffen}
          aktivitaet={{ name }}
          fieldValues={schritt.field_values || {}}
        />
      </>
    );
  }

  const block =
    schritt.material || schritt.aufgabe || schritt.handlung || schritt.extern || schritt.abgabe || schritt.offen || {};

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)}>
        <Eye className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {schritt.titel || 'Schritt'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{schritt.typ}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-3 overflow-auto">
            {schritt.typ === 'offen' && block.fragment ? (
              <iframe
                title="Vorschau der offenen Aufgabe"
                srcDoc={block.fragment}
                className="h-[60vh] w-full rounded-lg border border-border bg-white"
                sandbox="allow-scripts"
              />
            ) : schritt.typ === 'extern' && block.url ? (
              <iframe
                title={block.titel || 'Externe Seite'}
                src={block.url}
                className="w-full rounded-lg border border-border bg-white"
                style={{ height: block.hoehe ? `${block.hoehe}px` : '60vh' }}
              />
            ) : (
              Object.entries(block).map(([key, wert]) => (
                <div key={key} className="rounded-lg border border-border p-3">
                  <p className="mb-1 text-xs uppercase text-muted-foreground">{key}</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {Array.isArray(wert) ? wert.join(', ') : String(wert)}
                  </p>
                </div>
              ))
            )}
            {Object.keys(block).length === 0 && (
              <p className="text-sm text-muted-foreground">Dieser Schritt hat noch keine Inhalte.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}