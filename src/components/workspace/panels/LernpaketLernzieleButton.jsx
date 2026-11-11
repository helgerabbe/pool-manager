import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { kategorieColors } from './SharedUI';

/** Knopf „Lernziele": zeigt die Lernziele, die mit diesem Lernpaket verbunden sind. */
export default function LernpaketLernzieleButton({ lernziele = [] }) {
  const [offen, setOffen] = useState(false);
  const ziele = lernziele.filter((lz) => lz.sync_status !== 'to_delete');
  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)} title="Lernziele dieses Lernpakets anzeigen">
        <Target className="w-3.5 h-3.5" /> Lernziele
      </Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lernziele dieses Lernpakets</DialogTitle>
          </DialogHeader>
          {ziele.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Diesem Lernpaket sind noch keine Lernziele zugeordnet.</p>
          ) : (
            <ol className="space-y-2">
              {ziele.map((lz, i) => (
                <li key={lz.id} className="rounded-md border border-border bg-card px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground mt-0.5">{i + 1}.</span>
                    <p className="flex-1 text-sm text-foreground">{lz.formulierung_fachsprache}</p>
                    {lz.kategorie && (
                      <span className={cn('shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full', kategorieColors[lz.kategorie])}>
                        {lz.kategorie}
                      </span>
                    )}
                  </div>
                  {lz.schueler_uebersetzung && (
                    <p className="mt-1 ml-5 text-xs text-muted-foreground">Für Schüler: {lz.schueler_uebersetzung}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}