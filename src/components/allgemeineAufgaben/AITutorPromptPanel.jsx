/**
 * AITutorPromptPanel.jsx
 *
 * Zeigt die fünf Brian.study-Segmente für eine Aufgabe:
 * 1. Dialogname
 * 2. Anweisung für Lernende
 * 3. Interne System-Anweisung (Tutor-Persona)
 * 4. Wann ist der Dialog beendet?
 * 5. Bewertungsrubriken (aus Tab "Abgabe & Gütekriterien")
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, AlertTriangle, RefreshCw, Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

// ── Einzelne Sektion mit Copy-Button ─────────────────────────────────────────
function SegmentField({ label, description, value, onChange, kannBearbeiten, multiline = true }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`"${label}" kopiert.`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <button
          onClick={handleCopy}
          disabled={!value}
          className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40"
        >
          {copied
            ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Kopiert</>
            : <><Copy className="w-3.5 h-3.5" /> Kopieren</>
          }
        </button>
      </div>

      {multiline ? (
        <textarea
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          readOnly={!kannBearbeiten}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed read-only:bg-muted/20 read-only:text-foreground"
          style={{ minHeight: '90px' }}
          placeholder="(noch nicht generiert)"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          readOnly={!kannBearbeiten}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring read-only:bg-muted/20"
          placeholder="(noch nicht generiert)"
        />
      )}
    </div>
  );
}

// ── Rubriken-Anzeige ──────────────────────────────────────────────────────────
function RubrikenSection({ rubrics }) {
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = async () => {
    if (!rubrics?.length) return;
    const text = rubrics.map(r => `${r.title} (${r.points} Pkt.):\n${r.criteria_text}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success('Alle Rubriken kopiert.');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Bewertungsrubriken</p>
          <p className="text-xs text-muted-foreground mt-0.5">Aus Tab „Abgabe & Gütekriterien" – strukturiert das Abschluss-Feedback des Tutors</p>
        </div>
        <button
          onClick={handleCopyAll}
          disabled={!rubrics?.length}
          className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40"
        >
          {copiedAll
            ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Kopiert</>
            : <><Copy className="w-3.5 h-3.5" /> Alle kopieren</>
          }
        </button>
      </div>

      {!rubrics?.length ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Noch keine Rubriken definiert. Bitte im Tab „Abgabe & Gütekriterien" anlegen oder per KI generieren.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {rubrics.map((r, i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{r.points} Pkt.</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.criteria_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function AITutorPromptPanel({
  aufgabe,
  mappedLernziele = [],
  mappedBasisLernziele = [],
  einheit,
  kannBearbeiten = false,
}) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Lokaler Zustand der Segmente
  const [segments, setSegments] = useState({
    brian_dialog_name: '',
    brian_learner_instruction: '',
    brian_system_instruction: '',
    brian_completion_rule: '',
  });
  const [isDirty, setIsDirty] = useState(false);

  const hatErwartungshorizont = !!(aufgabe?.erwartungshorizont?.trim() || aufgabe?.musterloesung?.trim());

  // Felder aus Aufgabe laden wenn sich aufgabe.id ändert
  useEffect(() => {
    if (!aufgabe) return;
    setSegments({
      brian_dialog_name: aufgabe.brian_dialog_name || aufgabe.titel || '',
      brian_learner_instruction: aufgabe.brian_learner_instruction || aufgabe.aufgabenstellung || '',
      brian_system_instruction: aufgabe.brian_system_instruction || '',
      brian_completion_rule: aufgabe.brian_completion_rule || '',
    });
    setIsDirty(false);
  }, [aufgabe?.id]);

  const updateField = (field, value) => {
    setSegments(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Segmente per KI generieren
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateBrianSegments', {
        aufgabe,
        einheit,
        lernziele: mappedLernziele,
        basisLernziele: mappedBasisLernziele,
      });
      const result = response.data?.segments;
      if (!result) throw new Error('Keine Segmente erhalten');

      setSegments({
        brian_dialog_name: result.brian_dialog_name || '',
        brian_learner_instruction: result.brian_learner_instruction || '',
        brian_system_instruction: result.brian_system_instruction || '',
        brian_completion_rule: result.brian_completion_rule || '',
      });

      // Rubriken nur übernehmen wenn noch keine vorhanden
      const updates = {
        brian_dialog_name: result.brian_dialog_name || '',
        brian_learner_instruction: result.brian_learner_instruction || '',
        brian_system_instruction: result.brian_system_instruction || '',
        brian_completion_rule: result.brian_completion_rule || '',
      };
      if (result.rubric_criteria?.length && !aufgabe?.rubric_criteria?.length) {
        updates.rubric_criteria = result.rubric_criteria;
      }

      await base44.entities.AllgemeineAufgabe.update(aufgabe.id, updates);
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setIsDirty(false);
      toast.success('Brian-Segmente generiert und gespeichert.');
    } catch (err) {
      toast.error('Fehler beim Generieren: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Manuell gespeicherte Änderungen sichern
  const saveMutation = useMutation({
    mutationFn: () => base44.entities.AllgemeineAufgabe.update(aufgabe.id, segments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setIsDirty(false);
      toast.success('Segmente gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  if (!aufgabe) return null;

  const rubrics = aufgabe.rubric_criteria || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Warnung: kein Erwartungshorizont */}
        {!hatErwartungshorizont && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>
              <strong>Hinweis:</strong> Es wurde noch kein Erwartungshorizont hinterlegt. Ohne diesen kann die KI keine präzise System-Anweisung generieren.
            </span>
          </div>
        )}

        {/* Aktionsleiste */}
        <div className="flex items-center gap-2 flex-wrap pb-1 border-b border-border">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Brian.study – KI-Tutor Konfiguration</p>
            <p className="text-xs text-muted-foreground">Fünf Felder für die direkte Übertragung in Brian.study – jedes Feld hat einen eigenen Kopieren-Button.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2 shrink-0"
          >
            {isGenerating
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird generiert…</>
              : <><RefreshCw className="w-3.5 h-3.5" /> KI generieren</>
            }
          </Button>
          {kannBearbeiten && isDirty && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2 shrink-0"
            >
              {saveMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />
              }
              Speichern
            </Button>
          )}
        </div>

        {/* Feld 1: Dialogname */}
        <SegmentField
          label="1 · Dialogname"
          description="Wird als Titel des Brian-Dialogs angezeigt (max. 60 Zeichen)"
          value={segments.brian_dialog_name}
          onChange={kannBearbeiten ? v => updateField('brian_dialog_name', v) : undefined}
          kannBearbeiten={kannBearbeiten}
          multiline={false}
        />

        {/* Feld 2: Anweisung für Lernende */}
        <SegmentField
          label="2 · Anweisung für Lernende"
          description="Sichtbar für den Schüler – klare Aufgabenbeschreibung in der Du-Form"
          value={segments.brian_learner_instruction}
          onChange={kannBearbeiten ? v => updateField('brian_learner_instruction', v) : undefined}
          kannBearbeiten={kannBearbeiten}
        />

        {/* Feld 3: Interne System-Anweisung */}
        <SegmentField
          label="3 · Interne System-Anweisung (Tutor-Persona)"
          description="Nicht sichtbar für Schüler – definiert das Scaffolding-Verhalten und den fachlichen Kontext des Tutors"
          value={segments.brian_system_instruction}
          onChange={kannBearbeiten ? v => updateField('brian_system_instruction', v) : undefined}
          kannBearbeiten={kannBearbeiten}
        />

        {/* Feld 4: Abbruchbedingung */}
        <SegmentField
          label="4 · Wann ist der Dialog beendet?"
          description="Definition der Abbruchbedingung – wann gilt die Aufgabe als erfolgreich abgeschlossen?"
          value={segments.brian_completion_rule}
          onChange={kannBearbeiten ? v => updateField('brian_completion_rule', v) : undefined}
          kannBearbeiten={kannBearbeiten}
        />

        {/* Feld 5: Rubriken */}
        <RubrikenSection rubrics={rubrics} />

        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Tipp: Rubriken werden im Tab „Abgabe & Gütekriterien" angelegt oder per KI generiert. Sie strukturieren das Abschluss-Feedback des Tutors nach Beendigung des Dialogs.
        </p>
      </div>
    </div>
  );
}