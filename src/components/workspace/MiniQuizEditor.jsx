/**
 * MiniQuizEditor.jsx
 *
 * Editor für Mini-Quiz mit Freitextantworten.
 * Struktur: { quizItems: [{ question, correctAnswer }, ...] }
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export default function MiniQuizEditor({
  initialData = {},
  onSave,
  onCancel,
  onChange,
}) {
  const [quizItems, setQuizItems] = useState(initialData.quizItems || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempQuestion, setTempQuestion] = useState('');
  const [tempAnswer, setTempAnswer] = useState('');

  const handleAdd = () => {
    if (!tempQuestion.trim() || !tempAnswer.trim()) return;
    const newItems = [...quizItems, { question: tempQuestion, correctAnswer: tempAnswer }];
    setQuizItems(newItems);
    setTempQuestion('');
    setTempAnswer('');
    onChange?.();
  };

  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setTempQuestion(quizItems[idx].question);
    setTempAnswer(quizItems[idx].correctAnswer);
  };

  const handleSaveEdit = (idx) => {
    if (!tempQuestion.trim() || !tempAnswer.trim()) return;
    const newItems = [...quizItems];
    newItems[idx] = { question: tempQuestion, correctAnswer: tempAnswer };
    setQuizItems(newItems);
    setEditingIndex(null);
    setTempQuestion('');
    setTempAnswer('');
    onChange?.();
  };

  const handleDelete = (idx) => {
    const newItems = quizItems.filter((_, i) => i !== idx);
    setQuizItems(newItems);
    onChange?.();
  };

  const handleSaveAll = () => {
    onSave?.({ quizItems });
  };

  return (
    <div className="space-y-4">
      {/* Neue Frage hinzufügen */}
      <div className="space-y-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
        <h3 className="text-sm font-semibold text-blue-900">Neue Frage hinzufügen</h3>
        
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Frage</label>
          <Textarea
            value={tempQuestion}
            onChange={(e) => setTempQuestion(e.target.value)}
            placeholder="z.B. 'Wie heißt die Hauptstadt von Italien?'"
            className="min-h-16 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Richtige Antwort</label>
          <Input
            value={tempAnswer}
            onChange={(e) => setTempAnswer(e.target.value)}
            placeholder="z.B. 'Rom'"
            className="text-sm"
          />
        </div>

        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!tempQuestion.trim() || !tempAnswer.trim()}
          className="gap-2 w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Frage hinzufügen
        </Button>
      </div>

      {/* Existierende Fragen */}
      {quizItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Fragen ({quizItems.length})
          </p>
          {quizItems.map((item, idx) => (
            <div key={idx} className="p-3 rounded-lg border bg-card space-y-2">
              {editingIndex === idx ? (
                <>
                  <Textarea
                    value={tempQuestion}
                    onChange={(e) => setTempQuestion(e.target.value)}
                    className="min-h-12 text-sm"
                  />
                  <Input
                    value={tempAnswer}
                    onChange={(e) => setTempAnswer(e.target.value)}
                    placeholder="Richtige Antwort"
                    className="text-sm"
                  />
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
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Richtige Antwort</p>
                    <p className="text-sm bg-green-50 px-2 py-1 rounded border border-green-200 text-green-700 inline-block">
                      {item.correctAnswer}
                    </p>
                  </div>
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
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          size="sm"
          onClick={handleSaveAll}
          disabled={quizItems.length === 0}
          className="gap-1.5 ml-auto"
        >
          Speichern & schließen
        </Button>
      </div>
    </div>
  );
}