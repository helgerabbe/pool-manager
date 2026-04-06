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
import { Sparkles, Loader2, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [erwartungshorizont, setErwartungshorizont] = useState(master?.field_values?.erwartungshorizont || '');
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
          aufgabenstellung,
          material,
          erwartungshorizont,
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
        prompt: `Du bist ein erfahrener Lehrer und Prüfer. Deine Aufgabe ist es, auf Basis einer Schüleraufgabe einen detaillierten Erwartungshorizont (Lösungsschlüssel) zu schreiben.

Aufgabenstellung:
"${aufgabenstellung}"

${material ? `Begleitmaterial/Kontext: ${material}` : ''}

Schreibe einen präzisen Erwartungshorizont, der folgende Punkte enthält:
1. Lösungsweg oder Lösungsschritte (wenn zutreffend)
2. Erwartete Kernaussagen oder Konzepte
3. Häufige Fehler oder Missverständnisse, auf die Schüler achten sollten
4. Bewertungskriterien (falls mehrere Niveaus)

Format: Strukturiert, aber in Fließtext. Gerichtet an Lehrer, nicht an Schüler.`,
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

      {/* ── Erwartungshorizont ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Erwartungshorizont <span className="text-muted-foreground font-normal">(optional)</span>
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
          placeholder="Musterlösung, Lösungsschritte, Bewertungskriterien..."
          rows={5}
          className="resize-none text-sm"
          disabled={isReadOnly}
        />
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