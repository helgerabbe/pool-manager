import React, { useState } from 'react';
import { z } from 'zod';
import PublishTaskButton from '@/components/aufgaben/PublishTaskButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

/**
 * AufgabePublishExample.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Integrations-Beispiel für PublishTaskButton in einem Aufgaben-Formular.
 * 
 * Zeigt:
 * - Zod-Schemas mit Validierungsregeln
 * - State-Verwaltung für Master & Klon-Aufgaben
 * - PublishTaskButton mit exakten Props (item, itemType, schema, onSuccess)
 * - Validierungs-Feedback für bessere UX
 */

// ─────────────────────────────────────────────────────────────────────────────
// Zod-Schemas für verschiedene Aufgabentypen
// ─────────────────────────────────────────────────────────────────────────────

export const LinkaufgabeSchema = z.object({
  titel: z.string().min(3, 'Titel: mindestens 3 Zeichen'),
  aufgabenstellung: z.string().min(10, 'Aufgabenstellung: mindestens 10 Zeichen'),
  anleitung_url: z.string().url('Gültige URL erforderlich'),
  schwierigkeitsgrad: z.enum(['1', '2', '3']).optional(),
});

export const TextaufgabeSchema = z.object({
  titel: z.string().min(3, 'Titel: mindestens 3 Zeichen'),
  aufgabenstellung: z.string().min(10, 'Aufgabenstellung: mindestens 10 Zeichen'),
  loesungshinweise: z.string().min(5, 'Lösungshinweise: mindestens 5 Zeichen'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Komponente
// ─────────────────────────────────────────────────────────────────────────────

export default function AufgabePublishExample({
  initialData = {},
  taskId,
  itemType = 'klon',
  schema = LinkaufgabeSchema,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    id: initialData.id || taskId,
    titel: initialData.titel || '',
    aufgabenstellung: initialData.aufgabenstellung || '',
    anleitung_url: initialData.anleitung_url || '',
    loesungshinweise: initialData.loesungshinweise || '',
    schwierigkeitsgrad: initialData.schwierigkeitsgrad || '',
    content_status: initialData.content_status || 'draft',
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
  // Validierungs-Feedback
  // ─────────────────────────────────────────────────────────────────────────

  const validateField = (field) => {
    try {
      const validation = schema.pick({ [field]: true }).safeParse({
        [field]: formData[field],
      });
      return validation.success;
    } catch {
      return true; // Fallback für Fields nicht im Schema
    }
  };

  const isFullyValid = schema.safeParse(formData).success;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {itemType === 'master' ? 'Master-Aufgabe' : 'Aufgaben-Klon'} erstellen/bearbeiten
            </CardTitle>
            <CardDescription>
              Fülle die erforderlichen Felder aus. Bei der Freigabe können fehlende Felder mit
              Platzhaltern gefüllt werden.
            </CardDescription>
          </div>
          <Badge variant={isFullyValid ? 'default' : 'outline'}>
            {isFullyValid ? '✅ Valid' : '⚠️ Unvollständig'}
          </Badge>
        </div>
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
            className={!validateField('titel') && formData.titel ? 'border-red-300' : ''}
          />
          {!validateField('titel') && formData.titel && (
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
            className={!validateField('aufgabenstellung') && formData.aufgabenstellung ? 'border-red-300' : ''}
            rows={5}
          />
          {!validateField('aufgabenstellung') && formData.aufgabenstellung && (
            <p className="text-xs text-red-600">Mindestens 10 Zeichen erforderlich</p>
          )}
        </div>

        {/* Anleitung URL (wird bei Fallback mit Platzhalter gefüllt) */}
        <div className="space-y-2">
          <Label htmlFor="anleitung_url">
            Anleitung (URL) <span className="text-red-600">*</span>
          </Label>
          <Input
            id="anleitung_url"
            placeholder="https://example.com/anleitung"
            value={formData.anleitung_url}
            onChange={(e) => handleChange('anleitung_url', e.target.value)}
            className={!validateField('anleitung_url') && formData.anleitung_url ? 'border-red-300' : ''}
          />
          {!validateField('anleitung_url') && formData.anleitung_url && (
            <p className="text-xs text-red-600">Gültige URL erforderlich (z.B. https://...)</p>
          )}
          <p className="text-xs text-muted-foreground">
            Falls leer: Bei Fallback-Freigabe wird automatisch mit Platzhalter gefüllt.
          </p>
        </div>

        {/* Lösungshinweise (Optional, zeige nur bei TextaufgabeSchema) */}
        {schema === TextaufgabeSchema && (
          <div className="space-y-2">
            <Label htmlFor="loesungshinweise">
              Lösungshinweise <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="loesungshinweise"
              placeholder="Hinweise für Lehrende..."
              value={formData.loesungshinweise}
              onChange={(e) => handleChange('loesungshinweise', e.target.value)}
              rows={3}
              className={!validateField('loesungshinweise') && formData.loesungshinweise ? 'border-red-300' : ''}
            />
            {!validateField('loesungshinweise') && formData.loesungshinweise && (
              <p className="text-xs text-red-600">Mindestens 5 Zeichen erforderlich</p>
            )}
          </div>
        )}

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

        {/* Validierungs-Info Box */}
        <div className={`p-3 rounded-lg border ${
          isFullyValid
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400'
        } text-xs`}>
          <p className="font-semibold">
            {isFullyValid ? '✅ Validierungsstatus: Alle Pflichtfelder gefüllt' : '⚠️ Hinweis'}
          </p>
          <p className="mt-1">
            {isFullyValid
              ? 'Die Aufgabe kann direkt freigegeben werden. Bei Klick auf "Für Export freigeben" wird sofort content_status = "approved" gesetzt.'
              : 'Pflichtfelder sind noch nicht vollständig gefüllt. Die Freigabe ist trotzdem möglich — fehlende Felder werden dann mit Platzhaltern automatisch befüllt.'}
          </p>
        </div>

        {/* PublishTaskButton Integration */}
        <div className="pt-4 border-t space-y-3">
          <PublishTaskButton
            item={formData}
            itemType={itemType}
            schema={schema}
            onSuccess={() => {
              onSuccess?.(formData);
              // Optional: Formular zurücksetzen
            }}
            className="w-full"
          />

          {/* Erklär-Block für Nutzer */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
            <p className="font-semibold">🚀 Wie funktioniert die Freigabe?</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>
                <strong>Klick</strong> auf "Für Export freigeben"
              </li>
              <li>
                <strong>Validierung:</strong> Wenn alle Pflichtfelder ausgefüllt → direkt
                freigegeben
              </li>
              <li>
                <strong>Fehlende Felder:</strong> Modal zeigt, welche Felder fehlen. Wähle
                "Trotzdem freigeben"
              </li>
              <li>
                <strong>Auto-Fill:</strong> Leere Felder werden mit Platzhaltern gefüllt
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>URLs → <code className="bg-slate-100 dark:bg-slate-800 px-1">https://www.link-folgt.de</code></li>
                  <li>Text → <code className="bg-slate-100 dark:bg-slate-800 px-1">[Information wird noch ergänzt]</code></li>
                </ul>
              </li>
              <li>
                <strong>Speichern:</strong> Aufgabe wird mit <code className="bg-slate-100 dark:bg-slate-800 px-1">content_status: 'approved'</code> gespeichert
              </li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}