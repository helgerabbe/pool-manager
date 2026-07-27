/**
 * components/workspace/lernpaketWizard/WizardBeschreibungEditor.jsx
 *
 * Aufgabeneditor Etappe 3 (2026-07-27): Inline-Editor für die
 * Aufgabenbeschreibung einer Aktivität (Pflicht für die KI-Erstellung).
 * Speichert in ki_briefing.idee — mit Sprach-Eingabe-Unterstützung.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

const MAX_LENGTH = 2000;

export default function WizardBeschreibungEditor({ activity, disabled = false, onDone }) {
  const initial =
    activity.ki_briefing?.idee ||
    activity.ki_briefing?.offen?.funktionsweise ||
    activity.ki_briefing?.offen?.lernziel ||
    '';
  const [text, setText] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Bitte beschreibe, was die Schüler:innen machen sollen.');
      return;
    }
    setIsSaving(true);
    try {
      await base44.entities.LernpaketPhaseAktivitaet.update(activity.id, {
        ki_briefing: { ...(activity.ki_briefing || {}), idee: trimmed },
      });
      toast.success('Aufgabenbeschreibung gespeichert.');
      onDone?.(true);
    } catch (err) {
      console.error('[WizardBeschreibungEditor] save failed', err);
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-border bg-primary/5 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground">
          Aufgabenbeschreibung — was sollen die Schüler:innen machen, was sollen sie daran lernen?
        </p>
        <SpeechInputButton
          value={text}
          onResult={(t) => setText(t.slice(0, MAX_LENGTH))}
          disabled={disabled || isSaving}
          maxSeconds={30}
        />
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={MAX_LENGTH}
        disabled={disabled || isSaving}
        className="resize-none text-xs bg-background"
        placeholder="Beispiel: Die Schüler:innen ordnen 8 Fachbegriffe ihren Definitionen zu, um die Kernbegriffe des Themas zu festigen."
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => onDone?.(false)} disabled={isSaving}>
          Abbrechen
        </Button>
        <Button type="button" size="sm" className="h-7 text-xs gap-1.5" onClick={save} disabled={disabled || isSaving || !text.trim()}>
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Speichern
        </Button>
      </div>
    </div>
  );
}