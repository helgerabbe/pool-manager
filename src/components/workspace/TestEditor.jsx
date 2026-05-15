/**
 * TestEditor.jsx
 *
 * Editor für die Aktivität "Test" mit globalem Scoring und Feedback-System.
 * Datenmodell: { instruction, passingThreshold, passFeedback, failFeedback, questions: [...] }
 * Fragetypen: mc | true_false | solution_word
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, CheckCircle2, Circle, X } from 'lucide-react';

const createDefaultQuestion = () => ({
  id: crypto.randomUUID(),
  type: 'mc',
  question: '',
  points: 1,
  options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]
});

const normalizeQuestionForType = (question, type) => {
  const base = {
    id: question.id,
    type,
    question: question.question || '',
    points: question.points || 1,
  };

  if (type === 'mc') {
    return {
      ...base,
      options: question.options?.length ? question.options : [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]
    };
  }

  if (type === 'true_false') {
    return {
      ...base,
      correctAnswer: typeof question.correctAnswer === 'boolean' ? question.correctAnswer : true,
      explanation: question.explanation || ''
    };
  }

  if (type === 'solution_word') {
    return {
      ...base,
      expectedAnswer: question.expectedAnswer || ''
    };
  }

  return base;
};

export default function TestEditor({ initialData = {}, onChange, readOnly = false }) {
  const [instruction, setInstruction] = useState(initialData.instruction || '');
  const [passingThreshold, setPassingThreshold] = useState(initialData.passingThreshold || 0);
  const [passFeedback, setPassFeedback] = useState(initialData.passFeedback || 'Herzlichen Glückwunsch, du hast den Test bestanden!');
  const [failFeedback, setFailFeedback] = useState(initialData.failFeedback || 'Leider hast du die Mindestpunktzahl nicht erreicht. Bitte versuche es erneut.');
  const [questions, setQuestions] = useState(initialData.questions || []);

  // DATENBRÜCKE ZUM MODAL
  useEffect(() => {
    if (onChange) {
      onChange({ instruction, passingThreshold, passFeedback, failFeedback, questions });
    }
  }, [instruction, passingThreshold, passFeedback, failFeedback, questions]);

  const addQuestion = () => {
    setQuestions([...questions, createDefaultQuestion()]);
  };

  const updateQuestion = (id, updates) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  if (readOnly) {
    return <div className="text-sm text-muted-foreground italic">Vorschau im Read-Only Modus noch nicht implementiert.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Globale Test-Einstellungen */}
      <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-border">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Test-Einstellungen</h3>
        
        <div className="space-y-2">
          <Label>Allgemeine Anweisung / Einleitungstext</Label>
          <Textarea 
            value={instruction} 
            onChange={(e) => setInstruction(e.target.value)} 
            placeholder="z.B. Du hast 30 Minuten Zeit für diesen Test..." 
            className="bg-background" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Bestehensgrenze (Punkte)</Label>
            <Input 
              type="number" 
              min="0" 
              value={passingThreshold} 
              onChange={(e) => setPassingThreshold(Number(e.target.value))} 
              className="bg-background" 
            />
          </div>
          <div className="space-y-2">
            <Label>Feedback bei Bestehen</Label>
            <Input 
              value={passFeedback} 
              onChange={(e) => setPassFeedback(e.target.value)} 
              className="bg-background" 
            />
          </div>
          <div className="space-y-2">
            <Label>Feedback bei Nicht-Bestehen</Label>
            <Input 
              value={failFeedback} 
              onChange={(e) => setFailFeedback(e.target.value)} 
              className="bg-background" 
            />
          </div>
        </div>
      </div>

      {/* Fragen-Liste */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Fragen ({questions.length})</h3>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{index + 1}</span>
                  <select
                    value={q.type || 'mc'}
                    onChange={(e) => updateQuestion(q.id, normalizeQuestionForType(q, e.target.value))}
                    className="h-8 w-[180px] rounded-md border border-input bg-background px-3 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="mc">Multiple Choice</option>
                    <option value="true_false">Richtig / Falsch</option>
                    <option value="solution_word">Lösungswort</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Punkte:</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={q.points} 
                      onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) })} 
                      className="w-16 h-8 text-center" 
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeQuestion(q.id)} 
                    className="text-destructive hover:bg-red-50 hover:text-destructive h-8 px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fragestellung</Label>
                <Textarea 
                  value={q.question} 
                  onChange={(e) => updateQuestion(q.id, { question: e.target.value })} 
                  placeholder="Wie lautet die Frage?" 
                />
              </div>

              {/* Multiple Choice Optionen */}
              {q.type === 'mc' && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                  <Label className="text-xs text-muted-foreground">Antwortmöglichkeiten (Markiere die richtigen Antworten)</Label>
                  {q.options?.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const newOpts = [...q.options];
                          newOpts[optIdx].isCorrect = !newOpts[optIdx].isCorrect;
                          updateQuestion(q.id, { options: newOpts });
                        }} 
                        className="shrink-0"
                      >
                        {opt.isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-muted-foreground/40" />}
                      </button>
                      <Input 
                        value={opt.text} 
                        onChange={(e) => {
                          const newOpts = [...q.options];
                          newOpts[optIdx].text = e.target.value;
                          updateQuestion(q.id, { options: newOpts });
                        }} 
                        placeholder={`Antwort ${optIdx + 1}`} 
                        className={opt.isCorrect ? 'border-green-200 bg-green-50/50' : ''} 
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const newOpts = q.options.filter((_, i) => i !== optIdx);
                          updateQuestion(q.id, { options: newOpts });
                        }} 
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateQuestion(q.id, { options: [...(q.options || []), { text: '', isCorrect: false }] })} 
                    className="text-xs mt-1"
                  >
                    + Option hinzufügen
                  </Button>
                </div>
              )}

              {/* Richtig/Falsch */}
              {q.type === 'true_false' && (
                <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Korrekte Antwort</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={q.correctAnswer === true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateQuestion(q.id, { correctAnswer: true })}
                      >
                        Richtig
                      </Button>
                      <Button
                        type="button"
                        variant={q.correctAnswer === false ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateQuestion(q.id, { correctAnswer: false })}
                      >
                        Falsch
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Erklärung bei falscher Antwort (optional)</Label>
                    <Textarea
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                      placeholder="z.B. Warum ist die Aussage falsch bzw. wie lautet die richtige Einordnung?"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Lösungswort */}
              {q.type === 'solution_word' && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                  <Label className="text-xs text-muted-foreground">Erlaubte Lösungswörter</Label>
                  <Input
                    value={q.expectedAnswer || ''}
                    onChange={(e) => updateQuestion(q.id, { expectedAnswer: e.target.value })}
                    placeholder="z.B. Homepooling; Poolzeit; Zuhause"
                  />
                  <p className="text-[11px] text-muted-foreground">Mehrere erlaubte Antworten mit Semikolon trennen. Groß-/Kleinschreibung wird ignoriert.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>Noch keine Fragen. Erstelle jetzt die erste Frage für diesen Test.</p>
          </div>
        )}

        <Button onClick={addQuestion} size="sm" className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Frage hinzufügen
        </Button>
      </div>
    </div>
  );
}