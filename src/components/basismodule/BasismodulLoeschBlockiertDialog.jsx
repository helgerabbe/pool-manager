import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, BookOpen } from 'lucide-react';

/**
 * Lösch-Wächter-Dialog: Erscheint, wenn ein Basismodul gelöscht werden soll,
 * dessen Lernziele noch als Basis-Vorwissen in Einheiten verlinkt sind.
 */
export default function BasismodulLoeschBlockiertDialog({ open, onClose, titel, verwendungen = [] }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Löschen nicht möglich
          </DialogTitle>
          <DialogDescription>
            Das Basismodul <strong>„{titel}"</strong> kann nicht gelöscht werden, weil seine
            Lernziele noch als Basis-Vorwissen in folgenden Einheiten verlinkt sind:
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-1">
          {verwendungen.map((v) => (
            <div key={v.einheitId || v.einheitTitel} className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                {v.einheitTitel}
              </p>
              <ul className="mt-1.5 space-y-1">
                {v.aufgaben.map((a) => (
                  <li key={a.id} className="text-xs text-muted-foreground pl-5">
                    Aufgabe: <span className="font-medium text-foreground">{a.titel}</span>
                    {a.lernziele.length > 0 && ` — ${a.lernziele.length} verknüpfte(s) Lernziel(e)`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground shrink-0">
          Entfernen Sie zuerst die Verknüpfungen in den genannten Aufgaben (Tab „Lernzielanalyse"),
          bevor Sie das Basismodul löschen.
        </p>

        <DialogFooter className="shrink-0">
          <Button onClick={onClose}>Verstanden</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}