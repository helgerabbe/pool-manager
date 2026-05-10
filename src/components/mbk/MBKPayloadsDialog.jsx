/**
 * MBKPayloadsDialog.jsx
 *
 * Zeigt die Payloads, die ein Generator als Input bekommt, in einem Dialog
 * an — als formatiertes JSON bzw. Klartext, mit Copy-Button pro Payload.
 *
 * v2: Akkordeon-Layout (alle Blöcke initial eingeklappt) + optionaler
 * Bearbeiten-Modus pro Block. Bearbeitbare Blöcke werden über
 * `editConfig` an den jeweiligen Eintrag gehängt:
 *
 *   editConfig: {
 *     editable: boolean,
 *     dirty: boolean,
 *     value: string,                 // aktueller Editor-Inhalt
 *     onChange: (newValue) => void,  // typing
 *     onSave: () => Promise<void>,   // Speichern
 *     onReset: () => void,           // Verwerfen → zurück auf gespeicherten Stand
 *     saving: boolean,
 *     readOnlyReason?: string,       // optionaler Text, warum NICHT editierbar
 *   }
 *
 * Strukturpayloads bekommen kein `editConfig` und bleiben damit read-only —
 * sie werden deterministisch aus den Rohdaten der Einheit gebaut.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Pencil, Save, X, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

function PayloadBlock({ label, payload, format = 'json', subLabel = null, editConfig = null }) {
  const [editing, setEditing] = React.useState(false);

  const text = React.useMemo(() => {
    if (payload === null || payload === undefined) return '(nicht verfügbar)';
    if (format === 'text') return String(payload);
    return JSON.stringify(payload, null, 2);
  }, [payload, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editing && editConfig ? editConfig.value : text);
      toast.success(`${label} kopiert.`);
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  const handleSave = async () => {
    if (!editConfig?.onSave) return;
    try {
      await editConfig.onSave();
      setEditing(false);
    } catch (e) {
      // Toast wird vom Hook geliefert.
    }
  };

  const handleReset = () => {
    if (editConfig?.onReset) editConfig.onReset();
    setEditing(false);
  };

  const isEditable = !!editConfig?.editable;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-muted/30">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            {label}
            {!isEditable && editConfig?.readOnlyReason && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-normal"
                title={editConfig.readOnlyReason}
              >
                <Lock className="w-3 h-3" />
                read-only
              </span>
            )}
            {editConfig?.dirty && (
              <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                Ungespeichert
              </span>
            )}
          </h4>
          {subLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && isEditable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="gap-1.5 h-7"
            >
              <Pencil className="w-3.5 h-3.5" />
              Bearbeiten
            </Button>
          )}
          {editing && isEditable && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={editConfig?.saving}
                className="gap-1.5 h-7"
              >
                <X className="w-3.5 h-3.5" />
                Verwerfen
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={editConfig?.saving || !editConfig?.dirty}
                className="gap-1.5 h-7"
              >
                {editConfig?.saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Speichern
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 h-7 shrink-0">
            <Copy className="w-3.5 h-3.5" />
            Kopieren
          </Button>
        </div>
      </div>

      {editing && isEditable ? (
        <Textarea
          value={editConfig.value}
          onChange={(e) => editConfig.onChange?.(e.target.value)}
          className="text-[11px] font-mono p-3 max-h-[60vh] min-h-[300px] resize-y rounded-none border-0 focus-visible:ring-0"
        />
      ) : (
        <pre className="text-[11px] font-mono p-3 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words">
          {text}
        </pre>
      )}
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
            Diese Inhalte werden als Input an den Generator übergeben. Sie sind
            zur besseren Übersicht eingeklappt — klicke einen Block auf, um ihn
            anzuzeigen oder (wo möglich) zu bearbeiten.
          </DialogDescription>
        </DialogHeader>

        <Accordion type="multiple" className="mt-2 space-y-2">
          {payloads.map((p, i) => (
            <AccordionItem
              key={p.label}
              value={`payload-${i}`}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/30">
                <div className="flex items-center gap-2 min-w-0 text-left">
                  <span className="text-sm font-semibold">{p.label}</span>
                  {p.editConfig?.dirty && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                      Ungespeichert
                    </span>
                  )}
                  {p.subLabel && (
                    <span className="text-[11px] text-muted-foreground font-normal truncate">
                      · {p.subLabel}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 pt-0">
                <PayloadBlock
                  label={p.label}
                  payload={p.payload}
                  format={p.format || 'json'}
                  subLabel={p.subLabel || null}
                  editConfig={p.editConfig || null}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}