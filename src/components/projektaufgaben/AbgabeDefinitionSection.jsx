import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Save, Plus, Trash2, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';

// ── Verfügbare Standardformate ──
const STANDARD_FORMATE = [
  { id: 'text',         label: 'Text',           emoji: '📝' },
  { id: 'presentation', label: 'Präsentation',   emoji: '📊' },
  { id: 'timeline',     label: 'Zeitleiste',      emoji: '📅' },
  { id: 'image',        label: 'Bild',            emoji: '🖼️' },
  { id: 'graphic',      label: 'Grafik',          emoji: '📐' },
  { id: 'audio',        label: 'Audio/Podcast',   emoji: '🎙️' },
];

function FormatKachel({ format, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(format.id)}
      className={cn(
        'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all',
        selected
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground'
      )}
    >
      <span className="text-xl">{format.emoji}</span>
      <span className="text-xs leading-tight">{format.label}</span>
    </button>
  );
}

// ── Einzelne Rubrik-Zeile ──
function RubrikRow({ rubrik, index, onChange, onDelete, kannBearbeiten }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border">
        <input
          value={rubrik.title}
          onChange={e => onChange(index, 'title', e.target.value)}
          disabled={!kannBearbeiten}
          placeholder="Kategorie-Titel (z.B. Inhaltliche Tiefe)"
          className="flex-1 text-sm font-semibold bg-transparent focus:outline-none placeholder:text-muted-foreground/50 disabled:opacity-60"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">Punkte:</span>
          <input
            type="number"
            value={rubrik.points}
            onChange={e => onChange(index, 'points', Number(e.target.value))}
            disabled={!kannBearbeiten}
            className="w-16 h-7 px-2 text-sm text-center rounded border border-border bg-background focus:outline-none disabled:opacity-60"
            min={1}
            max={100}
          />
        </div>
        {kannBearbeiten && (
          <button
            onClick={() => onDelete(index)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <textarea
        value={rubrik.criteria_text}
        onChange={e => onChange(index, 'criteria_text', e.target.value)}
        disabled={!kannBearbeiten}
        placeholder="Ausformulierte Kriterien für die volle Punktzahl..."
        rows={4}
        className="w-full px-4 py-3 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50 disabled:opacity-60"
      />
    </div>
  );
}

// ── Haupt-Komponente ──
export default function AbgabeDefinitionSection({ aufgabe, kannBearbeiten }) {
  const queryClient = useQueryClient();
  const [outputFormats, setOutputFormats] = useState([]);
  const [customFormat, setCustomFormat]   = useState('');
  const [qualityFocus, setQualityFocus]   = useState('');
  const [rubrics, setRubrics]             = useState([]);
  const [generating, setGenerating]       = useState(false);
  const [saving, setSaving]               = useState(false);
  // Erfolgs-Zustand: Button zeigt 2s lang „Gespeichert ✓" an, damit der
  // Speichern-Erfolg nicht nur über den Toast sichtbar ist.
  const [justSaved, setJustSaved]         = useState(false);

  useEffect(() => {
    if (!aufgabe) return;
    setOutputFormats(aufgabe.output_formats || []);
    setCustomFormat(aufgabe.custom_format || '');
    setQualityFocus(aufgabe.quality_focus || '');

    // Migrationspfad: altes Objekt-Format → neues Array-Format
    const stored = aufgabe.rubric_criteria;
    if (Array.isArray(stored)) {
      setRubrics(stored);
    } else if (stored && typeof stored === 'object' && stored.sufficient !== undefined) {
      // Legacy-Konvertierung
      setRubrics([
        { title: 'Ausreichend', points: 8, criteria_text: stored.sufficient || '' },
        { title: 'Gut', points: 12, criteria_text: stored.good || '' },
        { title: 'Sehr gut', points: 15, criteria_text: stored.excellent || '' },
      ]);
    } else {
      setRubrics([]);
    }
  }, [aufgabe?.id]);

  const toggleFormat = (id) => {
    setOutputFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleRubrikChange = (index, field, value) => {
    setRubrics(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleAddRubrik = () => {
    setRubrics(prev => [...prev, { title: '', points: 10, criteria_text: '' }]);
  };

  const handleDeleteRubrik = (index) => {
    setRubrics(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateRubric = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateRubricProposal', {
        output_formats: outputFormats,
        custom_format: customFormat,
        quality_focus: qualityFocus,
        aufgabenstellung: aufgabe?.aufgabenstellung || '',
      });
      const result = response.data;
      if (result?.rubrics && Array.isArray(result.rubrics)) {
        setRubrics(result.rubrics);
        await updateAllgemeineAufgabe(aufgabe.id, { rubric_criteria: result.rubrics });
        queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
        toast.success('Rubriken generiert und gespeichert!');
      } else {
        toast.error('KI hat kein gültiges Format zurückgegeben.');
      }
    } catch (err) {
      toast.error('Fehler beim Generieren der Rubriken: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validierung: rubric_criteria muss immer ein Array sein
      const rubricsToSave = Array.isArray(rubrics) ? rubrics : [];

      // Wichtig: Über den Service (updateActivitySecure) speichern, NICHT direkt
      // via SDK – sonst greift der Bearbeitungs-Lock der Projektaufgabe nicht
      // und das Backend lehnt das Update ab.
      await updateAllgemeineAufgabe(aufgabe.id, {
        output_formats: outputFormats,
        custom_format:  customFormat,
        quality_focus:  qualityFocus,
        rubric_criteria: rubricsToSave,
      });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Bewertungsrubriken gespeichert', {
        description: `${rubricsToSave.length} ${rubricsToSave.length === 1 ? 'Kategorie' : 'Kategorien'} · ${rubricsToSave.reduce((s, r) => s + (r.points || 0), 0)} Punkte gesamt`,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      toast.error('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = rubrics.reduce((sum, r) => sum + (r.points || 0), 0);

  return (
    <div className="space-y-8 p-6 max-w-2xl">

      {/* ── Block A: Format-Auswahl ── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Abgabeformate</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Welche Formate sollen Schülerinnen und Schüler einreichen? Mehrfachauswahl möglich.
          </p>
        </div>

        {/* Hinweis: Das Abgabeformat steuert den KI-Tutor, wird von ihm aber NICHT geprüft. */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-3 text-xs text-blue-900 leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <p>
            <strong>Wichtig:</strong> Der KI-Tutor Brian prüft oder bewertet das fertige Abgabeformat <strong>nicht</strong>.
            Stattdessen <strong>begleitet</strong> er die Schülerinnen und Schüler bei dessen Erstellung – er weist sie z.&nbsp;B.
            gezielt darauf hin, eine Zeitleiste oder Präsentation anzulegen, und berät sie auf dem Weg dorthin.
            Deshalb ist es wichtig, das gewünschte Format hier anzugeben: nur so weiß Brian, in welche Richtung er unterstützen soll.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STANDARD_FORMATE.map(fmt => (
            <FormatKachel
              key={fmt.id}
              format={fmt}
              selected={outputFormats.includes(fmt.id)}
              onToggle={kannBearbeiten ? toggleFormat : () => {}}
            />
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Eigenes Format definieren</label>
          <input
            type="text"
            value={customFormat}
            onChange={(e) => setCustomFormat(e.target.value)}
            disabled={!kannBearbeiten}
            placeholder="z.B. Lerntagebuch, Modell, Poster…"
            className="w-full h-9 px-3 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
          />
        </div>
      </section>

      {/* ── Block B: Fokus & KI-Trigger ── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Besonderer Fokus <span className="text-muted-foreground font-normal">(Optional)</span></h3>
        </div>
        <textarea
          value={qualityFocus}
          onChange={(e) => setQualityFocus(e.target.value)}
          disabled={!kannBearbeiten}
          placeholder="Worauf soll bei der Bewertung besonders geachtet werden? (z.B. ausführliche Quellenarbeit, logischer Aufbau, Kreativität…)"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        {kannBearbeiten && (
          <Button
            onClick={handleGenerateRubric}
            disabled={generating}
            className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Rubriken werden generiert…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Bewertungsrubriken mit KI generieren (Brian-Format)</>
            )}
          </Button>
        )}
      </section>

      {/* ── Block C: Bewertungsrubriken (Brian-Format) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Bewertungsrubriken</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Thematische Kategorien mit Punkten – kompatibel mit Brian.study.
              {totalPoints > 0 && <span className="ml-2 font-medium text-primary">Gesamt: {totalPoints} Punkte</span>}
            </p>
          </div>
          {kannBearbeiten && (
            <Button variant="outline" size="sm" onClick={handleAddRubrik} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Kategorie hinzufügen
            </Button>
          )}
        </div>

        {rubrics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            Noch keine Rubriken. KI generieren oder manuell hinzufügen.
          </div>
        ) : (
          <div className="space-y-3">
            {rubrics.map((rubrik, index) => (
              <RubrikRow
                key={index}
                rubrik={rubrik}
                index={index}
                onChange={handleRubrikChange}
                onDelete={handleDeleteRubrik}
                kannBearbeiten={kannBearbeiten}
              />
            ))}
          </div>
        )}

        {kannBearbeiten && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              size="default"
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'gap-2 transition-colors',
                justSaved
                  ? 'bg-green-600 hover:bg-green-600 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</>
              ) : justSaved ? (
                <><CheckCircle2 className="w-4 h-4" /> Gespeichert</>
              ) : (
                <><Save className="w-4 h-4" /> Änderungen speichern</>
              )}
            </Button>
            {justSaved && (
              <span className="text-xs text-green-700 font-medium">
                Alle Änderungen wurden übernommen.
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}