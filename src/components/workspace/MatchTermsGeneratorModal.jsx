/**
 * MatchTermsGeneratorModal.jsx
 *
 * Modal zur KI-gestützten Generierung von Zuordnungspaaren und Distraktoren.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MatchTermsGeneratorModal({ open, onClose, onGenerate }) {
  const [topic, setTopic] = useState('');
  const [numPairs, setNumPairs] = useState('5');
  const [numDistractors, setNumDistractors] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Bitte geben Sie ein Thema ein.');
      return;
    }
    if (!numPairs || parseInt(numPairs) < 1) {
      setError('Anzahl der Paare muss mindestens 1 sein.');
      return;
    }
    if (!numDistractors || parseInt(numDistractors) < 0) {
      setError('Anzahl der Distraktoren darf nicht negativ sein.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const prompt = `Generiere Zuordnungspaare und Distraktoren mit den folgenden Anforderungen:
- Thema: ${topic}
- Anzahl Zuordnungspaare: ${numPairs}
- Anzahl Distraktoren (falsche Antworten): ${numDistractors}

Für die Zuordnungspaare:
1. Generiere ${numPairs} logische, korrekte Paarungen
2. Jedes Paar besteht aus "Begriff/Frage (links)" und "Antwort/Definition (rechts)"

Für Distraktoren:
1. Generiere ${numDistractors} plausible, aber FALSCHE Antwortmöglichkeiten
2. Diese sollten zum Thema passen, aber nicht zu den linken Begriffen passt

Antworte ausschließlich mit JSON (kein zusätzlicher Text) im folgenden Format:
{
  "pairs": [
    { "left": "Begriff 1", "right": "Antwort 1" },
    { "left": "Begriff 2", "right": "Antwort 2" }
  ],
  "distractors": ["Falschantwort 1", "Falschantwort 2", "Falschantwort 3"]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  left: { type: 'string' },
                  right: { type: 'string' },
                },
              },
            },
            distractors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      });

      const data = response.data;

      if (!data.pairs || !Array.isArray(data.pairs)) {
        throw new Error('Ungültiges Antwortformat: pairs nicht gefunden');
      }

      // Validiere die generierten Paare
      const validPairs = data.pairs.filter(
        (p) => p.left && p.right && typeof p.left === 'string' && typeof p.right === 'string'
      );

      if (validPairs.length === 0) {
        throw new Error('KI konnte keine gültigen Paare generieren');
      }

      // Validiere Distraktoren
      const validDistractors = (data.distractors || [])
        .filter((d) => d && typeof d === 'string')
        .map((d) => d.trim())
        .filter(Boolean);

      onGenerate({
        pairs: validPairs,
        distractors: validDistractors,
      });

      setTopic('');
      setNumPairs('5');
      setNumDistractors('3');
      onClose();
    } catch (err) {
      setError(err.message || 'Fehler bei der Generierung');
      toast.error('Generierung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95%] max-w-md flex flex-col max-h-[90dvh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Zuordnungspaare generieren</DialogTitle>
          <DialogDescription>
            Lassen Sie die KI korrekte Paare und Distraktoren zu Ihrem Thema erstellen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Thema *</Label>
            <Textarea
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setError('');
              }}
              placeholder="z.B. Hauptstädte Europas, Photosynthese, Deutsche Verben"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Anzahl Paare</Label>
              <Input
                type="number"
                value={numPairs}
                onChange={(e) => {
                  setNumPairs(e.target.value);
                  setError('');
                }}
                min="1"
                max="20"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Distraktoren</Label>
              <Input
                type="number"
                value={numDistractors}
                onChange={(e) => {
                  setNumDistractors(e.target.value);
                  setError('');
                }}
                min="0"
                max="10"
                className="text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading} className="gap-1.5">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Wird generiert...' : 'Generieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}