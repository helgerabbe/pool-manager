/**
 * QuizGeneratorModal.jsx
 *
 * Modal zur KI-gestützten Generierung von Quiz-Fragen.
 * Nutzt LLM um Fragen + Antwortoptionen automatisch zu erstellen.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuizGeneratorModal({
  open,
  onClose,
  onGenerate,
}) {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Bitte geben Sie ein Thema ein.');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Lehrer und Prüfer. Deine Aufgabe ist es, ${count} Multiple-Choice-Fragen mit Antwortoptionen zu einem bestimmten Thema zu erstellen.

Thema: "${topic}"
${context ? `Zusätzlicher Kontext: ${context}` : ''}

Erstelle genau ${count} Quiz-Fragen im folgenden JSON-Format:
{
  "questions": [
    {
      "question": "Fragetext?",
      "answers": [
        { "text": "Richtige Antwort", "isCorrect": true },
        { "text": "Falsche Antwort 1", "isCorrect": false },
        { "text": "Falsche Antwort 2", "isCorrect": false }
      ]
    }
  ]
}

Anforderungen:
- Jede Frage sollte 3-4 Antwortoptionen haben
- Genau EINE Antwort sollte isCorrect = true sein
- Fragen sollten progrediert in Schwierigkeit aufsteigen
- Nutze hochwertige Fachterminologie
- Antworte NUR mit gültigem JSON, keine weiteren Erklärungen

Gib NUR das JSON-Objekt zurück.`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  answers: {
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

      if (result?.questions && Array.isArray(result.questions)) {
        onGenerate(result.questions);
        setTopic('');
        setContext('');
        setCount(5);
        onClose();
      } else {
        throw new Error('Ungültiges Antwortformat');
      }
    } catch (err) {
      toast.error(err.message || 'Fehler bei der Generierung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Quiz-Fragen generieren</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Die KI erstellt Fragen basierend auf deinem Thema.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thema */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Thema *</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Photosynthese, Römisches Reich, Quantenmechanik"
              disabled={loading}
              className="text-sm"
            />
          </div>

          {/* Kontext (optional) */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Zusätzlicher Kontext (optional)</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="z.B. Schuljahr 10, Fokus auf Biochemie, vereinfachtes Niveau"
              disabled={loading}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Anzahl der Fragen */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Anzahl der Fragen</Label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
              min="1"
              max="12"
              disabled={loading}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">1-12 Fragen</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="gap-2 ml-auto"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generiere…</>
                : 'Generieren'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}