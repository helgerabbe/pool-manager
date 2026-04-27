/**
 * ArbeitsphaseModal.jsx
 *
 * Modal-Dialog für das Anlegen eines Arbeitsphase-Sektors (Phase B).
 *
 * Verantwortung:
 *   - Themenfeld-Picker mit visueller Sperre für bereits verknüpfte TFs.
 *   - Wenn die Einheit GAR KEINE Themenfelder hat: Auto-Hülle "Themenfeld
 *     Platzhalter" wird beim Bestätigen serverseitig erzeugt (siehe Cockpit).
 *   - Liefert beim Confirm `{ themenfeldId, themenfeldTitel }` an den Aufrufer.
 *     Wenn `themenfeldId === null`, soll der Aufrufer eine Hülle anlegen.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, BookOpen, Lock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ArbeitsphaseModal({
  open,
  onOpenChange,
  themenfelder = [],
  belegteThemenfeldIds = new Set(),
  busy = false,
  onConfirm,
}) {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (open) setSelectedId(null);
  }, [open]);

  const verfuegbar = useMemo(
    () => themenfelder.filter((tf) => !belegteThemenfeldIds.has(tf.id)),
    [themenfelder, belegteThemenfeldIds]
  );
  const belegt = useMemo(
    () => themenfelder.filter((tf) => belegteThemenfeldIds.has(tf.id)),
    [themenfelder, belegteThemenfeldIds]
  );

  const noTFs = themenfelder.length === 0;
  const allBelegt = !noTFs && verfuegbar.length === 0;

  const handleConfirm = () => {
    if (noTFs) {
      onConfirm?.({ themenfeldId: null, themenfeldTitel: 'Themenfeld Platzhalter' });
      return;
    }
    if (!selectedId) return;
    const tf = themenfelder.find((t) => t.id === selectedId);
    if (!tf) return;
    onConfirm?.({ themenfeldId: tf.id, themenfeldTitel: tf.titel });
  };

  const canConfirm = noTFs || !!selectedId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Arbeitsphase Themenfeld anlegen
          </DialogTitle>
          <DialogDescription className="text-xs">
            Verknüpfe diesen Sektor mit einem Themenfeld aus dem Strukturboard.
            Der Sektor-Titel spiegelt anschließend automatisch das Themenfeld.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {noTFs && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Diese Einheit hat noch keine Themenfelder im Strukturboard.
                Wir legen automatisch eine Hülle <strong>„Themenfeld Platzhalter"</strong> an,
                die du später im Strukturboard umbenennen kannst.
              </div>
            </div>
          )}

          {allBelegt && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Alle Themenfelder dieser Einheit sind bereits in diesem Lernpfad verknüpft.
                Lege zuerst ein neues Themenfeld im Strukturboard an oder lösche einen
                bestehenden Arbeitsphase-Sektor.
              </div>
            </div>
          )}

          {verfuegbar.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Verfügbare Themenfelder
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {verfuegbar.map((tf) => {
                  const checked = selectedId === tf.id;
                  return (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setSelectedId(tf.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-left text-sm transition-colors ${
                        checked
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-border bg-card hover:border-blue-300'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="flex-1 truncate">{tf.titel || 'Ohne Titel'}</span>
                      {checked && (
                        <span className="text-[10px] font-semibold text-blue-700">Ausgewählt</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {belegt.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Bereits verknüpft
              </div>
              <div className="space-y-1">
                {belegt.map((tf) => (
                  <div
                    key={tf.id}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-dashed border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate line-through">{tf.titel || 'Ohne Titel'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange?.(false)}
            disabled={busy}
          >
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || allBelegt || busy}
            className="gap-1.5"
          >
            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
            {noTFs ? 'Mit Platzhalter anlegen' : 'Sektor anlegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}