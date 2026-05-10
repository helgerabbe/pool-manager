/**
 * MetaPromptTab.jsx — Tab 0
 *
 * Statischer Meta-System-Prompt aus `lib/operatorMetaSystemPrompt.js`.
 * Wird einmal pro MBK-Sitzung kopiert. Kein Drift-Status (statisch).
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { META_SYSTEM_PROMPT, META_SYSTEM_PROMPT_VERSION } from '@/lib/operatorMetaSystemPrompt';

export default function MetaPromptTab() {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(META_SYSTEM_PROMPT);
      toast.success('Meta-System-Prompt in Zwischenablage kopiert.');
    } catch (e) {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Meta-System-Prompt (v{META_SYSTEM_PROMPT_VERSION})</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Erweckt eine frische KI-Sitzung zur Moodle-Builder-KI.
                Kopiere diesen Text als <strong>allerersten</strong> Prompt
                in die MBK und warte auf die Bestätigung {`„MBK v${META_SYSTEM_PROMPT_VERSION} bereit."`},
                bevor du Payload 1 sendest.
              </p>
            </div>
          </div>
          <Button onClick={handleCopy} className="gap-1.5 shrink-0">
            <Copy className="w-3.5 h-3.5" />
            Kopieren
          </Button>
        </div>
      </div>

      <pre className="rounded-lg border bg-muted/40 p-4 text-xs whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto">
        {META_SYSTEM_PROMPT}
      </pre>

      <p className="text-xs text-muted-foreground italic px-1">
        Dieser Prompt ist statisch — er ändert sich nur, wenn das Ops-Team
        die Datei <code className="bg-muted px-1 py-0.5 rounded text-[11px]">lib/operatorMetaSystemPrompt.js</code> aktualisiert.
      </p>
    </div>
  );
}