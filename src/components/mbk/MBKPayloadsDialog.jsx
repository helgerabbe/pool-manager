/**
 * MBKPayloadsDialog.jsx
 *
 * Zeigt die Payloads, die ein Generator als Input bekommt, in einem Dialog
 * an — als formatiertes JSON, mit Copy-Button pro Payload. Reine
 * Inspektions-/Debug-Hilfe; verändert keinen State.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

function PayloadBlock({ label, payload }) {
  const json = React.useMemo(
    () => (payload ? JSON.stringify(payload, null, 2) : '(nicht verfügbar)'),
    [payload]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      toast.success(`${label} kopiert.`);
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-muted/30">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 h-7">
          <Copy className="w-3.5 h-3.5" />
          Kopieren
        </Button>
      </div>
      <pre className="text-[11px] font-mono p-3 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words">
        {json}
      </pre>
    </div>
  );
}

export default function MBKPayloadsDialog({ open, onOpenChange, payloads = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payloads für diesen Generator</DialogTitle>
          <DialogDescription>
            Diese JSON-Objekte werden als Input an den Generator übergeben.
            Sie werden direkt aus den Rohdaten der Einheit gebaut — kein
            Lookup im Export-Center.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {payloads.map((p) => (
            <PayloadBlock key={p.label} label={p.label} payload={p.payload} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}