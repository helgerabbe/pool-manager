import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Check, Loader2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { istPortierbar, baueAenderungFuerPortierung } from '@/lib/aufgabePortierung';

/**
 * PortierungButton
 * ────────────────
 * Wandelt eine alte KI-Tutor-Einzelaufgabe in eine Schrittfolge mit einem
 * Brian-Schritt um — angeboten, nicht erzwungen.
 *
 * Warum pro Aufgabe statt in einem Rutsch: Es sind rund 96 produktive, teils
 * freigegebene und nach Brian übertragene Aufgaben. Eine Massenänderung wäre
 * schneller, aber ein Fehler träfe alle auf einmal. So sieht die Lehrkraft an
 * den ersten fünf, ob die Umwandlung taugt.
 *
 * Vor dem Umwandeln steht, was übernommen wird — und was auffällig ist.
 * Nichts wird gelöscht: Die Felder an der Aufgabe bleiben stehen und sind der
 * Rückweg, falls sich die Umwandlung als falsch erweist.
 */
export default function PortierungButton({ aufgabe, kannBearbeiten = false, onFertig }) {
  const [offen, setOffen] = useState(false);
  const queryClient = useQueryClient();

  const portieren = useMutation({
    mutationFn: () => {
      const { aenderung } = baueAenderungFuerPortierung(aufgabe);
      return updateAllgemeineAufgabe(aufgabe.id, aenderung);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setOffen(false);
      toast.success('Aufgabe umgewandelt. Sie öffnet sich jetzt in der Werkstatt.');
      onFertig?.();
    },
    onError: (err) => toast.error('Umwandeln fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler')),
  });

  if (!kannBearbeiten || !istPortierbar(aufgabe)) return null;

  const { uebernommen, hinweise } = baueAenderungFuerPortierung(aufgabe);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
        onClick={() => setOffen(true)}
      >
        <ArrowRightLeft className="w-4 h-4" />
        In die Werkstatt übernehmen
      </Button>

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aufgabe in die Werkstatt übernehmen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Aus dieser Aufgabe wird eine Schrittfolge mit einem Gespräch mit Brian. Inhaltlich
              ändert sich nichts — Sie bearbeiten sie danach in der Aufgaben-Werkstatt statt in
              den alten Reitern.
            </p>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                Wird übernommen
              </p>
              {uebernommen.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {uebernommen.map((u, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-900">
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {u}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-emerald-900">
                  Diese Aufgabe ist noch leer — es gibt nichts zu übernehmen.
                </p>
              )}
            </div>

            {hinweise.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1">
                {hinweise.map((h, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {h}
                  </p>
                ))}
              </div>
            )}

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Die bisherigen Felder bleiben an der Aufgabe stehen. Nichts wird gelöscht.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setOffen(false)} className="ml-auto">
              Abbrechen
            </Button>
            <Button onClick={() => portieren.mutate()} disabled={portieren.isPending} className="gap-2">
              {portieren.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird umgewandelt…</>
                : <><ArrowRightLeft className="w-4 h-4" /> Übernehmen</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
