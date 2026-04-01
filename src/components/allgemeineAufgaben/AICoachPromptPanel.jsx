import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { generateInteractiveProjectCoach } from '@/utils/generateInteractiveProjectCoach';

/**
 * Panel für KI-Coach Prompt Anzeige und Verwaltung
 * mit Graceful Degradation bei fehlenden Daten
 */

/**
 * Empty State Component für fehlende Daten
 */
function PromptEmptyState({ reason = 'standard' }) {
  const messages = {
    standard: {
      title: 'Prompt kann nicht generiert werden',
      description: 'Bitte ordnen Sie der Aufgabe zuerst Kompetenzen / Lernziele zu.',
    },
    noData: {
      title: 'Unvollständige Daten',
      description: 'Die Aufgabe oder Einheit ist nicht vollständig konfiguriert.',
    },
  };

  const msg = messages[reason] || messages.standard;

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6">
      <div className="rounded-lg bg-amber-50 p-6 border border-amber-200 max-w-sm text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="font-semibold text-amber-900">{msg.title}</h3>
        <p className="text-sm text-amber-800">{msg.description}</p>
      </div>
    </div>
  );
}

/**
 * Panel für KI-Coach Prompt Anzeige und Verwaltung
 */
export default function AICoachPromptPanel({
  aufgabe,
  einheit,
  lernpakete,
  lernziele,
}) {
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => generateInteractiveProjectCoach(aufgabe, einheit, lernpakete, lernziele),
    [aufgabe, einheit, lernpakete, lernziele]
  );

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Coach-Prompt in Zwischenablage kopiert');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Fehler beim Kopieren');
    }
  };

  // Graceful Degradation: Empty State statt Fehler
  if (!prompt) {
    return <PromptEmptyState reason="noData" />;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">KI-Coach Prompt</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyPrompt}
          disabled={!prompt}
          className="gap-2"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Kopiert
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Kopieren
            </>
          )}
        </Button>
      </div>

      <pre className="bg-slate-50 p-4 rounded-md text-sm whitespace-pre-wrap text-foreground border border-border overflow-auto max-h-96">
        {prompt}
      </pre>

      <p className="text-xs text-muted-foreground">
        Dieser Prompt wird für die Begleitung von Projektaufgaben verwendet. Der Coach gibt individuelle Unterstützung basierend auf den Lernzielen der Einheit.
      </p>
    </div>
  );
}