import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';

/**
 * Warnt den Schüler, bevor er den Lerntyp (das Dashboard) wechselt.
 * Ein Wechsel verwirft den bisherigen Fortschritt – das soll bewusst
 * eine Hürde sein.
 */
export default function LerntypWechselDialog({ open, onOpenChange, vonTyp, zuTyp, onBestaetigen }) {
  const von = vonTyp ? getLerntyp(vonTyp) : null;
  const zu = zuTyp ? getLerntyp(zuTyp) : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <AlertDialogTitle className="text-center">Dashboard wirklich wechseln?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Du arbeitest gerade als <strong>{von?.name}</strong>. Wenn du zu{' '}
            <strong>{zu?.name}</strong> wechselst, beginnst du{' '}
            <strong>von vorne</strong> – dein bisheriger Fortschritt in dieser Einheit geht verloren.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={onBestaetigen}
            className="bg-destructive hover:bg-destructive/90"
          >
            Ja, wechseln und neu starten
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}