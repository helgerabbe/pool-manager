import React from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Kopfleiste eines Reiters: Button zum Neu-Erstellen plus Erklärung, was dabei passiert. */
export default function NeuStartenLeiste({ text, hinweis, onClick, laeuft, warnung }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
      <Button variant="outline" size="sm" onClick={onClick} disabled={laeuft} className="gap-2">
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        {text}
      </Button>
      <p className={warnung ? 'flex-1 text-xs font-medium text-destructive' : 'flex-1 text-xs text-muted-foreground'}>{hinweis}</p>
    </div>
  );
}