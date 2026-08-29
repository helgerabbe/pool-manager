import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Bot, BookOpen } from 'lucide-react';

/**
 * FreitextSchrittEditor
 * ─────────────────────
 * Editor für einen Schritt vom Typ 'aufgabe': eine Freitextfrage mit
 * Musterlösung oder KI-Rückmeldung.
 *
 * Unverändert aus dem SequenzBuilder herausgelöst (2026-08-29). Der Typ gilt
 * als Alt-Typ: er bleibt voll bearbeitbar, wird für neue Schritte aber nicht
 * mehr angeboten (siehe lib/schrittTypen, Flag `legacy`). Für neue Aufgaben
 * ist entweder ein Katalogformat oder die offene Aufgabe die bessere Wahl.
 */
export default function FreitextSchrittEditor({ schritt, onChange }) {
  const auf = schritt.aufgabe || {};
  const setAuf = (field, val) => onChange({ ...schritt, aufgabe: { ...auf, [field]: val } });
  const checkboxId = `input_erforderlich_${schritt.id || 'neu'}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Aufgabenstellung</Label>
        <Textarea
          value={auf.aufgabenstellung || ''}
          onChange={(e) => setAuf('aufgabenstellung', e.target.value)}
          placeholder="Was sollen die Schüler in diesem Schritt tun?"
          className="min-h-[120px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={checkboxId}
          checked={auf.input_erforderlich !== false}
          onChange={(e) => setAuf('input_erforderlich', e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <Label htmlFor={checkboxId} className="text-sm cursor-pointer">
          Schüler muss eine Texteingabe machen
        </Label>
      </div>

      <div className="space-y-2">
        <Label>Rückmeldung nach der Abgabe</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuf('feedback_modus', 'musterloesung')}
            className={cn(
              'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
              auf.feedback_modus !== 'ki'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
            )}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Musterlösung anzeigen
          </button>
          <button
            type="button"
            onClick={() => setAuf('feedback_modus', 'ki')}
            className={cn(
              'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
              auf.feedback_modus === 'ki'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
            )}
          >
            <Bot className="w-4 h-4 shrink-0" />
            KI-Rückmeldung
          </button>
        </div>
        {auf.feedback_modus === 'ki' && (
          <p className="text-xs text-muted-foreground bg-violet-50 border border-violet-100 rounded-md px-3 py-2">
            Die KI bewertet die Schülerantwort einmalig anhand der Musterlösung und gibt eine kurze qualitative Rückmeldung. Kein Chat.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          {auf.feedback_modus === 'ki'
            ? 'Musterlösung (Grundlage für die KI-Bewertung – nicht direkt sichtbar für Schüler)'
            : 'Musterlösung (optional – wird dem Schüler nach Abgabe angezeigt)'}
        </Label>
        <Textarea
          value={auf.musterloesung || ''}
          onChange={(e) => setAuf('musterloesung', e.target.value)}
          placeholder={
            auf.feedback_modus === 'ki'
              ? 'Erwartete Antwort / Kernaspekte, auf deren Grundlage die KI bewertet …'
              : 'Was wäre die richtige Antwort? Leer lassen, wenn keine Musterlösung nötig ist.'
          }
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}
