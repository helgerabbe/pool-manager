/**
 * MiniQuizEditor.jsx
 *
 * Editor für Mini-Quiz mit Freitextantworten.
 * Struktur: { questions: [{ question, answers: [{ text, isCorrect }, ...] }, ...] }
 * Limit: max. 12 Fragen
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import QuizGeneratorModal from '@/components/workspace/QuizGeneratorModal';

const MAX_QUESTIONS = 12;

export default function MiniQuizEditor({
  initialData = {},
  onSave,
  onCancel,
  onChange,
  readOnly = false,
  hideActions = false,
}) {
  const [questions, setQuestions] = useState(initialData.questions || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempQuestion, setTempQuestion] = useState('');
  const [tempAnswers, setTempAnswers] = useState([]);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const canAddMore = questions.length < MAX_QUESTIONS;

  // Datenbrücke zum Modal
  useEffect(() => {
    onChange?.({ questions });
  }, [questions]);
  const isAtLimit = questions.length >= MAX_QUESTIONS;

  const handleAddQuestion = () => {
    if (!tempQuestion.trim()) {
      toast.error('Frage ist erforderlich.');
      return;
    }
    if (tempAnswers.length < 2) {
      toast.error('Mindestens 2 Antwortoptionen erforderlich.');
      return;
    }
    if (!tempAnswers.some(a => a.isCorrect)) {
      toast.error('Mindestens 1 richtige Antwort erforderlich.');
      return;
    }
    const newQuestions = [...questions, { question: tempQuestion, answers: tempAnswers }];
    if (newQuestions.length > MAX_QUESTIONS) {
      toast.error(`Maximal ${MAX_QUESTIONS} Fragen erlaubt.`);
      return;
    }
    setQuestions(newQuestions);
    setTempQuestion('');
    setTempAnswers([]);
    onChange?.();
  };

  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setTempQuestion(questions[idx].question);
    setTempAnswers([...questions[idx].answers]);
  };

  const handleSaveEdit = (idx) => {
    if (!tempQuestion.trim()) {
      toast.error('Frage ist erforderlich.');
      return;
    }
    if (tempAnswers.length < 2) {
      toast.error('Mindestens 2 Antwortoptionen erforderlich.');
      return;
    }
    if (!tempAnswers.some(a => a.isCorrect)) {
      toast.error('Mindestens 1 richtige Antwort erforderlich.');
      return;
    }
    const newQuestions = [...questions];
    newQuestions[idx] = { question: tempQuestion, answers: tempAnswers };
    setQuestions(newQuestions);
    setEditingIndex(null);
    setTempQuestion('');
    setTempAnswers([]);
    onChange?.();
  };

  const handleDelete = (idx) => {
    const newQuestions = questions.filter((_, i) => i !== idx);
    setQuestions(newQuestions);
    onChange?.();
  };

  const handleAddAnswer = () => {
    setTempAnswers([...tempAnswers, { text: '', isCorrect: false }]);
  };

  const handleUpdateAnswer = (idx, text, isCorrect) => {
    const newAnswers = [...tempAnswers];
    newAnswers[idx] = { text, isCorrect };
    setTempAnswers(newAnswers);
  };

  const handleRemoveAnswer = (idx) => {
    setTempAnswers(tempAnswers.filter((_, i) => i !== idx));
  };

  const handleGenerateQuestions = (generatedQuestions) => {
    const truncated = generatedQuestions.slice(0, MAX_QUESTIONS);
    if (generatedQuestions.length > MAX_QUESTIONS) {
      toast.warning(`Nur die ersten ${MAX_QUESTIONS} Fragen wurden übernommen.`);
    } else {
      toast.success('Fragen generiert.');
    }
    setQuestions(truncated);
    onChange?.();
    setGeneratorOpen(false);
  };

  const handleSaveAll = () => {
    if (questions.length === 0) {
      toast.error('Mindestens 1 Frage erforderlich.');
      return;
    }
    if (questions.length > MAX_QUESTIONS) {
      toast.error(`Maximal ${MAX_QUESTIONS} Fragen erlaubt.`);
      return;
    }
    onSave?.({ questions });
  };

  return (
    <div className="space-y-4">
      {/* Header mit KI-Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quiz-Fragen</h3>
        {!readOnly && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setGeneratorOpen(true)}
            className="gap-1.5 text-primary text-xs h-7"
          >
            <Sparkles className="w-3 h-3" />
            KI: Generieren
          </Button>
        )}
      </div>

      {/* Neue Frage hinzufügen */}
      {!readOnly && (
        <div className="space-y-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
          <h3 className="text-sm font-semibold text-blue-900">Neue Frage hinzufügen</h3>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Frage *</label>
            <Textarea
              value={tempQuestion}
              onChange={(e) => setTempQuestion(e.target.value)}
              placeholder="z.B. 'Wie heißt die Hauptstadt von Italien?'"
              className="min-h-16 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Antwortoptionen *</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAddAnswer}
                disabled={readOnly}
                className="gap-1 text-xs h-6"
              >
                <Plus className="w-3 h-3" />
                Antwort
              </Button>
            </div>
            <div className="space-y-2">
              {tempAnswers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={answer.isCorrect}
                    onChange={(e) => handleUpdateAnswer(idx, answer.text, e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                    title="Als korrekt markieren"
                  />
                  <Input
                    value={answer.text}
                    onChange={(e) => handleUpdateAnswer(idx, e.target.value, answer.isCorrect)}
                    placeholder={`Antwort ${idx + 1}${answer.isCorrect ? ' (✓ korrekt)' : ''}`}
                    className="text-xs flex-1"
                  />
                  <button
                    onClick={() => handleRemoveAnswer(idx)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleAddQuestion}
            disabled={!tempQuestion.trim() || tempAnswers.length === 0 || !canAddMore}
            className="gap-2 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Frage hinzufügen ({questions.length}/{MAX_QUESTIONS})
          </Button>
        </div>
      )}

      {/* Existierende Fragen */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Fragen ({questions.length}/{MAX_QUESTIONS})
          </p>
          {questions.map((item, idx) => (
            <div key={idx} className="p-3 rounded-lg border bg-card space-y-2">
              {editingIndex === idx ? (
                <>
                  <Textarea
                    value={tempQuestion}
                    onChange={(e) => setTempQuestion(e.target.value)}
                    className="min-h-12 text-sm"
                  />
                  <div className="space-y-2">
                    {tempAnswers.map((answer, aidx) => (
                      <div key={aidx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={answer.isCorrect}
                          onChange={(e) => handleUpdateAnswer(aidx, answer.text, e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Input
                          value={answer.text}
                          onChange={(e) => handleUpdateAnswer(aidx, e.target.value, answer.isCorrect)}
                          placeholder={`Antwort ${aidx + 1}`}
                          className="text-xs flex-1"
                        />
                        <button
                          onClick={() => handleRemoveAnswer(aidx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingIndex(null)}
                      className="text-xs"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(idx)}
                      className="text-xs gap-1"
                    >
                      Speichern
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Frage {idx + 1}</p>
                    <p className="text-sm">{item.question}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Antwortoptionen</p>
                    <div className="space-y-1 text-sm">
                      {item.answers.map((ans, aidx) => (
                        <div key={aidx} className={`px-2 py-1 rounded border ${ans.isCorrect ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                          {ans.isCorrect && '✓ '}{ans.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(idx)}
                        className="text-xs"
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(idx)}
                        className="gap-1 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                        Löschen
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Limit-Hinweis */}
      {!readOnly && isAtLimit && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-center">
          Maximale Anzahl von {MAX_QUESTIONS} Fragen erreicht.
        </p>
      )}

      {/* Leer-State */}
      {questions.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <p>Noch keine Fragen. Erstelle die erste Frage oder verwende die KI-Generierung.</p>
        </div>
      )}

      {/* Action Buttons — nur wenn hideActions nicht gesetzt (d.h. kein übergeordnetes Modal) */}
      {!readOnly && !hideActions && (
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={questions.length === 0}
            className="gap-1.5 ml-auto"
          >
            Speichern & schließen
          </Button>
        </div>
      )}

      {/* KI-Generierungs-Modal */}
      <QuizGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onGenerate={handleGenerateQuestions}
      />
    </div>
  );
}