/**
 * EinheitZeitDialog.jsx
 *
 * Zeigt dem Schüler, an welchen Tagen er wie viele Minuten an einer
 * Einheit gearbeitet hat – plus Gesamtsumme. Reine Anzeige.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock } from 'lucide-react';

function datumLabel(yyyymmdd) {
  const [j, m, t] = String(yyyymmdd).split('-');
  return `${t}.${m}.${j}`;
}

export default function EinheitZeitDialog({ open, onOpenChange, einheitTitel, logs = [] }) {
  const sortiert = [...logs].sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const gesamt = logs.reduce((s, l) => s + (l.minuten || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Deine Lernzeit
          </DialogTitle>
          {einheitTitel && <p className="text-xs text-muted-foreground">{einheitTitel}</p>}
        </DialogHeader>

        {sortiert.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            Noch keine Lernzeit erfasst.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {sortiert.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{datumLabel(l.datum)}</span>
                <span className="font-semibold text-foreground">{l.minuten || 0} Min.</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-sm">
          <span className="font-medium text-primary">Insgesamt</span>
          <span className="font-bold text-primary">{gesamt} Min.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}