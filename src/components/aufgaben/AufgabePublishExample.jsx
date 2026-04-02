import React, { useState } from 'react';
import { z } from 'zod';
import PublishTaskButton from '@/components/aufgaben/PublishTaskButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

/**
 * AufgabePublishExample.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Beispiel: Wie man PublishTaskButton in einem Aufgaben-Formular integriert.
 * 
 * Zeigt:
 * - Zod-Schema Definition für Validierung
 * - Lokalen State für Formular-Daten
 * - PublishTaskButton mit allen Props
 */

// ─────────────────────────────────────────────────────────────────────────────
// Zod-Schema für eine beispielhafte Aufgabe
// ─────────────────────────────────────────────────────────────────────────────

export const AufgabenschemaExample = z.object({
  titel: z.string().min(3, 'Mindestens 3 Zeichen erforderlich'),
  aufgabenstellung: z.string().min(10, 'Aufgabenstellung muss mindestens 10 Zeichen lang sein'),
  anleitung_url: z.string().url('Gültige URL erforderlich').optional().or(z.literal('')),
  loesungshinweise: z.string().optional(),
  schwierigkeitsgrad: z.enum(['1', '2', '3']).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Komponente
// ─────────────────────────────────────────────────────────────────────────────

export default function AufgabePublishExample({ initialData = {}, taskId, onSaved }) {
  const [formData, setFormData] = useState({
    titel: initialData.titel || '',
    aufgabenstellung: initialData.aufgabenstellung || '',
    anleitung_url: initialData.anleitung_url || '',
    loesungshinweise: initialData.loesungshinweise || '',
    schwierigkeitsgrad: initialData.schwierigkeitsgrad || '',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Handler: Formular-Änderungen
  // ─────────────────────────────────────────────────────────────────────────

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Validierungs-Feedback für bessere UX
  // ─────────────────────────────────────────────────────────────────────────

  const validateField = (field) => {
    const validation = AufgabenschemaExample.pick({ [field]: true }).safeParse({
      [field]: formData[field],
    });
    return validation.success;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Aufgabe erstellen/bearbeiten</CardTitle>
        <CardDescription>
          Fülle die erforderlichen Felder aus. Bei der Freigabe können fehlende Felder mit
          Platzhaltern gefüllt werden.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Titel */}
        <div className="space-y-2">
          <Label htmlFor="titel">
            Titel <span className="text-red-600">*</span>
          </Label>
          <Input
            id="titel"
            placeholder="z.B. 'Grundrechenarten üben'"
            value={formData.titel}
            onChange={(e) => handleChange('titel', e.target.value)}
            className={!validateField('titel') ? 'border-red-300' : ''}
          />
          {!validateField('titel') && (
            <p className="text-xs text-red-600">Mindestens 3 Zeichen erforderlich</p>
          )}
        </div>

        {/* Aufgabenstellung */}
        <div className="space-y-2">
          <Label htmlFor="aufgabenstellung">
            Aufgabenstellung <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="aufgabenstellung"
            placeholder="Beschreibe die Aufgabe detailliert..."
            value={formData.aufgabenstellung}
            onChange={(e) => handleChange('aufgabenstellung', e.target.value)}
            className={!validateField('aufgabenstellung') ? 'border-red-300' : ''}
            rows={5}
          />
          {!validateField('aufgabenstellung') && (
            <p className="text-xs text-red-600">Mindestens 10 Zeichen erforderlich</p>
          )}
        </div>

        {/* Anleitung URL (Optional, aber wird bei Fallback gefüllt) */}
        <div className="space-y-2">
          <Label htmlFor="anleitung_url">Anleitung (URL)</Label>
          <Input
            id="anleitung_url"
            placeholder="https://example.com/anleitung"
            value={formData.anleitung_url}
            onChange={(e) => handleChange('anleitung_url', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional. Falls leer, wird bei Fallback-Freigabe mit Platzhalter gefüllt.
          </p>
        </div>

        {/* Lösungshinweise (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="loesungshinweise">Lösungshinweise</Label>
          <Textarea
            id="loesungshinweise"
            placeholder="Hinweise für Lehrende..."
            value={formData.loesungshinweise}
            onChange={(e) => handleChange('loesungshinweise', e.target.value)}
            rows={3}
          />
        </div>

        {/* Schwierigkeitsgrad (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="schwierigkeitsgrad">Schwierigkeitsgrad</Label>
          <select
            id="schwierigkeitsgrad"
            value={formData.schwierigkeitsgrad}
            onChange={(e) => handleChange('schwierigkeitsgrad', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base"
          >
            <option value="">Wählen...</option>
            <option value="1">1 - Leicht</option>
            <option value="2">2 - Mittel</option>
            <option value="3">3 - Schwer</option>
          </select>
        </div>

        {/* Hinweis-Box: Validierungsstatus */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-400">
          <p className="font-semibold">ℹ️ Validierungsstatus:</p>
          <p className="mt-1">
            {validateField('titel') && validateField('aufgabenstellung')
              ? '✅ Alle Pflichtfelder gefüllt. Freigabe ist direkt möglich.'
              : '⚠️ Pflichtfelder fehlen oder sind ungültig. Bei Freigabe wird ein Fallback-Dialog angezeigt.'}
          </p>
        </div>

        {/* PublishTaskButton Integration */}
        <div className="pt-4 border-t">
          <PublishTaskButton
            taskData={formData}
            taskId={taskId}
            entityType="Aufgabenbausteine"
            schema={AufgabenschemaExample}
            onPublish={() => {
              onSaved?.(formData);
              // Optional: Formular zurücksetzen oder navigieren
            }}
          />
        </div>

        {/* Info-Block für Nutzer */}
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-400">
          <p className="font-semibold">🚀 Freigabe-Prozess:</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Klick auf "🚀 Aufgabe für Export freigeben"</li>
            <li>Wenn valid: Direkt freigegeben mit content_status = 'approved'</li>
            <li>
              Wenn invalid: Modal zeigt fehlende Felder.
              <br />
              Wähle "Trotzdem freigeben" → Fallbacks werden injiziert
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}