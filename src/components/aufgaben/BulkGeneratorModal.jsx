/**
 * BulkGeneratorModal.jsx
 *
 * 3-Step Modal für KI-basierte Bulk-Generierung von Aufgabenvarianten
 * 
 * Step 1: Input (Anzahl + Generate Button)
 * Step 2: Loading (Skeleton während KI generiert)
 * Step 3: Review (Liste mit Checkboxen + Speichern)
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { secureApi } from '@/api/secureApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wand2, Loader2, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────
// STEP 1: Input Controls
// ─────────────────────────────────────────────────────────────────────────

function Step1Input({ onGenerate, isLoading }) {
  const [anzahl, setAnzahl] = useState(10);

  const handleGenerieren = () => {
    if (anzahl < 1 || anzahl > 20) {
      toast.error('Anzahl muss zwischen 1 und 20 liegen');
      return;
    }
    onGenerate(anzahl);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="text-sm font-medium">
          Anzahl der Varianten: <span className="text-lg font-bold text-primary">{anzahl}</span>
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={anzahl}
          onChange={(e) => setAnzahl(Number(e.target.value))}
          className="w-full h-2 rounded-lg bg-muted appearance-none cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          {anzahl === 1 ? '1 Variante' : `${anzahl} Varianten`}
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleGenerieren} disabled={isLoading} className="flex-1 gap-2">
          <Wand2 className="w-4 h-4" />
          {isLoading ? 'Generiert...' : 'Generieren'}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────

function Step2Loading({ count }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm font-medium">
          KI generiert {count} Aufgabenvarianten...
        </span>
      </div>

      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <div key={i} className="space-y-2 p-3 rounded-lg border border-muted bg-muted/30 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
      ))}

      {count > 5 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          + {count - 5} weitere Varianten...
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 3: Review & Edit
// ─────────────────────────────────────────────────────────────────────────

function AufgabeReviewItem({ item, index, selected, onToggle, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(item.aufgabentext);
  const [editedLoesung, setEditedLoesung] = useState(item.loesung);

  const handleSaveEdit = () => {
    item.aufgabentext = editedText;
    item.loesung = editedLoesung;
    setIsEditing(false);
    toast.success('Aufgabe aktualisiert');
  };

  if (isEditing) {
    return (
      <div className="space-y-2 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Aufgabentext
          </label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-20 px-3 py-2 rounded-lg border border-input text-sm resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Lösung
          </label>
          <textarea
            value={editedLoesung}
            onChange={(e) => setEditedLoesung(e.target.value)}
            className="w-full h-20 px-3 py-2 rounded-lg border border-input text-sm resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditedText(item.aufgabentext);
              setEditedLoesung(item.loesung);
              setIsEditing(false);
            }}
          >
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleSaveEdit} className="gap-1">
            <Check className="w-3 h-3" />
            Speichern
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="mt-1 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2">
          {item.aufgabentext}
        </p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          📝 Lösung: {item.loesung.substring(0, 50)}...
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="shrink-0 h-8 w-8"
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

function Step3Review({ tasks, onSave, isSaving }) {
  const [selected, setSelected] = useState(new Set(tasks.map((_, i) => i)));

  const toggleTask = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tasks.map((_, i) => i)));
    }
  };

  const selectedTasks = Array.from(selected).map((i) => tasks[i]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <label className="text-sm font-medium flex items-center gap-2">
          <Checkbox
            checked={selected.size === tasks.length}
            onCheckedChange={toggleAll}
          />
          Alle auswählen ({selected.size}/{tasks.length})
        </label>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {tasks.map((task, i) => (
          <AufgabeReviewItem
            key={i}
            item={task}
            index={i}
            selected={selected.has(i)}
            onToggle={() => toggleTask(i)}
          />
        ))}
      </div>

      <Button
        onClick={() => onSave(selectedTasks)}
        disabled={isSaving || selectedTasks.length === 0}
        className="w-full gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Speichert...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            {selectedTasks.length} Aufgaben speichern
          </>
        )}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function BulkGeneratorModal({
  open,
  onOpenChange,
  masterAufgabe,
  lernziel,
  fach,
  jahrgangsstufe,
  lernpaketId,
  lernzielId,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1=Input, 2=Loading, 3=Review
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [anzahlRequested, setAnzahlRequested] = useState(10);

  // Mutation 1: Generate via LLM
  const generateMutation = useMutation({
    mutationFn: async (anzahl) => {
      setAnzahlRequested(anzahl);
      const result = await secureApi.generateBulkAufgaben({
        master_aufgabe_text: masterAufgabe.aufgabentext_inhalt || masterAufgabe.aufgabentext,
        loesung_text: masterAufgabe.erwartungshorizont_ki_prompt || 'Siehe Aufgabentext',
        lernziel,
        fach,
        jahrgangsstufe,
        anzahl,
      });
      return result;
    },
    onSuccess: (data) => {
      setGeneratedTasks(data.generated_tasks);
      setStep(3); // Skip loading, go directly to review
      toast.success(`${data.metadata.count} Varianten generiert`);
    },
    onError: (error) => {
      toast.error(`Generierung fehlgeschlagen: ${error.message}`);
      setStep(1);
    },
  });

  // Mutation 2: Save selected tasks
  const saveMutation = useMutation({
    mutationFn: async (selectedTasks) => {
      // Baue Aufgaben-Objekte für DB
      const aufgabenToCreate = selectedTasks.map((task) => ({
        lernpaket_id: lernpaketId,
        lernziel_id: lernzielId || null,
        baustein_typ: 'Ebene-1-Übung',
        aufgabentext_inhalt: task.aufgabentext,
        erwartungshorizont_ki_prompt: task.loesung,
        schwierigkeitsgrad: '1-Stern',
        material_typ: 'Freitext',
      }));

      return secureApi.createBulkAufgaben(aufgabenToCreate);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      toast.success(`${data.created_count} Aufgaben gespeichert`);
      onOpenChange(false);
      setStep(1);
      setGeneratedTasks([]);
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
    },
  });

  const handleGenerate = (anzahl) => {
    setStep(2);
    generateMutation.mutate(anzahl);
  };

  const handleSave = (selectedTasks) => {
    saveMutation.mutate(selectedTasks);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Aufgabenvarianten generieren
          </DialogTitle>
          <DialogDescription>
            {masterAufgabe?.aufgabentext_inhalt?.substring(0, 80)}...
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Input */}
        {step === 1 && (
          <Step1Input onGenerate={handleGenerate} isLoading={generateMutation.isPending} />
        )}

        {/* STEP 2: Loading */}
        {step === 2 && <Step2Loading count={anzahlRequested} />}

        {/* STEP 3: Review */}
        {step === 3 && (
          <Step3Review
            tasks={generatedTasks}
            onSave={handleSave}
            isSaving={saveMutation.isPending}
          />
        )}

        {/* Error Display */}
        {generateMutation.isError && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Generierung fehlgeschlagen</p>
              <p className="text-xs">{generateMutation.error?.message}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setStep(1);
              setGeneratedTasks([]);
            }}
          >
            {step === 3 ? 'Fertig' : 'Abbrechen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}