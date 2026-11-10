import React from 'react';
import { toast } from 'sonner';
import { Loader2, FileQuestion } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import useOnlineTest from '@/hooks/useOnlineTest';
import OnlineTestVorschau from './OnlineTestVorschau';
import OnlineTestChat from './OnlineTestChat';

/** Extra-Fenster für den Systembaustein „Externer Test“: Online-Test aus dem Pragmatiker-Dashboard erstellen. */
export default function OnlineTestDialog({ open, onOpenChange, einheit, sektoren, aufgabenById }) {
  const { test, isLoading, laedt, senden } = useOnlineTest({ einheit, sektoren, aufgabenById, offen: open });
  const onSenden = (w) => senden(w).catch(() => toast.error('Der Assistent hat nicht geantwortet. Bitte noch einmal versuchen.'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 p-0">
        <DialogTitle className="border-b px-5 py-3 font-display">Online-Test · {einheit?.titel_der_einheit}</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 bg-muted/40">
            {isLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : test?.aufgaben?.length ? (
              <OnlineTestVorschau test={test} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileQuestion className="h-10 w-10" />
                <p className="text-sm">Noch kein Test. Lass ihn rechts vom Assistenten erstellen.</p>
              </div>
            )}
          </div>
          <aside className="w-96 shrink-0 border-l bg-background">
            <OnlineTestChat verlauf={test?.gespraech || []} laedt={laedt} hatTest={!!test?.aufgaben?.length} onSenden={onSenden} />
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}