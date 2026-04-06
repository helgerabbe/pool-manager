/**
 * SortingListGeneratorModal.jsx
 *
 * Modal zur KI-gestützten Generierung von Sortierlisten.
 * Der Nutzer gibt ein Thema und ein Sortierkriterium ein.
 * Die KI generiert eine korrekt sortierte Liste.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SortingListGeneratorModal({ open, onClose, onGenerate }) {
  const [topic, setTopic] = useState('');
  const [criterion, setCriterion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim() || !criterion.trim()) {
      toast.error('Bitte geben Sie Thema und Sortierkriterium ein.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Pädagoge und generierst Sortierlisten für Schüleraufgaben.

Generiere eine Sortierliste mit folgenden Parametern:
- Thema: ${topic}
- Sortierkriterium: ${criterion}

Anforderungen:
1. Generiere 5-8 Listenelemente zum gegebenen Thema.
2. Die Elemente MÜSSEN bereits in der korrekten Reihenfolge (von Index 0 bis n) sortiert sein.
3. Jedes Element sollte kurz (3-10 Wörter) sein.
4. Nutze altersgerechte und ansprechende Formulierungen.
5. Gib AUSSCHLIESSLICH ein JSON-Array von Strings zurück, nichts anderes.

Beispiel-Output:
["Element 1", "Element 2", "Element 3"]`,
        response_json_schema: {
          type: 'array',
          items: { type: 'string' },
        },
      });

      const items = response.data;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Ungültiges KI-Format');
      }

      onGenerate(items);
      setTopic('');
      setCriterion('');
    } catch (err) {
      toast.error('Fehler bei KI-Generierung: ' + (err.message || 'Unbekannt'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sortierliste generieren</DialogTitle>
          <DialogDescription>
            Geben Sie ein Thema und ein Sortierkriterium ein. Die KI generiert daraus eine korrekt sortierte Liste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic" className="text-sm font-medium">
              Thema
            </Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Biologische Phasen, Geschichtliche Ereignisse"
              className="text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="criterion" className="text-sm font-medium">
              Sortierkriterium
            </Label>
            <Input
              id="criterion"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              placeholder="z.B. chronologisch, logisch, größer → kleiner"
              className="text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading} className="gap-1.5">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isLoading ? 'Generiere…' : 'Generieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}