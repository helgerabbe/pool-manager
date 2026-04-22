/**
 * OffeneAufgabeEditor.jsx
 *
 * Editor für die Aktivität "Offene Aufgabe".
 * Datenmodell: { description: String }
 * Nutzt State-Lifting via onChange für parent-Synchronisation.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function OffeneAufgabeEditor({ initialData = {}, onChange, readOnly = false }) {
  const [description, setDescription] = useState(initialData.description || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // DATENBRÜCKE ZUM MODAL
  useEffect(() => {
    if (onChange) {
      onChange({ description });
    }
  }, [description]);

  const handleRefinement = async (action) => {
    if (!description.trim()) {
      toast.error('Bitte geben Sie zunächst eine Aufgabenbeschreibung ein.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompts = {
        refine: `Verfeinere diese Aufgabenbeschreibung. Mache sie präziser, strukturierter und pädagogisch hilfreicher für Schüler:innen.\n\nAktueller Text:\n${description}`,
        structure: `Strukturiere diese Aufgabenbeschreibung mit folgenden Abschnitten:\n1. Aufgabenstellung (was sollen die Schüler tun?)\n2. Materialien/Ressourcen\n3. Erwartete Ergebnisse\n4. Bewertungskriterien\n\nAktueller Text:\n${description}`,
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[action] || prompts.refine,
      });

      if (result) {
        setDescription(result);
        toast.success(`Aufgabenbeschreibung wurde ${action === 'refine' ? 'verfeinert' : 'strukturiert'}.`);
      }
    } catch (err) {
      toast.error('Fehler bei der KI-Verarbeitung: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenbeschreibung</Label>
        <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed border border-border">
          {description || <span className="text-muted-foreground italic">Keine Beschreibung vorhanden.</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Haupttextfeld */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Aufgabenbeschreibung</Label>
          <span className="text-xs text-muted-foreground">{description.length} Zeichen</span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beschreibe hier die Aufgabe für die Schüler:innen. Z.B. 'Analysiere ein literarisches Werk deiner Wahl unter Berücksichtigung von...' oder 'Führe ein naturwissenschaftliches Experiment durch und dokumentiere deine Beobachtungen.'"
          className="min-h-[240px] resize-vertical"
        />
      </div>

      {/* KI-Assistent Buttons */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KI-Assistent</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefinement('refine')}
            disabled={isGenerating || !description.trim()}
            className="gap-1.5 text-xs"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird verfeinert...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Beschreibung verfeinern</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefinement('structure')}
            disabled={isGenerating || !description.trim()}
            className="gap-1.5 text-xs"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird strukturiert...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Strukturieren</>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/70 italic">Die KI-Werkzeuge verbessern oder strukturieren deine Aufgabenbeschreibung für bessere Klarheit.</p>
      </div>
    </div>
  );
}