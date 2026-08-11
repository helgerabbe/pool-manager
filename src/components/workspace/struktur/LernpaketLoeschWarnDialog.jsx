/**
 * LernpaketLoeschWarnDialog
 * ─────────────────────────
 * Warnung vor dem Entfernen eines Lernpakets aus der Struktur.
 * Zeigt, in welchen Lerntyp-Arbeitsplänen das Paket aktuell eingeplant ist
 * und ob diese Pläne bereits freigegeben sind — die Freigabe der Struktur
 * verhindert das Löschen nicht mehr, deshalb muss die Auswirkung sichtbar sein.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

const LERNTYP_LABEL = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

export default function LernpaketLoeschWarnDialog({ open, onClose, onConfirm, paket, einheitId }) {
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['lernpaket-memberships', paket?.id],
    queryFn: () => base44.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
      aufgabe_id: paket.id,
    }),
    enabled: !!open && !!paket?.id && !!einheitId,
  });

  const freigegeben = memberships.filter(m => m.pfad_status === 'locked_for_export');

  return (
    <AlertDialog open={!!open} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Lernpaket „{paket?.titel_des_pakets}" entfernen?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verwendung wird geprüft…
                </span>
              ) : memberships.length === 0 ? (
                <p>Dieses Lernpaket ist in keinem Arbeitsplan eingeplant. Es wird mit dem nächsten Speichern der Struktur samt Inhalten entfernt.</p>
              ) : (
                <>
                  <p>
                    Das Lernpaket ist in{' '}
                    <strong>{memberships.length} Arbeitsplan{memberships.length !== 1 ? 'en' : ''}</strong> eingeplant:
                  </p>
                  <ul className="list-disc pl-5">
                    {memberships.map(m => (
                      <li key={m.id}>
                        {LERNTYP_LABEL[m.lerntyp] || m.lerntyp}
                        {m.pfad_status === 'locked_for_export' && (
                          <span className="ml-1 font-semibold text-amber-700">(freigegeben)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Beim Speichern wird es <strong>aus diesen Arbeitsplänen entfernt</strong>
                    {freigegeben.length > 0 && ' — auch aus den bereits freigegebenen'}. Die Pläne ändern sich dadurch und
                    müssen ggf. erneut geprüft werden.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Lernpaket entfernen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}