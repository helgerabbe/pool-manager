/**
 * SortingListGeneratorModal.jsx
 *
 * Modal zur KI-gestützten Generierung von Sortierlisten.
 * Schritt 1: Thema + Kriterium eingeben → Generieren
 * Schritt 2: Vorschau der generierten Liste → Übernehmen oder Verwerfen
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
import { Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function SortingListGeneratorModal({ open, onClose, onGenerate }) {
  const [topic, setTopic] = useState('');
  const [criterion, setCriterion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedItems, setGeneratedItems] = useState(null); // null = Schritt 1, Array = Schritt 2
  const [error, setError] = useState(null);

  const handleClose = () => {
    setTopic('');
    setCriterion('');
    setGeneratedItems(null);
    setError(null);
    onClose();
  };

  const handleGenerate = async () => {
    if (!topic.trim() || !criterion.trim()) {
      toast.error('Bitte geben Sie Thema und Sortierkriterium ein.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('generateSortingList', {
        thema: topic.trim(),
        kriterium: criterion.trim(),
      });

      const items = response.data?.items;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error(response.data?.error || 'Die KI konnte keine gültige Liste generieren.');
      }

      // Max 12 Elemente
      setGeneratedItems(items.slice(0, 12));
    } catch (err) {
      console.error('generateSortingList error:', err);
      setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (!generatedItems) return;
    onGenerate(generatedItems);
    toast.success(`${generatedItems.length} Elemente übernommen.`);
    handleClose();
  };

  const handleRetry = () => {
    setGeneratedItems(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="w-[95%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sortierliste generieren</DialogTitle>
          <DialogDescription>
            {generatedItems
              ? 'Vorschau der generierten Liste – soll diese übernommen werden?'
              : 'Geben Sie ein Thema und ein Sortierkriterium ein. Die KI generiert daraus eine korrekt sortierte Liste.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Schritt 1: Eingabe ── */}
        {!generatedItems && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topic" className="text-sm font-medium">Thema</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="z.B. Jahreszeiten, Biologische Phasen"
                className="text-sm"
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="criterion" className="text-sm font-medium">Sortierkriterium</Label>
              <Input
                id="criterion"
                value={criterion}
                onChange={(e) => setCriterion(e.target.value)}
                placeholder="z.B. Zeitlich, chronologisch, größer → kleiner"
                className="text-sm"
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            {/* Fehlermeldung */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Schritt 2: Vorschau ── */}
        {generatedItems && (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{generatedItems.length} Elemente generiert</span>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {generatedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm">
                  <span className="w-5 text-xs font-semibold text-muted-foreground shrink-0">{idx + 1}.</span>
                  <span className="flex-1">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!generatedItems ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Abbrechen
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading} className="gap-1.5">
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isLoading ? 'Generiere…' : 'Generieren'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRetry} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Neu generieren
              </Button>
              <Button onClick={handleAccept} className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Übernehmen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}