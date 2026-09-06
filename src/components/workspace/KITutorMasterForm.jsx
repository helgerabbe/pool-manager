/**
 * KITutorMasterForm.jsx
 *
 * Typspezifisches Formular für "KI-Tutor-Aufgabe" Masteraufgaben.
 * Enthält: Aufgabenstellung, Material-Upload, Erwartungshorizont + KI-Assistent
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Save, Upload, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import BildEinfuegenFeld from '@/components/workspace/BildEinfuegenFeld';

export default function KITutorMasterForm({
  master,
  isInEditMode,
  userEmail,
  einheitId,
  catalogEntry,
  onSaved = null,
}) {
  const queryClient = useQueryClient();
  const [aufgabenstellung, setAufgabenstellung] = useState(master?.field_values?.aufgabenstellung || '');
  const [material, setMaterial] = useState(master?.field_values?.material || '');
  const [bildUrl, setBildUrl] = useState(master?.field_values?.bild_url || '');
  const [erwartungshorizont, setErwartungshorizont] = useState(master?.field_values?.erwartungshorizont || '');
  // Brian-URL: Adresse des Gesprächs in Brian.study. Wird beim Übertragen im
  // Export-Center automatisch gesetzt, kann hier aber auch von Hand gepflegt
  // werden. Sie ist der Nachweis, dass die Aufgabe in Brian existiert, und
  // wandert mit den field_values in den Export.
  const [brianUrl, setBrianUrl] = useState(master?.field_values?.brian_url || '');
  const [isDirty, setIsDirty] = useState(false);

  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiPromptPreview, setAiPromptPreview] = useState(null);

  const handleFieldChange = (field, value) => {
    if (field === 'aufgabenstellung') setAufgabenstellung(value);
    if (field === 'material') setMaterial(value);
    if (field === 'erwartungshorizont') setErwartungshorizont(value);
    setIsDirty(true);
  };

  // Speichern der Master-Aufgabe + Hidden Prompt generieren
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Generiere den Hidden Tutor-Prompt im Backend
      const promptResult = await base44.functions.invoke('generateTutorPrompt', {
        masterId: master.id,
      });

      const tutorPrompt = promptResult?.data?.tutorPrompt || '';

      // 2. Speichere die Aufgabe mit Hidden Prompt
      return base44.entities.MasterAufgabe.update(master.id, {
        field_values: {
          // Bestehende Werte erhalten — hier liegt auch der Brian-Nachweis
          // (brian_url, brian_sync_status …), der nicht verloren gehen darf.
          ...(master.field_values || {}),
          aufgabenstellung,
          material,
          bild_url: bildUrl,
          erwartungshorizont,
          brian_url: brianUrl.trim(),
        },
        tutor_prompt: tutorPrompt, // Hidden Prompt für Moodle-Export
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setIsDirty(false);
      toast.success('KI-Tutor-Aufgabe gespeichert (Hidden Prompt generiert).');
      onSaved?.();
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  // KI-Assistent: Erwartungshorizont generieren
  const generateExpectationMutation = useMutation({
    mutationFn: async () => {
      if (!aufgabenstellung.trim()) {
        throw new Error('Bitte geben Sie zuerst eine Aufgabenstellung ein.');
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Lehrer und Prüfer. Deine Aufgabe ist es, eine genaue Musterlösung und Lösungskriterien für eine Schüleraufgabe zu verfassen.

Aufgabenstellung:
"${aufgabenstellung}"

${material ? `Begleitmaterial/Kontext: ${material}` : ''}

Schreibe einen Erwartungshorizont, der folgende Punkte enthält:

1. MUSTERLÖSUNG / ERWARTETE ANTWORT
   - Gib die konkrete richtige Lösung oder die erwarteten Lösungen an
   - Sei spezifisch und präzise
   
2. LÖSUNGSSCHRITTE (falls zutreffend)
   - Wie kommt man zu dieser Lösung?
   - Welche Rechenschritte, Argumente oder Begründungen sind notwendig?

3. AKZEPTABLE VARIANTEN (falls mehrere richtige Antworten möglich)
   - Welche alternativen Antworten sind auch akzeptabel?
   - Unter welchen Bedingungen werden sie akzeptiert?

4. HÄUFIGE FEHLER & FEHLINTERPRETATIONEN
   - Welche typischen Fehler machen Schüler?
   - Welche Missverständnisse könnten vorliegen?

5. BEWERTUNGSKRITERIEN
   - Wie viele Punkte für vollständig richtig?
   - Wie viele Punkte für teilweise richtig?
   - Wann gibt es Punktabzug?

Fokus: Die konkrete, richtige Lösung dieser Aufgabe - nicht allgemeine pädagogische Ratschläge.`,
        response_json_schema: {
          type: 'object',
          properties: {
            erwartungshorizont: { type: 'string' },
          },
          required: ['erwartungshorizont'],
        },
      });

      return result.erwartungshorizont;
    },
    onSuccess: (text) => {
      setAiPromptPreview(text);
      toast.success('Erwartungshorizont generiert. Bitte überprüfen und übernehmen.');
    },
    onError: (err) => toast.error(err.message || 'Fehler bei KI-Generierung.'),
  });

  const handleAcceptAIPrompt = () => {
    setErwartungshorizont(aiPromptPreview);
    setAiPromptPreview(null);
    setIsDirty(true);
  };

  const handleRejectAIPrompt = () => {
    setAiPromptPreview(null);
  };

  const isReadOnly = !isInEditMode;

  return (
    <div className="space-y-5">
      {/* ── Aufgabenstellung (Pflichtfeld) ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Aufgabenstellung
          {!isReadOnly && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Textarea
          value={aufgabenstellung}
          onChange={(e) => handleFieldChange('aufgabenstellung', e.target.value)}
          placeholder="Geben Sie die Aufgabenstellung ein, die der Schüler bearbeiten soll..."
          rows={5}
          className="resize-none text-sm"
          disabled={isReadOnly}
        />
        {isReadOnly && (
          <p className="text-xs text-muted-foreground italic">
            Bearbeitungsmodus aktivieren um Änderungen vorzunehmen.
          </p>
        )}
      </div>

      {/* ── Bild zur Aufgabe (z. B. Tabelle per Copy & Paste) ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Bild zur Aufgabe <span className="text-muted-foreground font-normal">(optional, z. B. Tabelle)</span>
        </Label>
        <BildEinfuegenFeld
          value={bildUrl}
          onChange={(url) => { setBildUrl(url); setIsDirty(true); }}
          disabled={isReadOnly}
        />
      </div>

      {/* ── Begleitmaterial ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Begleitmaterial <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          value={material}
          onChange={(e) => handleFieldChange('material', e.target.value)}
          placeholder="z.B. Link zu PDF, Bildtext, Literaturverweis, etc."
          rows={3}
          className="resize-none text-sm"
          disabled={isReadOnly}
        />
      </div>

      {/* ── Musterlösung / Erwartungshorizont ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Musterlösung <span className="text-muted-foreground font-normal">(Erwartungshorizont)</span>
          </Label>
          {!isReadOnly && aufgabenstellung.trim() && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateExpectationMutation.mutate()}
              disabled={generateExpectationMutation.isPending}
              className="gap-1.5 text-xs h-7 border-primary/40 text-primary hover:bg-primary/5"
            >
              {generateExpectationMutation.isPending
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Generiere…</>
                : <><Sparkles className="w-3 h-3" /> KI: Generieren</>}
            </Button>
          )}
        </div>

        {/* KI-Vorschau */}
        {aiPromptPreview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">KI-Vorschlag:</p>
            <div className="bg-white rounded border border-amber-100 p-2.5 text-sm text-foreground max-h-40 overflow-y-auto">
              {aiPromptPreview}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                onClick={handleAcceptAIPrompt}
                className="gap-1.5 text-xs h-7"
              >
                Übernehmen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectAIPrompt}
                className="gap-1.5 text-xs h-7"
              >
                Ablehnen
              </Button>
            </div>
          </div>
        )}

        {/* Eingabefeld */}
        <Textarea
          value={erwartungshorizont}
          onChange={(e) => handleFieldChange('erwartungshorizont', e.target.value)}
          placeholder="Geben Sie die erwartete Musterlösung ein: Was ist die richtige Antwort? Welche Lösungsschritte sind erforderlich? Welche Kriterien für Teilpunkte?"
          rows={6}
          className="resize-none text-sm"
          disabled={isReadOnly}
        />
      </div>

      {/* ── Brian-URL (Nachweis, dass das Gespräch in Brian existiert) ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Brian-URL des Gesprächs</Label>
        <Input
          value={brianUrl}
          onChange={(e) => { setBrianUrl(e.target.value); setIsDirty(true); }}
          placeholder="https://brian.study/…"
          disabled={isReadOnly}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Diese Adresse erhalten die Schüler. Sie wird beim Bestätigen der Übertragung im Export-Center
          automatisch eingetragen.
        </p>
        {brianUrl.trim() && (
          <a
            href={brianUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline"
          >
            Gespräch in Brian öffnen <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* ── Speichern-Button ── */}
      {!isReadOnly && isDirty && (
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !aufgabenstellung.trim()}
          className="gap-1.5 w-full"
        >
          {saveMutation.isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichern…</>
            : <><Save className="w-3.5 h-3.5" /> Speichern</>}
        </Button>
      )}
    </div>
  );
}