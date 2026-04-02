import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Trash2, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────────
// GapCard: Konfigurationskarte für eine einzelne Lücke
// ────────────────────────────────────────────────────────────────────────────────

function GapCard({ gap, onUpdate, onDelete }) {
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [newDistractor, setNewDistractor] = useState('');
  const [mode, setMode] = useState(gap.mode || 'input');

  const modeColors = {
    input: 'bg-blue-100 text-blue-800 border-blue-300',
    selection: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    onUpdate(gap.id, { ...gap, mode: newMode });
  };

  const handleSolutionChange = (value) => {
    onUpdate(gap.id, { ...gap, solution: value });
    setIsEditingSolution(false);
  };

  const handleFeedbackChange = (value) => {
    onUpdate(gap.id, { ...gap, feedback: value });
  };

  const handleAddDistractor = () => {
    if (!newDistractor.trim()) return;
    const updated = {
      ...gap,
      distractors: [...(gap.distractors || []), newDistractor.trim()],
    };
    onUpdate(gap.id, updated);
    setNewDistractor('');
  };

  const handleRemoveDistractor = (index) => {
    const updated = {
      ...gap,
      distractors: (gap.distractors || []).filter((_, i) => i !== index),
    };
    onUpdate(gap.id, updated);
  };

  return (
    <Card className="p-3 space-y-3 border border-border/60 bg-card/70">
      {/* Header: Gap ID, Mode Badge, Delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Lücke #{gap.id}
          </Badge>
          <Badge className={cn('text-xs border', modeColors[mode])}>
            {mode === 'input' ? '📝 Freitext' : '📋 Auswahlmenü'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(gap.id)}
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Lösungswort */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Lösungswort</label>
        {isEditingSolution ? (
          <div className="flex gap-1">
            <Input
              type="text"
              value={gap.solution}
              onChange={(e) => onUpdate(gap.id, { ...gap, solution: e.target.value })}
              className="h-7 text-xs"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleSolutionChange(gap.solution)}
              className="h-7 text-xs px-2"
            >
              OK
            </Button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingSolution(true)}
            className="px-2 py-1.5 bg-muted/50 rounded text-xs border border-border/40 cursor-pointer hover:bg-muted/70 transition"
          >
            {gap.solution || '(leere Lösung)'}
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Feedback (optional)</label>
        <Textarea
          value={gap.feedback || ''}
          onChange={(e) => handleFeedbackChange(e.target.value)}
          placeholder="z.B. 'Das ist korrekt, da Berlin die Hauptstadt von Deutschland ist.'"
          className="h-16 text-xs resize-none"
        />
      </div>

      {/* Mode Toggle */}
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-2 h-7">
          <TabsTrigger value="input" className="text-xs">
            📝 Freitext
          </TabsTrigger>
          <TabsTrigger value="selection" className="text-xs">
            📋 Auswahlmenü
          </TabsTrigger>
        </TabsList>

        {/* Selection Mode: Distractors */}
        {mode === 'selection' && (
          <TabsContent value="selection" className="space-y-2 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Distraktoren (falsche Antworten)
              </label>

              {/* Existierende Distraktoren */}
              {(gap.distractors || []).length > 0 && (
                <div className="space-y-1">
                  {gap.distractors.map((distractor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded text-xs border border-border/30"
                    >
                      <span className="truncate">{distractor}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDistractor(idx)}
                        className="h-5 w-5 text-destructive/60 hover:bg-destructive/10 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Neuer Distraktor */}
              <div className="flex gap-1">
                <Input
                  type="text"
                  value={newDistractor}
                  onChange={(e) => setNewDistractor(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDistractor()}
                  placeholder="Neue falsche Antwort..."
                  className="h-7 text-xs"
                />
                <Button
                  onClick={handleAddDistractor}
                  disabled={!newDistractor.trim()}
                  size="sm"
                  className="h-7 text-xs px-2 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Hinzufügen
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// ClozeTextForm: Hauptkomponente
// ────────────────────────────────────────────────────────────────────────────────

export default function ClozeTextForm({ initialData = {}, onChange }) {
  const [baseText, setBaseText] = useState(initialData.baseText || '');
  const [gaps, setGaps] = useState(initialData.gaps || []);
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const textareaRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Callback: Externe Änderungen übermitteln
  // ──────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (onChange) {
      onChange({ baseText, gaps });
    }
  }, [baseText, gaps]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Text-Markierungs-Logik
  // ──────────────────────────────────────────────────────────────────────────────

  const handleTextSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = baseText.substring(start, end);
      setSelectedText(selected);
      setSelectionStart(start);
      setSelectionEnd(end);
    } else {
      setSelectedText('');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Lücke erstellen
  // ──────────────────────────────────────────────────────────────────────────────

  const handleCreateGap = () => {
    if (!selectedText.trim() || selectionStart === null || selectionEnd === null) {
      return;
    }

    const newGapId = Math.max(...gaps.map((g) => g.id), -1) + 1;

    // Basteltext mit Platzhalter ersetzen
    const before = baseText.substring(0, selectionStart);
    const after = baseText.substring(selectionEnd);
    const newBaseText = before + `[[${newGapId}]]` + after;

    // Neue Lücke erstellen
    const newGap = {
      id: newGapId,
      solution: selectedText.trim(),
      feedback: '',
      mode: 'input',
      distractors: [],
    };

    setBaseText(newBaseText);
    setGaps([...gaps, newGap]);
    setSelectedText('');
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Lücke aktualisieren
  // ──────────────────────────────────────────────────────────────────────────────

  const handleUpdateGap = (gapId, updatedGap) => {
    setGaps(gaps.map((g) => (g.id === gapId ? updatedGap : g)));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Lücke löschen
  // ──────────────────────────────────────────────────────────────────────────────

  const handleDeleteGap = (gapId) => {
    const gapToDelete = gaps.find((g) => g.id === gapId);
    if (!gapToDelete) return;

    // Platzhalter im Text durch Lösungswort ersetzen
    const placeholder = `[[${gapId}]]`;
    const newBaseText = baseText.replace(placeholder, gapToDelete.solution);

    setBaseText(newBaseText);
    setGaps(gaps.filter((g) => g.id !== gapId));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Text mit visuellen Platzhalter-Pillen (Editor-Ansicht)
  // ──────────────────────────────────────────────────────────────────────────────

  const renderTextWithGaps = () => {
    const parts = [];
    let lastIndex = 0;

    const placeholderRegex = /\[\[(\d+)\]\]/g;
    let match;

    while ((match = placeholderRegex.exec(baseText)) !== null) {
      const gapId = parseInt(match[1], 10);
      const gap = gaps.find((g) => g.id === gapId);

      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>{baseText.substring(lastIndex, match.index)}</span>
        );
      }

      if (gap) {
        const gapModeColors = {
          input: 'bg-blue-200 text-blue-900 border-blue-400',
          selection: 'bg-purple-200 text-purple-900 border-purple-400',
        };

        parts.push(
          <span
            key={`gap-${gapId}`}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
              gapModeColors[gap.mode] || gapModeColors.input
            )}
          >
            Lücke {gapId}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < baseText.length) {
      parts.push(
        <span key={`text-end`}>{baseText.substring(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : <span>{baseText}</span>;
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Text mit interaktiven Lücken (Vorschau-Ansicht)
  // ──────────────────────────────────────────────────────────────────────────────

  const renderPreviewText = () => {
    const parts = [];
    let lastIndex = 0;

    const placeholderRegex = /\[\[(\d+)\]\]/g;
    let match;

    while ((match = placeholderRegex.exec(baseText)) !== null) {
      const gapId = parseInt(match[1], 10);
      const gap = gaps.find((g) => g.id === gapId);

      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>{baseText.substring(lastIndex, match.index)}</span>
        );
      }

      if (gap) {
        if (gap.mode === 'input') {
          // Freitext-Input
          const maxLength = Math.max(gap.solution.length, 15);
          const inputWidth = Math.min(maxLength * 8 + 16, 200);

          parts.push(
            <Input
              key={`gap-input-${gapId}`}
              type="text"
              placeholder="…"
              value={previewAnswers[gapId] || ''}
              onChange={(e) =>
                setPreviewAnswers({ ...previewAnswers, [gapId]: e.target.value })
              }
              className="h-7 text-xs inline-block mx-1"
              style={{ width: `${inputWidth}px` }}
            />
          );
        } else if (gap.mode === 'selection') {
          // Selection-Dropdown mit randomisierten Optionen
          const options = [gap.solution, ...(gap.distractors || [])];
          const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
          const maxLength = Math.max(...shuffledOptions.map((o) => o.length), 10);
          const selectWidth = Math.min(maxLength * 8 + 32, 200);

          parts.push(
            <Select
              key={`gap-select-${gapId}`}
              value={previewAnswers[gapId] || ''}
              onValueChange={(value) =>
                setPreviewAnswers({ ...previewAnswers, [gapId]: value })
              }
            >
              <SelectTrigger
                className="h-7 text-xs inline-block mx-1 border border-border"
                style={{ width: `${selectWidth}px` }}
              >
                <SelectValue placeholder="…" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {shuffledOptions.map((option, idx) => (
                  <SelectItem key={idx} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < baseText.length) {
      parts.push(
        <span key={`text-end`}>{baseText.substring(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : <span>{baseText}</span>;
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header mit Preview-Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Lückentext Editor</h3>
            <p className="text-xs text-muted-foreground">
              {!isPreview
                ? 'Markiere Wörter im Text und klicke "Lücke erstellen" um Lücken zu definieren.'
                : 'Schüler-Vorschau: So sehen deine Lernenden den Text.'}
            </p>
          </div>
          {/* Preview-Toggle */}
          <Tabs
            value={isPreview ? 'preview' : 'editor'}
            onValueChange={(v) => {
              setIsPreview(v === 'preview');
              setPreviewAnswers({});
            }}
            className="w-auto"
          >
            <TabsList className="grid w-auto grid-cols-2 h-7">
              <TabsTrigger value="editor" className="text-xs gap-1">
                <Edit className="w-3 h-3" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1">
                <Eye className="w-3 h-3" />
                Vorschau
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Editor-Modus */}
      {!isPreview && (
        <>
          {/* Haupttext-Editor */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Text eingeben</label>
            <Textarea
              ref={textareaRef}
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              placeholder="Gib deinen Text ein. Markiere Wörter, um Lücken zu erstellen..."
              className="min-h-24 text-sm"
            />
          </div>

          {/* Text-Vorschau mit Platzhalter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Editor-Vorschau</label>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm leading-relaxed space-y-1">
              {renderTextWithGaps()}
              {baseText.length === 0 && (
                <span className="italic text-muted-foreground">(Keine Vorschau verfügbar)</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Vorschau-Modus */}
      {isPreview && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Schüler-Ansicht</label>
          <div className="p-4 rounded-lg bg-white border-2 border-border text-sm leading-relaxed">
            {renderPreviewText()}
            {baseText.length === 0 && (
              <span className="italic text-muted-foreground">(Kein Text zum Anzeigen)</span>
            )}
          </div>
        </div>
      )}

      {/* Markierungs-Button (nur im Editor-Modus) */}
      {!isPreview && selectedText && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
          <p className="text-xs font-semibold text-blue-900">
            Markiert: "<strong>{selectedText}</strong>"
          </p>
          <Button
            onClick={handleCreateGap}
            className="w-full h-8 gap-2 text-xs bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Lücke erstellen
          </Button>
        </div>
      )}

      {/* Lücken-Verwaltung (ausgegraut im Vorschau-Modus) */}
      {gaps.length > 0 && (
        <div className={cn('space-y-2', isPreview && 'opacity-40 pointer-events-none')}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">
              Verwaltete Lücken ({gaps.length})
            </label>
            <Badge variant="outline" className="text-xs">
              {gaps.filter((g) => g.mode === 'input').length} Freitext •{' '}
              {gaps.filter((g) => g.mode === 'selection').length} Auswahlmenü
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {gaps.map((gap) => (
              <GapCard
                key={gap.id}
                gap={gap}
                onUpdate={handleUpdateGap}
                onDelete={handleDeleteGap}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leerer Zustand */}
      {!isPreview && gaps.length === 0 && baseText.length > 0 && (
        <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
          Keine Lücken erstellt. Markiere Wörter um zu beginnen.
        </div>
      )}
    </div>
  );
}