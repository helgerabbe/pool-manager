/**
 * ClozeTextForm.jsx
 *
 * Intuitive GUI für Lückentexte (Cloze-Aufgaben) in Ebene 4.
 *
 * Datenstruktur:
 * - baseText: "Die Hauptstadt von Deutschland ist [[0]]."
 * - gaps: [{ id: 0, solution: "Berlin", feedback: "...", type: "text|select" }]
 *
 * Interaktion:
 * 1. Nutzer markiert Text in der Textarea
 * 2. "Lücke erstellen"-Button erscheint als Floating-Button
 * 3. Text wird durch [[id]] ersetzt, Wort kommt in Gaps-Liste
 * 4. Jede Lücke kann bearbeitet, gelöscht oder umgeschaltet werden (Freitext ↔ Auswahl)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ClozeTextForm({ initialData = {}, onSave }) {
  // ──────────────────────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────────────────────

  const [baseText, setBaseText] = useState(initialData.baseText || '');
  const [gaps, setGaps] = useState(initialData.gaps || []);
  const [nextGapId, setNextGapId] = useState(
    Math.max(...(initialData.gaps || []).map(g => g.id), -1) + 1
  );

  // Selection & Floating Button
  const [selection, setSelection] = useState(null);
  const [floatingButtonPos, setFloatingButtonPos] = useState(null);
  const textareaRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Helfer: Text-Manipulation (robust gegen Position-Korruption)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Ersetzt das Wort an der gegebenen Position durch [[id]]
   * Nutzt Positionen im aktuellen baseText, nicht relative Indizes.
   */
  const replaceSelectionWithGap = useCallback((selectedText, startPos, endPos, gapId) => {
    const before = baseText.substring(0, startPos);
    const after = baseText.substring(endPos);
    const newText = `${before}[[${gapId}]]${after}`;
    setBaseText(newText);
  }, [baseText]);

  /**
   * Setzt eine Lücke zurück: Ersetzt [[id]] durch die Original-Lösung
   */
  const restoreGapToText = useCallback((gapId, solution) => {
    const placeholder = `[[${gapId}]]`;
    const newText = baseText.replace(placeholder, solution);
    setBaseText(newText);
  }, [baseText]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Selection-Handling
  // ──────────────────────────────────────────────────────────────────────────────

  const handleTextSelection = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);

    if (!selectedText || selectedText.trim().length === 0) {
      setSelection(null);
      setFloatingButtonPos(null);
      return;
    }

    // Berechne Position des Floating Buttons (oben rechts der Selection)
    setSelection({
      text: selectedText,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });

    // Floating Button Position berechnen (über dem Textarea)
    const coords = getSelectionCoords();
    if (coords) {
      setFloatingButtonPos({
        top: coords.top - 40,
        left: coords.left,
      });
    }
  }, []);

  const getSelectionCoords = () => {
    if (!textareaRef.current) return null;
    const textarea = textareaRef.current;
    if (textarea.selectionStart === textarea.selectionEnd) return null;

    // Approximation: Berechne Position basierend auf der Textarea
    const rect = textarea.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left + 10,
    };
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Gap Creation
  // ──────────────────────────────────────────────────────────────────────────────

  const handleCreateGap = () => {
    if (!selection) return;

    const { text, start, end } = selection;
    const newGap = {
      id: nextGapId,
      solution: text.trim(),
      feedback: '',
      type: 'text',
    };

    // Ersetze Text durch Platzhalter
    replaceSelectionWithGap(text, start, end, nextGapId);

    // Füge Gap hinzu
    setGaps([...gaps, newGap]);
    setNextGapId(nextGapId + 1);

    // Bereinige Selection
    setSelection(null);
    setFloatingButtonPos(null);

    toast.success(`Lücke erstellt: "${text.trim()}"`);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Gap Management (Edit & Delete)
  // ──────────────────────────────────────────────────────────────────────────────

  const handleGapUpdate = (gapId, field, value) => {
    setGaps(gaps.map(g => g.id === gapId ? { ...g, [field]: value } : g));
  };

  const handleDeleteGap = (gapId) => {
    const gap = gaps.find(g => g.id === gapId);
    if (!gap) return;

    // Setze Lösung im Text zurück
    restoreGapToText(gapId, gap.solution);

    // Entferne aus Gaps-Liste
    setGaps(gaps.filter(g => g.id !== gapId));
    toast.success(`Lücke gelöscht: "${gap.solution}"`);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Validierung
  // ──────────────────────────────────────────────────────────────────────────────

  const hasGaps = gaps.length > 0;
  const isValid = baseText.trim().length > 0 && hasGaps;

  // ──────────────────────────────────────────────────────────────────────────────
  // Save Handler
  // ──────────────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!isValid) {
      toast.error('Bitte erstelle mindestens eine Lücke im Text.');
      return;
    }

    onSave({
      baseText,
      gaps,
    });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 rounded-lg border border-border bg-card">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Lückentext erstellen</h3>
        <p className="text-sm text-muted-foreground">
          Markiere Wörter im Text und erstelle Lücken. Die Lösung wird automatisch in die Verwaltung eingefügt.
        </p>
      </div>

      {/* Main Input Area */}
      <div className="relative">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Rohtext
          </label>
          <Textarea
            ref={textareaRef}
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
            onMouseUp={handleTextSelection}
            onKeyUp={handleTextSelection}
            placeholder="Schreibe den Text hier... Markiere Wörter, um Lücken zu erstellen."
            className="min-h-[120px] resize-none font-mono text-sm"
          />
        </div>

        {/* Floating "Lücke erstellen" Button */}
        {selection && floatingButtonPos && (
          <Button
            onClick={handleCreateGap}
            size="sm"
            className="absolute gap-1.5 shadow-lg animate-in fade-in-50 zoom-in-95"
            style={{
              top: `${floatingButtonPos.top}px`,
              left: `${floatingButtonPos.left}px`,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Lücke
          </Button>
        )}
      </div>

      {/* Validierungs-Banner */}
      {!hasGaps && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Mindestens eine Lücke erforderlich. Markiere ein Wort und klicke auf "Lücke".
          </p>
        </div>
      )}

      {/* Text-Vorschau (mit Lücken) */}
      {hasGaps && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Vorschau</p>
          <p className="text-sm leading-relaxed">
            {baseText.split(/(\[\[\d+\]\])/g).map((part, idx) => {
              const match = part.match(/\[\[(\d+)\]\]/);
              if (match) {
                const gapId = parseInt(match[1]);
                const gap = gaps.find(g => g.id === gapId);
                return (
                  <span
                    key={idx}
                    className="inline-block px-2 py-1 mx-0.5 rounded-md bg-primary/20 border border-primary/30 text-primary font-semibold text-xs"
                    title={`Lösung: ${gap?.solution || '?'}`}
                  >
                    ___
                  </span>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </p>
        </div>
      )}

      {/* Lücken-Verwaltung */}
      {hasGaps && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Lücken verwalten</h4>
            <Badge variant="outline" className="text-xs">
              {gaps.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {gaps.map((gap, idx) => (
              <GapCard
                key={gap.id}
                gap={gap}
                index={idx + 1}
                onUpdate={(field, value) => handleGapUpdate(gap.id, field, value)}
                onDelete={() => handleDeleteGap(gap.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="gap-2"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Speichern
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">
          {gaps.length} Lücke{gaps.length !== 1 ? 'n' : ''} erstellt
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// GapCard – Komponente für Lücken-Verwaltung
// ──────────────────────────────────────────────────────────────────────────────

function GapCard({ gap, index, onUpdate, onDelete }) {
  const [editMode, setEditMode] = useState(false);

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardContent className="p-3 space-y-2">
        {/* Header: Index + Type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              #{index}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              [[{gap.id}]]
            </span>
          </div>

          {/* Type Switcher */}
          <Select
            value={gap.type}
            onValueChange={(value) => onUpdate('type', value)}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Freitext</SelectItem>
              <SelectItem value="select">Auswahl</SelectItem>
            </SelectContent>
          </Select>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
            title="Lücke löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Solution Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Lösung</label>
          <Input
            type="text"
            value={gap.solution}
            onChange={(e) => onUpdate('solution', e.target.value)}
            placeholder="z.B. Berlin"
            className="h-8 text-sm"
          />
        </div>

        {/* Feedback Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Feedback (optional)</label>
          <Input
            type="text"
            value={gap.feedback || ''}
            onChange={(e) => onUpdate('feedback', e.target.value)}
            placeholder="Hinweis bei falscher Antwort..."
            className="h-8 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}