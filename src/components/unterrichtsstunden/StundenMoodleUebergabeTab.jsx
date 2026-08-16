/**
 * Register 4 der Unterrichtsstunde: Übergabe nach Moodle.
 * Zeigt den Stunden-Code zum Kopieren und die Schritte in Moodle.
 */
import React, { useState } from 'react';
import { Link2, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function StundenMoodleUebergabeTab({ stunde, phasen = [] }) {
  const [copied, setCopied] = useState(false);
  const code = `stunde=${stunde.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Stunden-Code kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      toast.error('Kopieren fehlgeschlagen — bitte den Text markieren und manuell kopieren.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-blue-600" />
          Stunden-Code für Moodle
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Diese Stunde bleibt hier in der App — die Schüler:innen erreichen sie über einen Link in Ihrem Moodle-Kurs.
        </p>
      </div>

      {phasen.length === 0 && (
        <p className="text-sm text-red-700 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Diese Stunde hat noch keine Phasen — bauen Sie zuerst das Regieblatt.
        </p>
      )}

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
          <li>Bei „Vorkonfiguriertes Tool" das Tool <strong>„Pool-Manager"</strong> auswählen und der Aktivität einen Namen geben (z. B. den Stundentitel).</li>
          <li>Unter „Mehr anzeigen" das Feld <strong>„Angepasste Parameter"</strong> öffnen und den kopierten Code dort einfügen.</li>
          <li>Speichern — fertig. Der Link führt die Schüler:innen direkt in diese Stunde.</li>
        </ol>
      </div>

      <p className="text-xs text-muted-foreground">
        Im Unterricht geben Sie die Phasen-Codes aus dem Regieblatt an – damit schalten die Schüler:innen
        Phase für Phase frei. Ihr Notfall-Code
        {stunde.notfall_code ? <> (<span className="font-mono">{stunde.notfall_code}</span>)</> : null} öffnet jede Phase.
      </p>
    </div>
  );
}