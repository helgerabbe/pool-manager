import React from 'react';
import { Loader2, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

/** Stunde generieren – oder mit geänderten Vorgaben neu planen (mit Warnung, dass der Entwurf ersetzt wird). */
export default function GenerierenButton({ hatEntwurf, bereit, laedt, onGenerieren }) {
  if (laedt) return <Button disabled><Loader2 className="animate-spin" /> Ich plane die Stunde …</Button>;
  if (!hatEntwurf) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!bereit} onClick={onGenerieren}><Wand2 /> Stunde generieren</Button>
        {!bereit && <span className="text-xs text-accent">Bitte zuerst den Pflicht-Container „Thema“ füllen.</span>}
      </div>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline" disabled={!bereit}><RefreshCw /> Mit diesen Vorgaben neu planen</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stunde neu planen?</AlertDialogTitle>
          <AlertDialogDescription>Dein bisheriger Grobentwurf wird durch einen neuen ersetzt. Änderungen, die du daran vorgenommen hast, gehen verloren.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onGenerieren}>Ja, neu planen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}