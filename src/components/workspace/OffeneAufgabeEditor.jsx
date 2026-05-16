/**
 * OffeneAufgabeEditor.jsx
 *
 * Editor für die Aktivität "Offene Aufgabe".
 * Datenmodell: { description: String }
 * Nutzt State-Lifting via onChange für parent-Synchronisation.
 * Integriert Web Speech API für iterativen KI-Assistenten mit Spracheingabe.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

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
      const digitalSingleLearnerRules = `
WICHTIGE RAHMENBEDINGUNGEN:
- Es geht IMMER um eine rein digitale Aufgabe, die ein einzelner Schüler / eine einzelne Schülerin alleine am Computer bearbeitet.
- Keine Gruppenarbeit, keine Partnerarbeit, keine Diskussionen, keine Rückfragen an Lehrkraft, Lerncoach oder Mitschüler:innen.
- Keine echten Materialien, kein Basteln, kein Ausdrucken, kein Verhalten im realen Raum, keine Beobachtung im Klassenzimmer.
- Beschreibe nur das, was später digital auf dem Bildschirm passiert: ansehen, lesen, anklicken, markieren, auswählen, schreiben, zuordnen, vergleichen oder abgeben.
- Wenn Bilder, Texte, Fehler, Gegenstände oder Situationen genannt werden, sind sie digitale Inhalte innerhalb der Aufgabe.
- Erfinde keine neuen Inhalte oder falschen Rahmenhandlungen. Präzisiere nur die vorhandene Idee.
- Formuliere direkt als umsetzbare Aufgabenbeschreibung für die digitale Lernplattform.
`.trim();

      const prompts = {
        refine: `${digitalSingleLearnerRules}\n\nVerfeinere die folgende Aufgabenidee zu einer klaren, kurzen und gut umsetzbaren digitalen Einzelaufgabe. Beschreibe konkret, was der einzelne Schüler am Computer sieht und was er dort tun soll.\n\nAktueller Text:\n${description}`,
        structure: `${digitalSingleLearnerRules}\n\nStrukturiere die folgende Aufgabenidee in eine digitale Einzelaufgabe mit diesen Abschnitten:\n1. Ziel der Aufgabe\n2. Bildschirm-Inhalte / digitale Materialien\n3. Arbeitsauftrag für den einzelnen Schüler\n4. Digitale Interaktion (z.B. anklicken, markieren, auswählen, schreiben, zuordnen)\n5. Erwartetes Ergebnis\n\nAktueller Text:\n${description}`,
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
    <div className="space-y-4">
      {/* KI-Assistent Bereich mit Spracherkennung */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900">KI-Assistent für Aufgabenbeschreibungen</h3>
            <p className="text-xs text-indigo-700 mt-1">
              Sprich deine Idee bis zu 60 Sekunden ein. Der erkannte Text erscheint direkt unten in der Aufgabenbeschreibung.
            </p>
          </div>
        </div>

        <SpeechInputButton
          value={description}
          onResult={setDescription}
          disabled={isGenerating}
          maxSeconds={60}
          label="Idee einsprechen"
          listeningLabel="Aufnahme stoppen"
        />
      </div>

      {/* Haupttextfeld */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Aufgabenbeschreibung (Finaler Text)</Label>
          <span className="text-xs text-muted-foreground">{description.length} Zeichen</span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Hier erscheint die KI-generierte Aufgabe, oder schreibe sie manuell..."
          className="min-h-[160px] resize-none"
        />
      </div>

      {/* Manuelle KI-Assistent Buttons */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KI-Optionen</Label>
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
      </div>
    </div>
  );
}