/**
 * MCGeneratorModal.jsx
 *
 * Modal zur KI-gestützten Generierung von Multiple-Choice Fragen-Sets.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MCGeneratorModal({ open, onClose, onGenerate }) {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState('5');
  const [difficulty, setDifficulty] = useState('mittel');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Bitte geben Sie ein Thema ein.');
      return;
    }
    if (!numQuestions || parseInt(numQuestions) < 1) {
      setError('Anzahl der Fragen muss mindestens 1 sein.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const prompt = `Generiere ein Multiple-Choice Fragen-Set mit den folgenden Anforderungen:
- Thema: ${topic}
- Anzahl Fragen: ${numQuestions}
- Schwierigkeitsgrad: ${difficulty}

Für jede Frage:
1. Erstelle eine klare, prägnante Frage
2. Generiere 3-4 Antwortmöglichkeiten
3. Markiere die korrekten Antworten eindeutig

Antworte ausschließlich mit JSON (kein zusätzlicher Text) im folgenden Format:
{
  "mcItems": [
    {
      "question": "Fragentext",
      "options": [
        { "text": "Antwort 1", "isCorrect": true },
        { "text": "Antwort 2", "isCorrect": false },
        { "text": "Antwort 3", "isCorrect": false }
      ]
    }
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            mcItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  options: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' },
                        isCorrect: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const data = response.data;

      if (!data.mcItems || !Array.isArray(data.mcItems)) {
        throw new Error('Ungültiges Antwortformat von der KI');
      }

      // Validiere die generierten Daten
      const validItems = data.mcItems.filter(
        (item) =>
          item.question &&
          item.options &&
          Array.isArray(item.options) &&
          item.options.length >= 2 &&
          item.options.every((o) => o.text && typeof o.isCorrect === 'boolean')
      );

      if (validItems.length === 0) {
        throw new Error('KI konnte keine gültigen Fragen generieren');
      }

      onGenerate(validItems);
      setTopic('');
      setNumQuestions('5');
      setDifficulty('mittel');
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
          <DialogTitle>Multiple-Choice-Set generieren</DialogTitle>
          <DialogDescription>
            Lassen Sie die KI ein Fragen-Set basierend auf Ihrem Thema erstellen.
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
              placeholder="z.B. Der photosynthetische Prozess bei Pflanzen"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Anzahl Fragen</Label>
              <Input
                type="number"
                value={numQuestions}
                onChange={(e) => {
                  setNumQuestions(e.target.value);
                  setError('');
                }}
                min="1"
                max="20"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Schwierigkeitsgrad</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leicht">Leicht</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="schwer">Schwer</SelectItem>
                </SelectContent>
              </Select>
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