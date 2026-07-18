import React, { useState } from 'react';
import { Link2, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

/**
 * Zeigt die "Moodle-Adresse" einer privaten Einheit: den angepassten
 * Parameter `einheit=<ID>`, den die Lehrkraft in Moodle beim Externen Tool
 * unter "Angepasste Parameter" einträgt. Mit Kopier-Button + Kurzanleitung.
 */
export default function MoodleParameterButton({ einheit }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const parameter = `einheit=${einheit.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parameter);
      setCopied(true);
      toast.success('Moodle-Parameter kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      toast.error('Kopieren fehlgeschlagen — bitte den Text markieren und manuell kopieren.');
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
        title="Moodle-Adresse dieser Einheit anzeigen (für die Verknüpfung im Moodle-Kurs)"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95%] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Moodle-Adresse dieser Einheit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Damit Ihre Schüler:innen in Moodle <strong>genau diese Einheit</strong> („{einheit.titel_der_einheit}") sehen,
              tragen Sie beim Externen Tool in Moodle diesen Parameter ein:
            </p>

            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-mono break-all select-all">
                {parameter}
              </code>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-900">So tragen Sie den Parameter in Moodle ein:</p>
              <ol className="text-xs text-blue-800/90 space-y-1 list-decimal pl-4">
                <li>In Ihrem Moodle-Kurs: „Aktivität anlegen" → <strong>„Externes Tool"</strong> wählen.</li>
                <li>Bei „Vorkonfiguriertes Tool" das Tool <strong>„Pool-Manager"</strong> auswählen und der Aktivität einen Namen geben (z.&nbsp;B. den Titel der Einheit).</li>
                <li>Unter „Mehr anzeigen" das Feld <strong>„Angepasste Parameter"</strong> öffnen und den kopierten Text dort einfügen.</li>
                <li>Speichern — fertig. Der Link führt jetzt genau zu dieser Einheit.</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}