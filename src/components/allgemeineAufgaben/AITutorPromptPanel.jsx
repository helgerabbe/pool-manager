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
import { AlertTriangle, RefreshCw, Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { resolveLernzieleMitLernpaket } from '@/lib/lernzielLernpaketResolver';
import VerknuepfteLernzieleBlock from '@/components/allgemeineAufgaben/VerknuepfteLernzieleBlock';

// ── Tutor-Persona Auswahl ─────────────────────────────────────────────────────
const TUTOR_PERSONAS = [
  {
    value: 'standard',
    label: 'Standard-Tutor',
    description: 'Ausgewogenes Scaffolding – führt den Schüler schrittweise zur Lösung',
  },
  {
    value: 'unterstuetzend',
    label: 'Unterstützender Tutor',
    description: 'Besonders einfühlsam und geduldig – gibt mehr Hilfestellungen und Zwischenschritte',
  },
  {
    value: 'streng',
    label: 'Strenger Tutor',
    description: 'Fordert präzise Antworten – gibt wenig Hilfestellungen und verlangt eigenständiges Denken',
  },
  {
    value: 'restriktiv',
    label: 'Restriktiver Tutor',
    description: 'Gibt keinerlei Hinweise – der Schüler muss die Aufgabe vollständig selbstständig lösen',
  },
];

function TutorPersonaSection({ personaValue, personaZusatz, onPersonaChange, onZusatzChange, kannBearbeiten }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">3 · Tutor-Persona</p>
        <p className="text-xs text-muted-foreground mt-0.5">Legt das Verhalten und den Betreuungsstil des KI-Tutors fest</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TUTOR_PERSONAS.map(p => {
          const isSelected = (personaValue || 'standard') === p.value;
          return (
            <button
              key={p.value}
              type="button"
              disabled={!kannBearbeiten}
              onClick={() => kannBearbeiten && onPersonaChange(p.value)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/40 disabled:cursor-default'
              }`}
            >
              <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>{p.label}</p>
              <p className="text-xs mt-0.5 leading-snug">{p.description}</p>
            </button>
          );
        })}
      </div>

      {/* Optionales Zusatzfeld */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Ergänzende Informationen <span className="font-normal">(optional)</span></p>
        <textarea
          value={personaZusatz || ''}
          onChange={e => kannBearbeiten && onZusatzChange(e.target.value)}
          readOnly={!kannBearbeiten}
          rows={3}
          placeholder="z.B. besondere Hinweise zur fachlichen Strenge, Sprachebene oder Scaffolding-Strategie …"
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed read-only:bg-muted/20 read-only:text-foreground placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}

// ── Einzelne Sektion (ohne Copy-Button) ──────────────────────────────────────
function SegmentField({ label, description, value, onChange, kannBearbeiten, multiline = true }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
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

// ── Erwartungshorizont-Anzeige für Ebene-2-Aufgaben (Read-only, informativ) ──
function ErwartungshorizontSection({ aufgabe }) {
  const horizont = aufgabe?.erwartungshorizont || aufgabe?.musterloesung || '';
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Erwartungshorizont (Tutor-Kontext)</p>
        <p className="text-xs text-muted-foreground mt-0.5">Wird als fachlicher Kontext in die interne System-Anweisung des KI-Tutors eingebettet</p>
      </div>
      {!horizont ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Noch kein Erwartungshorizont definiert. Bitte im Tab „Erwartungshorizont" hinterlegen.</span>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-border bg-muted/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {horizont}
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
  lernpakete = [],
  basislernpakete = [],
  basismodule = [],
  alleLernziele = [],
  alleBasisLernziele = [],
  einheit,
  kannBearbeiten = false,
}) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Lernziele + zugehöriges Lernpaket auflösen (für Anzeige UND Brian-Payload).
  // Primäre Quelle ist die kuratierte Lernzielanalyse der Aufgabe
  // (aufgabe.lernzielanalyse.items) – nicht die alten Mapping-Tabellen.
  const lernzieleMitLernpaket = React.useMemo(
    () =>
      resolveLernzieleMitLernpaket({
        analyseItems: aufgabe?.lernzielanalyse?.items || [],
        lernziele: mappedLernziele,
        basisLernziele: mappedBasisLernziele,
        lernpakete,
        basislernpakete,
        basismodule,
        alleLernziele,
        alleBasisLernziele,
      }),
    [aufgabe?.lernzielanalyse, mappedLernziele, mappedBasisLernziele, lernpakete, basislernpakete, basismodule, alleLernziele, alleBasisLernziele]
  );

  // Lokaler Zustand der Segmente
  const [segments, setSegments] = useState({
    brian_dialog_name: '',
    brian_learner_instruction: '',
    brian_system_instruction: '',
    brian_completion_rule: 'Der Dialog ist beendet, wenn die Aufgabe vollständig und korrekt bearbeitet wurde.',
    tutor_persona: 'standard',
    tutor_persona_zusatz: '',
  });
  const [isDirty, setIsDirty] = useState(false);

  // Erwartungshorizont ist nur für allgemeine Aufgaben (nicht Ebene 3) erforderlich
  const istProjektaufgabe = aufgabe?.anforderungsebene === '3 - Projekt';
  const hatErwartungshorizont = !!(aufgabe?.erwartungshorizont?.trim() || aufgabe?.musterloesung?.trim());

  // Felder aus Aufgabe laden wenn sich aufgabe.id ändert
  useEffect(() => {
    if (!aufgabe) return;
    setSegments({
      brian_dialog_name: aufgabe.brian_dialog_name || aufgabe.titel || '',
      brian_learner_instruction: aufgabe.brian_learner_instruction || aufgabe.aufgabenstellung || '',
      brian_system_instruction: aufgabe.brian_system_instruction || '',
      brian_completion_rule: aufgabe.brian_completion_rule || 'Der Dialog ist beendet, wenn die Aufgabe vollständig und korrekt bearbeitet wurde.',
      tutor_persona: aufgabe.tutor_persona || 'standard',
      tutor_persona_zusatz: aufgabe.tutor_persona_zusatz || '',
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
        // Lernziel→Lernpaket-Zuordnung, damit Brian gezielt auf Lernpakete verweisen kann.
        lernzieleMitLernpaket,
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
    mutationFn: () => {
      const dataToSave = { ...segments };
      // Stelle sicher, dass rubric_criteria nur mitgespeichert wird wenn es ein Array ist
      if (!Array.isArray(aufgabe.rubric_criteria)) {
        dataToSave.rubric_criteria = [];
      }
      return base44.entities.AllgemeineAufgabe.update(aufgabe.id, dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setIsDirty(false);
      toast.success('Segmente gespeichert.');
    },
    onError: (err) => toast.error('Fehler beim Speichern: ' + err.message),
  });

  if (!aufgabe) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Warnung: kein Erwartungshorizont (nur für allgemeine Aufgaben) */}
        {!istProjektaufgabe && !hatErwartungshorizont && (
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
            <p className="text-xs text-muted-foreground">Automatisch generierte Felder. Prüfen und ggf. verfeinern. Kopieren im Brian-Export-Cockpit (Tab 9).</p>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={handleGenerate}
            disabled={isGenerating || !kannBearbeiten}
            className="gap-2 shrink-0"
          >
            {isGenerating
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird generiert…</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Alle Felder generieren</>
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

        {/* Feld 3: Tutor-Persona */}
        <TutorPersonaSection
          personaValue={segments.tutor_persona}
          personaZusatz={segments.tutor_persona_zusatz}
          onPersonaChange={v => updateField('tutor_persona', v)}
          onZusatzChange={v => updateField('tutor_persona_zusatz', v)}
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

        {/* Verknüpfte Lernziele & Lernpakete – damit Brian gezielt verweisen kann */}
        <VerknuepfteLernzieleBlock items={lernzieleMitLernpaket} />

        {/* Feld 5: Erwartungshorizont als Tutor-Kontext (nur für Ebene-2-Aufgaben) */}
        {!istProjektaufgabe && (
          <ErwartungshorizontSection aufgabe={aufgabe} />
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Tipp: Der Erwartungshorizont wird vom KI-Tutor genutzt, um das Feedback an die Schülerantwort anzupassen. Je präziser der Erwartungshorizont, desto gezielter das Tutoring.
        </p>
      </div>
    </div>
  );
}