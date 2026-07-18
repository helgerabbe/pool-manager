import React, { useState } from 'react';
import { Link2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Tab 1 ("Einheit verwalten") bei PRIVATEN Einheiten: zeigt den
 * Einheiten-Code (einheit=<ID>) prominent zum Kopieren an — der Code
 * steht ab dem Anlegen der Einheit fest und ändert sich nie.
 */
export default function MoodleCodeSection({ einheit }) {
  const [copied, setCopied] = useState(false);
  const code = `einheit=${einheit.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Einheiten-Code kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      toast.error('Kopieren fehlgeschlagen — bitte den Text markieren und manuell kopieren.');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-blue-600" />
          Einheiten-Code für Moodle
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Jede Einheit hat einen eigenen Code — wie eine Hausnummer. Damit verknüpfen Sie diese Einheit in Moodle.
        </p>
      </div>

      <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-mono break-all select-all">
            {code}
          </code>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopiert' : 'Kopieren'}
          </button>
        </div>
        <ol className="text-xs text-blue-800/90 space-y-1 list-decimal pl-4">
          <li>In Ihrem Moodle-Kurs: „Aktivität anlegen" → <strong>„Externes Tool"</strong> wählen.</li>
          <li>Bei „Vorkonfiguriertes Tool" das Tool <strong>„Pool-Manager"</strong> auswählen und der Aktivität einen Namen geben.</li>
          <li>Unter „Mehr anzeigen" das Feld <strong>„Angepasste Parameter"</strong> öffnen (so heißt es in Moodle) und den kopierten Code dort einfügen.</li>
          <li>Speichern — fertig. Der Link führt jetzt genau zu dieser Einheit.</li>
        </ol>
      </div>
    </div>
  );
}