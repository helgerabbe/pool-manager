/**
 * ExportCompletionDialog.jsx
 *
 * Phase G.3 – Zwei-stufiger Abschluss-Dialog.
 *
 * Schritt 1 (Erfolgs-Frage):
 *   "Hat der Export an Moodle vollständig funktioniert?"
 *     [✓ Ja, alles erfolgreich]   → Schritt 3 (Zusammenfassung + Confirm)
 *     [✗ Nein, es gab Fehler]    → Schritt 2 (Fehler-Picker)
 *
 * Schritt 2 (Fehler-Picker):
 *   Hierarchischer Baum aus den Delta-Items dieser Einheit. Spezialist
 *   markiert die fehlgeschlagenen Items (Lernpakete, Aufgaben,
 *   Aktivitäten, Master, ggf. Sektoren). Items ohne Häkchen gelten als
 *   erfolgreich exportiert.
 *
 * Schritt 3 (Confirm):
 *   Zeigt Summary, ruft `finalizeExportCompletion` auf:
 *     successfulIds → 'synced' + export_error=false
 *     failedIds     → 'error'  + export_error=true
 *     failedSektors → membership.export_error=true
 *   Lifecycle der Einheit wird auf 'draft' zurückgesetzt.
 *
 * Bewusst schlicht gehalten: Eine flache Liste pro Kategorie, statt
 * komplexer Themenfeld-Hierarchie. Das ist für den Export-Spezialisten
 * der schnellste Weg, weil Moodle-Fehler typischerweise ein paar
 * konkrete Items betreffen und nicht ganze Strukturäste.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DELTA_SYNC_STATES = new Set(['new', 'pending', 'modified', 'error', null, undefined]);
const isInDelta = (item) => DELTA_SYNC_STATES.has(item?.sync_status);

export default function ExportCompletionDialog({ open, onOpenChange, einheit }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1=Frage, 2=Picker, 3=Confirm
  const [failedIds, setFailedIds] = useState(new Set());

  // Delta-Items laden — nur wenn der Dialog offen ist.
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheit?.id],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id && open,
  });
  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheit?.id],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id && open,
  });
  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', einheit?.id],
    queryFn: async () => {
      const lp = await base44.entities.Lernpakete.filter({ einheit_id: einheit.id });
      const ids = new Set(lp.map((p) => p.id));
      const all = await base44.entities.LernpaketPhaseAktivitaet.list();
      return all.filter((a) => ids.has(a.lernpaket_id));
    },
    enabled: !!einheit?.id && open,
  });

  const deltaPakete = useMemo(() => lernpakete.filter(isInDelta), [lernpakete]);
  const deltaAufgaben = useMemo(() => allgemeineAufgaben.filter(isInDelta), [allgemeineAufgaben]);
  const deltaAktivitaeten = useMemo(() => aktivitaeten.filter(isInDelta), [aktivitaeten]);

  const allDeltaIds = useMemo(() => {
    return [
      ...deltaPakete.map((p) => p.id),
      ...deltaAufgaben.map((a) => a.id),
      ...deltaAktivitaeten.map((a) => a.id),
    ];
  }, [deltaPakete, deltaAufgaben, deltaAktivitaeten]);

  const successfulIds = useMemo(
    () => allDeltaIds.filter((id) => !failedIds.has(id)),
    [allDeltaIds, failedIds]
  );

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('finalizeExportCompletion', {
        einheitId: einheit.id,
        successfulIds,
        failedIds: Array.from(failedIds),
        failedSektors: [], // Sektor-Picker bewusst out-of-scope für G.3
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['einheit', einheit.id] });
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      queryClient.invalidateQueries({ queryKey: ['einheiten-export-center'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete', einheit.id] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheit.id] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten', einheit.id] });
      toast.success(
        `Export abgeschlossen: ${data.synced_count} erfolgreich, ${data.error_count} fehlgeschlagen. Einheit wieder freigegeben.`
      );
      handleClose();
    },
    onError: (err) => {
      toast.error(err?.message || 'Abschluss fehlgeschlagen.');
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    // Delay damit der Dialog beim Schließen nicht "springt".
    setTimeout(() => {
      setStep(1);
      setFailedIds(new Set());
    }, 200);
  };

  const toggleFailed = (id) => {
    setFailedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Render-Helfer ──────────────────────────────────────────────────
  const renderItemRow = (id, label, kind) => (
    <li
      key={id}
      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
      onClick={() => toggleFailed(id)}
    >
      <Checkbox checked={failedIds.has(id)} onCheckedChange={() => toggleFailed(id)} className="h-4 w-4" />
      <Badge variant="outline" className="text-[10px] uppercase shrink-0">{kind}</Badge>
      <span className="flex-1 text-sm truncate">{label}</span>
    </li>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        {/* ── Schritt 1: Erfolgs-Frage ─────────────────────────────────── */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Export abgeschlossen?</DialogTitle>
              <DialogDescription>
                Hat die Übertragung an Moodle für diese Einheit vollständig funktioniert?
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900">Ja, alles erfolgreich</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Alle {allDeltaIds.length} Delta-Elemente werden als „synced" markiert.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Nein, es gab Fehler</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Markiere im nächsten Schritt die Items, die nicht übertragen wurden.
                  </p>
                </div>
              </button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
            </DialogFooter>
          </>
        )}

        {/* ── Schritt 2: Fehler-Picker ─────────────────────────────────── */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Fehlgeschlagene Items markieren</DialogTitle>
              <DialogDescription>
                Setze ein Häkchen bei allen Items, deren Übertragung fehlgeschlagen ist.
                Lehrkräfte sehen diese Items dann als „Export fehlgeschlagen" markiert.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto -mx-6 px-6 border-y border-border">
              {allDeltaIds.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground italic">
                  Keine Delta-Items vorhanden.
                </p>
              ) : (
                <div className="py-2 space-y-4">
                  {deltaPakete.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                        Lernpakete ({deltaPakete.length})
                      </p>
                      <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
                        {deltaPakete.map((lp) =>
                          renderItemRow(lp.id, lp.titel_des_pakets || '(ohne Titel)', 'Paket')
                        )}
                      </ul>
                    </div>
                  )}

                  {deltaAufgaben.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                        Aufgaben ({deltaAufgaben.length})
                      </p>
                      <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
                        {deltaAufgaben.map((a) =>
                          renderItemRow(
                            a.id,
                            a.titel || '(ohne Titel)',
                            a.anforderungsebene === '3 - Projekt' ? 'Projekt' : 'Aufgabe'
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {deltaAktivitaeten.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                        Aktivitäten ({deltaAktivitaeten.length})
                      </p>
                      <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
                        {deltaAktivitaeten.map((ak) =>
                          renderItemRow(ak.id, `${ak.phase || ''} – Aktivität`, 'Aktivität')
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Zurück
              </Button>
              <div className="flex-1 text-sm text-muted-foreground self-center">
                {failedIds.size} fehlerhaft · {successfulIds.length} erfolgreich
              </div>
              <Button onClick={() => setStep(3)}>Weiter</Button>
            </DialogFooter>
          </>
        )}

        {/* ── Schritt 3: Confirm ───────────────────────────────────────── */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Abschluss bestätigen</DialogTitle>
              <DialogDescription>
                Mit der Bestätigung werden die Status gesetzt und die Einheit wieder zur
                Bearbeitung freigegeben (Lifecycle → „Entwurf").
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">
                    {successfulIds.length} erfolgreich exportiert
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Werden auf „synced" gesetzt und gelten als live in Moodle.
                </p>
              </div>

              {failedIds.size > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-900">
                      {failedIds.size} fehlerhaft
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Bekommen ein rotes „Export fehlgeschlagen"-Badge. Sobald die
                    Lehrkraft das Item bearbeitet, verschwindet das Badge automatisch.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(failedIds.size > 0 ? 2 : 1)}
                disabled={finalizeMutation.isPending}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Zurück
              </Button>
              <Button
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Jetzt abschließen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}