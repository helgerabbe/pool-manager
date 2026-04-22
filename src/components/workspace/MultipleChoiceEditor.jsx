/**
 * MultipleChoiceEditor.jsx
 *
 * Editor für Multiple-Choice Aktivitäten.
 * - Aufgabenstellung
 * - Dynamische Fragen mit Antwortmöglichkeiten
 * - Drag & Drop für Sortierung
 * - KI-Generierungs-Button
 */

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import MCGeneratorModal from './MCGeneratorModal';

export default function MultipleChoiceEditor({
  initialData = {},
  onSave,
  onCancel,
  onChange,
  readOnly = false,
  hideActions = false,
}) {
  const [instruction, setInstruction] = useState(initialData.instruction || '');
  const [displayCount, setDisplayCount] = useState(initialData.displayCount || '');
  const [mcItems, setMcItems] = useState(initialData.mcItems || []);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState(
    mcItems.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {})
  );

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;
    if (source.index === destination.index && type === source.droppableId) return;

    if (type === 'questions') {
      const newItems = Array.from(mcItems);
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);
      setMcItems(newItems);
      onChange?.();
    } else if (type.startsWith('options-')) {
      const questionIdx = parseInt(type.split('-')[1]);
      const newItems = [...mcItems];
      const newOptions = [...newItems[questionIdx].options];
      const [removed] = newOptions.splice(source.index, 1);
      newOptions.splice(destination.index, 0, removed);
      newItems[questionIdx] = { ...newItems[questionIdx], options: newOptions };
      setMcItems(newItems);
      onChange?.();
    }
  };

  const updateQuestion = (idx, field, val) => {
    const newItems = [...mcItems];
    newItems[idx] = { ...newItems[idx], [field]: val };
    setMcItems(newItems);
    onChange?.();
  };

  const updateOption = (qIdx, oIdx, field, val) => {
    const newItems = [...mcItems];
    const newOptions = [...newItems[qIdx].options];
    newOptions[oIdx] = { ...newOptions[oIdx], [field]: val };
    newItems[qIdx] = { ...newItems[qIdx], options: newOptions };
    setMcItems(newItems);
    onChange?.();
  };

  const addQuestion = () => {
    const newIdx = mcItems.length;
    setMcItems([
      ...mcItems,
      { question: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] },
    ]);
    setExpandedQuestions({ ...expandedQuestions, [newIdx]: true });
    onChange?.();
  };

  const removeQuestion = (idx) => {
    const newItems = mcItems.filter((_, i) => i !== idx);
    setMcItems(newItems);
    const newExpanded = { ...expandedQuestions };
    delete newExpanded[idx];
    setExpandedQuestions(newExpanded);
    onChange?.();
  };

  const addOption = (qIdx) => {
    const newItems = [...mcItems];
    const newOptions = [...newItems[qIdx].options];
    newOptions.push({ text: '', isCorrect: false });
    newItems[qIdx] = { ...newItems[qIdx], options: newOptions };
    setMcItems(newItems);
    onChange?.();
  };

  const removeOption = (qIdx, oIdx) => {
    const newItems = [...mcItems];
    const newOptions = newItems[qIdx].options.filter((_, i) => i !== oIdx);
    newItems[qIdx] = { ...newItems[qIdx], options: newOptions };
    setMcItems(newItems);
    onChange?.();
  };

  const handleGenerateItems = (items) => {
    setMcItems(items);
    onChange?.();
    setGeneratorOpen(false);
    toast.success('Multiple-Choice-Set generiert.');
  };

  const handleSave = () => {
    if (!instruction.trim()) {
      toast.error('Aufgabenstellung ist erforderlich.');
      return;
    }
    if (mcItems.length === 0) {
      toast.error('Mindestens eine Frage ist erforderlich.');
      return;
    }
    if (mcItems.some(q => !q.question.trim() || q.options.length < 2 || q.options.some(o => !o.text.trim()))) {
      toast.error('Alle Fragen müssen vollständig ausgefüllt sein.');
      return;
    }
    onSave?.({ instruction, displayCount: displayCount ? parseInt(displayCount) : mcItems.length, mcItems });
  };

  return (
    <div className="space-y-4">
      {/* Aufgabenstellung */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Aufgabenstellung</Label>
        <Textarea
          value={instruction}
          onChange={(e) => {
            setInstruction(e.target.value);
            onChange?.();
          }}
          placeholder="z.B. Wählen Sie die korrekten Antworten aus..."
          rows={3}
          className="resize-none text-sm"
          disabled={readOnly}
        />
      </div>

      {/* Display Count */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Anzahl der angezeigten Fragen (optional)</Label>
        <Input
          type="number"
          value={displayCount}
          onChange={(e) => {
            setDisplayCount(e.target.value);
            onChange?.();
          }}
          placeholder="Leer = alle Fragen"
          className="text-sm"
          disabled={readOnly}
          min="1"
        />
        <p className="text-xs text-muted-foreground">Wenn leer: Alle {mcItems.length} Fragen werden angezeigt.</p>
      </div>

      {/* Fragen-Manager */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Fragen ({mcItems.length})</Label>
          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGeneratorOpen(true)}
              disabled={isGenerating}
              className="gap-1.5 text-primary text-xs h-7"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              KI: Generieren
            </Button>
          )}
        </div>

        {mcItems.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions" type="questions">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 rounded-lg border-2 p-3 transition-colors ${
                    snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                  }`}
                >
                  {mcItems.map((item, qIdx) => (
                    <Draggable key={`q-${qIdx}`} draggableId={`q-${qIdx}`} index={qIdx} isDragDisabled={readOnly}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`rounded-lg border transition-all ${
                            snapshot.isDragging ? 'bg-primary/10 border-primary shadow-lg' : 'bg-card border-border'
                          } overflow-hidden`}
                        >
                          {/* Frage-Header */}
                          <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30">
                            {!readOnly && (
                              <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}
                            <span className="w-6 text-xs font-semibold text-muted-foreground flex-shrink-0">
                              {qIdx + 1}.
                            </span>
                            <Input
                              value={item.question}
                              onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                              placeholder="Frage eingeben..."
                              className="h-8 flex-1 text-sm"
                              disabled={readOnly}
                            />
                            <button
                              onClick={() => setExpandedQuestions({ ...expandedQuestions, [qIdx]: !expandedQuestions[qIdx] })}
                              className="p-1 text-muted-foreground hover:text-foreground rounded shrink-0"
                            >
                              {expandedQuestions[qIdx] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            {!readOnly && (
                              <button
                                onClick={() => removeQuestion(qIdx)}
                                className="p-1 text-muted-foreground hover:text-destructive rounded shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Antwortmöglichkeiten */}
                          {expandedQuestions[qIdx] && (
                            <div className="p-3 space-y-2 bg-card">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Antwortmöglichkeiten ({item.options.length})
                              </p>
                              <Droppable droppableId={`options-${qIdx}`} type={`options-${qIdx}`}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`space-y-2 rounded-lg border-2 p-2 transition-colors ${
                                      snapshot.isDraggingOver ? 'border-primary/50 bg-primary/5' : 'border-border/30 bg-muted/10'
                                    }`}
                                  >
                                    {item.options.map((opt, oIdx) => (
                                      <Draggable
                                        key={`o-${qIdx}-${oIdx}`}
                                        draggableId={`o-${qIdx}-${oIdx}`}
                                        index={oIdx}
                                        isDragDisabled={readOnly}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`flex items-center gap-2 rounded-lg p-2 transition-all ${
                                              snapshot.isDragging ? 'bg-primary/10 border border-primary' : 'bg-background border border-border/50'
                                            }`}
                                          >
                                            {!readOnly && (
                                              <div {...provided.dragHandleProps} className="text-muted-foreground/50 shrink-0">
                                                <GripVertical className="w-3 h-3" />
                                              </div>
                                            )}
                                            <Checkbox
                                              checked={opt.isCorrect}
                                              onCheckedChange={(checked) => updateOption(qIdx, oIdx, 'isCorrect', checked)}
                                              disabled={readOnly}
                                              className="shrink-0"
                                              title="Als korrekt markieren"
                                            />
                                            <Input
                                              value={opt.text}
                                              onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)}
                                              placeholder={`Antwort ${oIdx + 1}`}
                                              className="h-7 flex-1 text-xs"
                                              disabled={readOnly}
                                            />
                                            {!readOnly && (
                                              <button
                                                onClick={() => removeOption(qIdx, oIdx)}
                                                disabled={item.options.length <= 2}
                                                className="p-1 text-muted-foreground hover:text-destructive rounded disabled:opacity-30 shrink-0"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                              {!readOnly && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addOption(qIdx)}
                                  className="w-full gap-1.5 border-dashed text-xs h-7"
                                >
                                  <Plus className="w-3 h-3" />
                                  Antwort hinzufügen
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Keine Fragen. Klicke „Frage hinzufügen" um zu beginnen.
          </div>
        )}

        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={addQuestion}
            className="w-full gap-1.5 border-dashed"
          >
            <Plus className="w-3.5 h-3.5" />
            Frage hinzufügen
          </Button>
        )}
      </div>

      {/* Aktions-Buttons — nur wenn hideActions nicht gesetzt (d.h. kein übergeordnetes Modal) */}
      {!readOnly && !hideActions && (
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 ml-auto">
            Speichern & schließen
          </Button>
        </div>
      )}

      {/* KI-Generierungs-Modal */}
      <MCGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onGenerate={handleGenerateItems}
      />
    </div>
  );
}