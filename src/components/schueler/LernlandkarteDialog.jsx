import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Map, BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Schüler-Dialog, der die Lernlandkarte einer Einheit anzeigt.
 * Umschaltbar zwischen "verringert" (nur priorisierte Lernziele) und
 * "vollständig" (alle Lernziele).
 */
export default function LernlandkarteDialog({ open, onOpenChange, einheit }) {
  const einheitId = einheit?.id;

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['llk-themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: open && !!einheitId,
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['llk-lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: open && !!einheitId,
  });
  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['llk-lernziele', einheitId],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: open && !!einheitId,
  });

  const paketIds = new Set(lernpakete.map((p) => p.id));
  const sichtbareZiele = alleLernziele.filter((lz) => paketIds.has(lz.lernpaket_id));

  const themenfelderSortiert = [...themenfelder].sort(
    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Map className="w-5 h-5 text-primary" />
            Lernlandkarte – {einheit?.titel_der_einheit}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {themenfelderSortiert.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Für diese Einheit ist noch keine Lernlandkarte vorhanden.
            </p>
          )}
          {themenfelderSortiert.map((tf) => {
            const paketeTf = lernpakete
              .filter((p) => p.themenfeld_id === tf.id)
              .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
            return (
              <ThemenfeldBlock
                key={tf.id}
                themenfeld={tf}
                pakete={paketeTf}
                lernziele={sichtbareZiele}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemenfeldBlock({ themenfeld, pakete, lernziele }) {
  const [offen, setOffen] = useState(true);
  const zieleImThemenfeld = pakete.reduce(
    (sum, p) => sum + lernziele.filter((lz) => lz.lernpaket_id === p.id).length,
    0
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOffen(!offen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/50 transition-colors text-left text-sm font-semibold"
      >
        <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', !offen && '-rotate-90')} />
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate">{themenfeld.titel}</span>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {zieleImThemenfeld} Ziele
        </span>
      </button>

      {offen && (
        <div className="border-t border-border bg-muted/20 divide-y divide-border/60">
          {pakete.map((paket) => {
            const ziele = lernziele.filter((lz) => lz.lernpaket_id === paket.id);
            return (
              <div key={paket.id} className="px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {paket.reihenfolge_nummer}. {paket.titel_des_pakets}
                </p>
                {ziele.length > 0 ? (
                  <ul className="space-y-1">
                    {ziele.map((lz) => (
                      <li key={lz.id} className="text-sm text-foreground flex gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {lz.schueler_uebersetzung || lz.formulierung_fachsprache}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Keine Lernziele.</p>
                )}
              </div>
            );
          })}
          {pakete.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">Keine Lernpakete.</p>
          )}
        </div>
      )}
    </div>
  );
}