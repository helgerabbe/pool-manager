import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

export default function QuizInput({ value = [], onChange }) {
  const questions = Array.isArray(value) ? value : [];

  const handleAddQuestion = () => {
    onChange([...questions, { frage: '', antworten: [{ text: '', korrekt: false }] }]);
  };

  const handleUpdateQuestion = (qIdx, field, fieldValue) => {
    const updated = [...questions];
    updated[qIdx] = { ...updated[qIdx], [field]: fieldValue };
    onChange(updated);
  };

  const handleAddAnswer = (qIdx) => {
    const updated = [...questions];
    updated[qIdx].antworten.push({ text: '', korrekt: false });
    onChange(updated);
  };

  const handleUpdateAnswer = (qIdx, aIdx, field, fieldValue) => {
    const updated = [...questions];
    updated[qIdx].antworten[aIdx] = { ...updated[qIdx].antworten[aIdx], [field]: fieldValue };
    onChange(updated);
  };

  const handleRemoveAnswer = (qIdx, aIdx) => {
    const updated = [...questions];
    updated[qIdx].antworten = updated[qIdx].antworten.filter((_, i) => i !== aIdx);
    onChange(updated);
  };

  const handleRemoveQuestion = (qIdx) => {
    onChange(questions.filter((_, i) => i !== qIdx));
  };

  return (
    <div className="space-y-4">
      {questions.map((question, qIdx) => (
        <div key={qIdx} className="p-4 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Frage</label>
              <input
                type="text"
                value={question.frage || ''}
                onChange={(e) => handleUpdateQuestion(qIdx, 'frage', e.target.value)}
                placeholder="Geben Sie die Frage ein..."
                className="w-full px-3 py-2 rounded-lg border border-input text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-6"
              onClick={() => handleRemoveQuestion(qIdx)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>

          {/* Antwortoptionen */}
          <div className="space-y-2 pl-3 border-l-2 border-primary/20">
            <label className="text-xs font-semibold text-muted-foreground">Antwortoptionen</label>
            {question.antworten.map((answer, aIdx) => (
              <div key={aIdx} className="flex items-center gap-2">
                <Checkbox
                  checked={answer.korrekt || false}
                  onCheckedChange={(checked) => 
                    handleUpdateAnswer(qIdx, aIdx, 'korrekt', checked)
                  }
                  className="mt-0.5"
                />
                <input
                  type="text"
                  value={answer.text || ''}
                  onChange={(e) => handleUpdateAnswer(qIdx, aIdx, 'text', e.target.value)}
                  placeholder="Antwort..."
                  className="flex-1 px-2 py-1.5 rounded border border-input text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddAnswer(qIdx)}
              className="gap-2 text-xs mt-1"
            >
              <Plus className="w-3 h-3" /> Antwort hinzufügen
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddQuestion}
        className="gap-2 w-full"
      >
        <Plus className="w-4 h-4" /> Frage hinzufügen
      </Button>
    </div>
  );
}