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

function PayloadBlock({ label, payload, format = 'json', subLabel = null }) {
  const text = React.useMemo(() => {
    if (payload === null || payload === undefined) return '(nicht verfügbar)';
    if (format === 'text') return String(payload);
    return JSON.stringify(payload, null, 2);
  }, [payload, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopiert.`);
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-muted/30">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{label}</h4>
          {subLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 h-7 shrink-0">
          <Copy className="w-3.5 h-3.5" />
          Kopieren
        </Button>
      </div>
      <pre className="text-[11px] font-mono p-3 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words">
        {text}
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
            <PayloadBlock
              key={p.label}
              label={p.label}
              payload={p.payload}
              format={p.format || 'json'}
              subLabel={p.subLabel || null}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}