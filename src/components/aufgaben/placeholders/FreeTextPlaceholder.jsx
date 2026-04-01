/**
 * FreeTextPlaceholder.jsx
 *
 * Platzhalter-Komponente für "Freitext" Activity-Type
 */

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function FreeTextPlaceholder({ formData, setFormData, contextData }) {
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
          Aufgabenstellung
        </Label>
        <Textarea
          id="description"
          placeholder="Schreiben Sie die vollständige Aufgabenstellung ein..."
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="h-32 mt-1"
        />
      </div>

      <div>
        <Label htmlFor="solution" className="text-sm font-semibold">
          Erwartungshorizont / Lösungsskizze
        </Label>
        <Textarea
          id="solution"
          placeholder="Wie sieht eine gute Antwort aus? Was sind die Kernpunkte?"
          value={formData.solution || ''}
          onChange={(e) => handleChange('solution', e.target.value)}
          className="h-24 mt-1"
        />
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <p className="font-semibold mb-1">ℹ️ Hinweis</p>
        <p>Die KI wird Ihre Masteraufgabe verwenden, um thematisch äquivalente Varianten zu generieren.</p>
      </div>
    </div>
  );
}