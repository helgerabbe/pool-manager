/**
 * TextLesenAIGeneratorPanel.jsx
 *
 * KI-Assistent im "Text lesen"-Modal. Erscheint nur, wenn die Lehrkraft
 * "Text direkt eingeben" als Art des Textes gewählt hat.
 *
 * Funktionsweise:
 *   1. Lehrkraft beschreibt im Briefing (Text oder Spracheingabe), worum
 *      es im Lese-Text gehen soll.
 *   2. Über zwei Selects steuert sie Länge (kurz/mittel/lang) und
 *      Sprachniveau (leicht/normal/anspruchsvoll).
 *   3. Klick auf "Text generieren" → Backend `generateLeseText` →
 *      Vorschau mit Titel + Text → "Übernehmen" schreibt die Werte
 *      direkt in das Modal-Form-State (titel + inhalt).
 *
 * Wir reichen das Briefing absichtlich NICHT an die DB durch — bei
 * Lese-Texten wird selten iterativ verfeinert, anders als im Lernpaket-
 * Wizard. Wenn die Lehrkraft nochmal generieren möchte, sieht sie ihren
 * letzten Briefing-Text im Eingabefeld so lange das Panel offen ist.
 */
import React, { useState } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

const MAX_BRIEFING = 4000;

const LAENGE_OPTIONS = [
  { value: 'kurz', label: 'Kurz (≈ 120–180 Wörter)' },
  { value: 'mittel', label: 'Mittel (≈ 250–400 Wörter)' },
  { value: 'lang', label: 'Länger (≈ 500–700 Wörter)' },
];

const NIVEAU_OPTIONS = [
  { value: 'leicht', label: 'Leichte Sprache' },
  { value: 'normal', label: 'Normale Sprache' },
  { value: 'anspruchsvoll', label: 'Anspruchsvoll' },
];

export default function TextLesenAIGeneratorPanel({
  fach = 'unbekannt',
  jahrgangsstufe = 'unbekannt',
  currentTitel = '',
  onApply,           // ({ titel, text }) => void
  disabled = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [laenge, setLaenge] = useState('mittel');
  const [niveau, setNiveau] = useState('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState(null); // { titel, text }

  const handleGenerate = async () => {
    const trimmed = briefing.trim();
    if (!trimmed) {
      toast.error('Bitte beschreibe zuerst, worum es im Text gehen soll.');
      return;
    }
    setIsGenerating(true);
    setProposal(null);
    try {
      const res = await base44.functions.invoke('generateLeseText', {
        briefing: trimmed,
        laenge,
        niveau,
        fach,
        jahrgangsstufe,
        titelVorgabe: currentTitel || '',
      });
      const data = res?.data || res;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (!data?.text) {
        toast.error('KI hat keinen Text zurückgegeben.');
        return;
      }
      setProposal({ titel: data.titel || '', text: data.text });
      toast.success('Text generiert. Prüfe ihn und übernimm ihn bei Gefallen.');
    } catch (err) {
      console.error('[TextLesenAIGeneratorPanel] generate failed', err);
      toast.error(err?.response?.data?.error || 'Fehler beim Generieren.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!proposal) return;
    onApply?.({ titel: proposal.titel, text: proposal.text });
    toast.success('Text übernommen.');
    // Vorschau leeren, damit der Block nicht weiter den Speichern-Bereich
    // verdeckt. Briefing bleibt erhalten, falls die Lehrkraft erneut
    // generieren will.
    setProposal(null);
    setExpanded(false);
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40">
      {/* Header: collapsible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">
            Text mit KI generieren
          </span>
          <span className="text-[10px] uppercase tracking-wide font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            Beta
          </span>
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-blue-700" />
          : <ChevronDown className="w-4 h-4 text-blue-700" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-blue-100">
          {/* Briefing-Textarea + Spracheingabe */}
          <div className="space-y-1.5 pt-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium text-blue-900">
                Worum soll es im Text gehen?
              </Label>
              <div className="flex items-center gap-2">
                <SpeechInputButton
                  value={briefing}
                  onResult={(t) => setBriefing(t.slice(0, MAX_BRIEFING))}
                  disabled={isGenerating || disabled}
                  maxSeconds={60}
                />
                <span className="text-[10px] text-muted-foreground">
                  {briefing.length} / {MAX_BRIEFING}
                </span>
              </div>
            </div>
            <Textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Beispiel: Erkläre den Schüler:innen den Wasserkreislauf. Wichtig sind: Verdunstung, Wolkenbildung, Niederschlag, Versickerung. Verbinde es mit einem Alltagsbeispiel (z.B. eine nasse Pfütze im Sommer)."
              rows={4}
              maxLength={MAX_BRIEFING}
              disabled={isGenerating || disabled}
              className="resize-none text-sm bg-white"
            />
          </div>

          {/* Steuer-Selects: Länge + Sprachniveau */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-blue-900">Länge</Label>
              <select
                value={laenge}
                onChange={(e) => setLaenge(e.target.value)}
                disabled={isGenerating || disabled}
                className="w-full px-2.5 py-1.5 rounded-md border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {LAENGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-blue-900">Sprachniveau</Label>
              <select
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                disabled={isGenerating || disabled}
                className="w-full px-2.5 py-1.5 rounded-md border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {NIVEAU_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generieren-Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || disabled || !briefing.trim()}
              size="sm"
              className="gap-2"
            >
              {isGenerating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generiere…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Text generieren</>}
            </Button>
          </div>

          {/* Vorschau + Übernehmen */}
          {proposal && (
            <div className="rounded-md border border-blue-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                  Vorschlag
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  disabled={disabled}
                  className="gap-1.5 h-7 text-xs"
                >
                  Text übernehmen
                </Button>
              </div>
              {proposal.titel && (
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Titel</p>
                  <p className="text-sm font-semibold text-foreground">{proposal.titel}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Text</p>
                <div className="max-h-56 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed text-foreground bg-muted/30 rounded p-2 border border-border">
                  {proposal.text}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}