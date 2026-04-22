/**
 * TestEditor.jsx
 *
 * Editor für die Aktivität "Test" mit globalem Scoring und Feedback-System.
 * Datenmodell: { instruction, passingThreshold, passFeedback, failFeedback, questions: [...] }
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, CheckCircle2, Circle, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    setQuestions([...questions, { 
      id: crypto.randomUUID(), 
      type: 'mc', 
      question: '', 
      points: 1, 
      options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] 
    }]);
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
          <Button onClick={addQuestion} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Frage hinzufügen
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{index + 1}</span>
                  <Select value={q.type} onValueChange={(val) => updateQuestion(q.id, { type: val })}>
                    <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mc">Multiple Choice</SelectItem>
                      <SelectItem value="text">Freitext-Eingabe</SelectItem>
                    </SelectContent>
                  </Select>
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

              {/* Freitext Musterlösung */}
              {q.type === 'text' && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                  <Label className="text-xs text-muted-foreground">Erwartete Musterlösung / Stichworte (optional)</Label>
                  <Textarea 
                    value={q.expectedAnswer || ''} 
                    onChange={(e) => updateQuestion(q.id, { expectedAnswer: e.target.value })} 
                    placeholder="Was sollte der Schüler hier im Idealfall antworten?" 
                    className="min-h-[80px]" 
                  />
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
      </div>
    </div>
  );
}