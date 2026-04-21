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
      // Backend-Funktion mit robustem JSON-Parsing
      const response = await base44.functions.invoke('generateSortingList', {
        thema: topic.trim(),
        kriterium: criterion.trim(),
      });

      const items = response.data?.items;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error(response.data?.error || 'KI hat keine gültige Liste generiert');
      }

      // Limit auf 12 Elemente (wie im Editor vereinbart)
      const limitedItems = items.slice(0, 12);

      onGenerate(limitedItems);
      setTopic('');
      setCriterion('');
      toast.success(`${limitedItems.length} Elemente generiert.`);
    } catch (err) {
      console.error('generateSortingList error:', err);
      toast.error('Fehler bei KI-Generierung: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95%] sm:max-w-md">
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