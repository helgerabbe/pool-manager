/**
 * KIQuizModal.jsx
 *
 * Editor für die Aktivität „KI-Quiz".
 * Lehrkraft legt mehrere Fragen an (Fragestellung + Musterlösung).
 * Schüler tippen freie Textantworten; KI bewertet einmalig anhand der Musterlösung.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Loader2, Save, Trash2, ChevronUp, ChevronDown, Eye, Plus, Bot,
} from 'lucide-react';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const EMPTY_FRAGE = { frage: '', musterloesung: '' };

// ── Einzelfrage-Editor (rechte Seite) ─────────────────────────────────────
function FrageEditor({ frage, onChange }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Frage / Aufgabenstellung</Label>
        <Textarea
          value={frage.frage || ''}
          onChange={(e) => onChange({ ...frage, frage: e.target.value })}
          placeholder="Was sollen die Schüler beantworten?"
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Musterlösung (Grundlage für die KI-Bewertung – nicht direkt sichtbar für Schüler)</Label>
        <Textarea
          value={frage.musterloesung || ''}
          onChange={(e) => onChange({ ...frage, musterloesung: e.target.value })}
          placeholder="Erwartete Antwort / Kernaspekte, auf deren Grundlage die KI bewertet …"
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground bg-violet-50 border border-violet-100 rounded-md px-3 py-2 flex items-start gap-2">
          <Bot className="w-3.5 h-3.5 shrink-0 mt-0.5 text-violet-500" />
          Die KI bewertet die Schülerantwort einmalig anhand dieser Musterlösung und gibt eine kurze qualitative Rückmeldung. Kein Chat.
        </p>
      </div>
    </div>
  );
}

// ── Fragen-Kachel (linke Liste) ────────────────────────────────────────────
function FrageKachel({ frage, index, total, isSelected, onSelect, onDelete, onMoveUp, onMoveDown }) {
  const color = 'border-violet-200 bg-violet-50/50';
  const activeColor = 'border-violet-400 bg-violet-100 ring-1 ring-violet-300';
  const preview = frage.frage?.trim().slice(0, 40) || 'Noch keine Frage eingegeben';

  return (
    <div
      className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer', isSelected ? activeColor : color)}
      onClick={() => onSelect(index)}
    >
      <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
        {index + 1}
      </span>
      <span className="text-xs font-medium flex-1 truncate text-violet-900">{preview}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(index); }} disabled={index === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Nach oben">
          <ChevronUp className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(index); }} disabled={index === total - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Nach unten">
          <ChevronDown className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(index); }} className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600" title="Frage entfernen">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────
export default function KIQuizModal({
  open,
  onOpenChange,
  catalogEntry,
  initialFieldValues = {},
  onSave,
  onCancel,
  onReset,
  isSaving = false,
  parentLernpaketName = '',
}) {
  const [fieldValues, setFieldValues] = useState(initialFieldValues);
  const [fragen, setFragen] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const fv = JSON.parse(JSON.stringify(initialFieldValues || {}));
      setFieldValues(fv);
      const raw = Array.isArray(fv.ki_quiz_fragen) ? [...fv.ki_quiz_fragen] : [];
      setFragen(raw);
      setSelectedIndex(raw.length > 0 ? 0 : -1);
    }
    prevOpenRef.current = open;
  }, [open]);

  const addFrage = useCallback(() => {
    const neu = { id: uid(), ...EMPTY_FRAGE };
    const updated = [...fragen, neu];
    setFragen(updated);
    setSelectedIndex(updated.length - 1);
  }, [fragen]);

  const deleteFrage = useCallback((index) => {
    const updated = fragen.filter((_, i) => i !== index);
    setFragen(updated);
    setSelectedIndex(Math.max(0, Math.min(index, updated.length - 1)));
  }, [fragen]);

  const moveFrage = useCallback((from, to) => {
    if (from === to || from < 0 || to < 0 || from >= fragen.length || to >= fragen.length) return;
    const updated = [...fragen];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setFragen(updated);
    setSelectedIndex(to);
  }, [fragen]);

  const updateFrage = useCallback((index, updated) => {
    setFragen((prev) => prev.map((f, i) => (i === index ? updated : f)));
  }, []);

  const handleSave = () => {
    const payload = { ...fieldValues, ki_quiz_fragen: fragen };
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }
    onSave?.(payload);
  };

  const selectedFrage = fragen[selectedIndex] || null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600" />
            KI-Quiz bearbeiten
          </DialogTitle>
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Lernpaket: <span className="font-medium text-foreground/80">{parentLernpaketName}</span>
            </p>
          )}
        </DialogHeader>

        {/* Einleitung (global) */}
        <div className="shrink-0 px-6 py-3 border-b bg-muted/20">
          <Label className="mb-1.5 block">Einleitung / Kontext (optional)</Label>
          <Textarea
            value={fieldValues.einleitung || ''}
            onChange={(e) => setFieldValues(prev => ({ ...prev, einleitung: e.target.value }))}
            placeholder="Optionaler Einführungstext, der den Schülern vor dem Quiz angezeigt wird …"
            rows={2}
            className="w-full resize-none"
          />
        </div>

        {/* Two-Column Editor */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Linke Spalte: Fragen-Liste */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 flex flex-col shrink-0 overflow-hidden h-48 lg:h-full min-h-0">
            <div className="shrink-0 px-3 py-2 border-b">
              <Button
                size="sm"
                variant="outline"
                onClick={addFrage}
                className="w-full gap-1.5 text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                <Plus className="w-3.5 h-3.5" /> + Frage hinzufügen
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {fragen.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Noch keine Fragen. Füge eine Frage hinzu.
                </p>
              ) : (
                fragen.map((f, i) => (
                  <FrageKachel
                    key={f.id}
                    frage={f}
                    index={i}
                    total={fragen.length}
                    isSelected={selectedIndex === i}
                    onSelect={setSelectedIndex}
                    onDelete={deleteFrage}
                    onMoveUp={(idx) => moveFrage(idx, idx - 1)}
                    onMoveDown={(idx) => moveFrage(idx, idx + 1)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Rechte Spalte: Fragen-Editor */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-6">
              {selectedFrage ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                      Frage #{selectedIndex + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedIndex + 1} von {fragen.length}
                    </span>
                  </div>
                  <FrageEditor
                    frage={selectedFrage}
                    onChange={(updated) => updateFrage(selectedIndex, updated)}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {fragen.length === 0 ? 'Füge links eine Frage hinzu.' : 'Wähle links eine Frage aus.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 px-6 py-4 border-t shrink-0">
          <div className="flex items-center gap-2 mr-auto">
            {onReset && <ActivityResetButton onReset={onReset} disabled={isSaving} />}
          </div>
          <Button variant="outline" onClick={() => onCancel?.()} disabled={isSaving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : <><Save className="w-4 h-4" /> Speichern</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}