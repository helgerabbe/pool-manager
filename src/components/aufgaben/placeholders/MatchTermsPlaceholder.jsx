/**
 * MatchTermsPlaceholder.jsx
 *
 * Platzhalter-Komponente für "Begriffe zuordnen" Activity-Type
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function MatchTermsPlaceholder({ formData, setFormData, contextData }) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="description" className="text-sm font-semibold">
          Aufgabenbeschreibung
        </Label>
        <Textarea
          id="description"
          placeholder="Beschreiben Sie die Begriffe-Zuordnung (z.B. Historische Ereignisse mit Daten verbinden)..."
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="h-24 mt-1"
        />
      </div>

      <div>
        <Label htmlFor="solution" className="text-sm font-semibold">
          Lösungsskizze
        </Label>
        <Textarea
          id="solution"
          placeholder="Wie soll die Lösung aussehen? (Beispiel: 1492 → Kolumbus' Entdeckungsfahrt)"
          value={formData.solution || ''}
          onChange={(e) => handleChange('solution', e.target.value)}
          className="h-20 mt-1"
        />
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <p className="font-semibold mb-1">ℹ️ Hinweis</p>
        <p>Die KI wird basierend auf dieser Masteraufgabe didaktisch gleichwertige Varianten generieren.</p>
      </div>
    </div>
  );
}