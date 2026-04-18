import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { generateRubricProposal, saveRubric, updateProjectTask } from '@/services/ProjektaufgabeService';

// ── Verfügbare Standardformate ──
const STANDARD_FORMATE = [
  { id: 'text',         label: 'Text',           emoji: '📝' },
  { id: 'presentation', label: 'Präsentation',   emoji: '📊' },
  { id: 'timeline',     label: 'Zeitleiste',      emoji: '📅' },
  { id: 'image',        label: 'Bild',            emoji: '🖼️' },
  { id: 'graphic',      label: 'Grafik',          emoji: '📐' },
  { id: 'audio',        label: 'Audio/Podcast',   emoji: '🎙️' },
];

// ── Format-Kachel ──
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

// ── Rubrik-Textarea ──
function RubrikTextarea({ label, value, onChange, colorClass, placeholder }) {
  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', colorClass)}>
      <div className="px-4 py-2 border-b border-border/50">
        <p className="text-xs font-semibold text-foreground/70">{label}</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-3 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

// ── Haupt-Komponente ──
export default function AbgabeDefinitionSection({ aufgabe, kannBearbeiten }) {
  const [outputFormats, setOutputFormats] = useState([]);
  const [customFormat, setCustomFormat]   = useState('');
  const [qualityFocus, setQualityFocus]   = useState('');
  const [rubric, setRubric]               = useState({ sufficient: '', good: '', excellent: '' });
  const [generating, setGenerating]       = useState(false);
  const [saving, setSaving]               = useState(false);

  // Werte aus aufgabe laden
  useEffect(() => {
    if (!aufgabe) return;
    setOutputFormats(aufgabe.output_formats || []);
    setCustomFormat(aufgabe.custom_format || '');
    setQualityFocus(aufgabe.quality_focus || '');
    setRubric({
      sufficient: aufgabe.rubric_criteria?.sufficient || '',
      good:       aufgabe.rubric_criteria?.good       || '',
      excellent:  aufgabe.rubric_criteria?.excellent  || '',
    });
  }, [aufgabe?.id]);

  const toggleFormat = (id) => {
    setOutputFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleGenerateRubric = async () => {
    if (outputFormats.length === 0 && !customFormat.trim()) {
      toast.error('Bitte wähle mindestens ein Abgabeformat aus.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateRubricProposal(aufgabe.id, {
        output_formats: outputFormats,
        custom_format: customFormat,
        quality_focus: qualityFocus,
      });
      setRubric({
        sufficient: result.sufficient || '',
        good:       result.good       || '',
        excellent:  result.excellent  || '',
      });
      // Direkt speichern
      await saveRubric(aufgabe.id, result);
      toast.success('Gütekriterien generiert und gespeichert!');
    } catch (err) {
      toast.error('Fehler beim Generieren der Gütekriterien');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectTask(aufgabe.id, {
        output_formats: outputFormats,
        custom_format:  customFormat,
        quality_focus:  qualityFocus,
      });
      await saveRubric(aufgabe.id, rubric);
      toast.success('Gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

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
              <><Loader2 className="w-4 h-4 animate-spin" /> Gütekriterien werden generiert…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Gütekriterien mit KI generieren</>
            )}
          </Button>
        )}
      </section>

      {/* ── Block C: Gütekriterien ── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Gütekriterien</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Beschreibungen der drei Leistungsniveaus. Können nach der KI-Generierung manuell angepasst werden.
          </p>
        </div>

        <div className="space-y-3">
          <RubrikTextarea
            label="Ausreichend"
            colorClass="bg-orange-50"
            value={rubric.sufficient}
            onChange={(v) => setRubric(r => ({ ...r, sufficient: v }))}
            placeholder="Mindestanforderungen gerade erfüllt…"
          />
          <RubrikTextarea
            label="Gut"
            colorClass="bg-yellow-50"
            value={rubric.good}
            onChange={(v) => setRubric(r => ({ ...r, good: v }))}
            placeholder="Solide Leistung mit erkennbarer Auseinandersetzung…"
          />
          <RubrikTextarea
            label="Sehr gut"
            colorClass="bg-green-50"
            value={rubric.excellent}
            onChange={(v) => setRubric(r => ({ ...r, excellent: v }))}
            placeholder="Herausragende, eigenständige und durchdachte Leistung…"
          />
        </div>

        {kannBearbeiten && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</>
              : <><Save className="w-4 h-4" /> Änderungen speichern</>
            }
          </Button>
        )}
      </section>
    </div>
  );
}