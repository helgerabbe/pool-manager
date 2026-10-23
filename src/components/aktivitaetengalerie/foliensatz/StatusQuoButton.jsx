import React from 'react';
import { toast } from 'sonner';
import { Loader2, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { beschreibeFoliensatz, STATUS_QUO_WERTE, statusQuoSpeichern } from '@/lib/foliensatzStatusQuo';

/** Übernimmt den jetzigen Foliensatz als Status quo und ersetzt die bisherigen Planungsfelder. */
export default function StatusQuoButton({ methode, folien, setze, disabled }) {
  const [offen, setOffen] = React.useState(false);
  const [laeuft, setLaeuft] = React.useState(false);
  const uebernehmen = async () => {
    setLaeuft(true);
    const w = STATUS_QUO_WERTE(beschreibeFoliensatz(methode.name, folien));
    await statusQuoSpeichern(methode.id, w);
    Object.entries(w).forEach(([k, v]) => setze(k, v));
    setLaeuft(false);
    setOffen(false);
    toast.success('Status quo übernommen.');
  };
  return (
    <>
      <Button size="sm" variant="outline" className="gap-2" disabled={disabled || laeuft} onClick={() => setOffen(true)}>
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />} Als Status quo übernehmen
      </Button>
      <AlertDialog open={offen} onOpenChange={setOffen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher, dass du das willst?</AlertDialogTitle>
            <AlertDialogDescription>Du überschreibst alles, was bisher da war: Wünsche, Ablauf und Funktionalität, Grobübersicht und die Informationen für den Grafikassistenten. Übrig bleibt nur eine genaue Beschreibung des jetzigen Foliensatzes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); uebernehmen(); }}>Ja, übernehmen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}