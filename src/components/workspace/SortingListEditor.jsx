/**
 * SortingListEditor.jsx
 *
 * Editor für "Reihenfolge/Sortierung" Aktivitäten.
 * - Aufgabenstellung (Textarea)
 * - Dynamische Liste mit Drag & Drop für Elemente
 * - KI-Button zur Generierung von Sortierlisten
 * - "Weiteres Element hinzufügen" Button
 */

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Sparkles, Loader2 } from 'lucide-react';
import SortingListGeneratorModal from '@/components/workspace/SortingListGeneratorModal';
import { toast } from 'sonner';

export default function SortingListEditor({
  initialData = {},
  onSave,
  onCancel,
  onChange,
  readOnly = false,
  hideActions = false,
}) {
  const [instruction, setInstruction] = useState(initialData.instruction || '');
  const [orderedItems, setOrderedItems] = useState(initialData.orderedItems || []);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const newItems = Array.from(orderedItems);
    const [removed] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, removed);
    setOrderedItems(newItems);
    onChange?.();
  };

  const updateItem = (idx, val) => {
    const newItems = [...orderedItems];
    newItems[idx] = val;
    setOrderedItems(newItems);
    onChange?.();
  };

  const removeItem = (idx) => {
    setOrderedItems(orderedItems.filter((_, i) => i !== idx));
    onChange?.();
  };

  const addItem = () => {
    setOrderedItems([...orderedItems, '']);
    onChange?.();
  };

  const MAX_ITEMS = 12;
  const canAddMore = orderedItems.length < MAX_ITEMS;
  const isAtLimit = orderedItems.length >= MAX_ITEMS;

  const handleGenerateItems = (items) => {
    // Schneide auf max 12 Elemente zu, wenn KI mehr generiert
    const truncatedItems = items.slice(0, MAX_ITEMS);
    if (items.length > MAX_ITEMS) {
      toast.warning(`Nur die ersten ${MAX_ITEMS} Elemente wurden übernommen (max. ${MAX_ITEMS} erlaubt).`);
    } else {
      toast.success('Sortierliste generiert.');
    }
    setOrderedItems(truncatedItems);
    onChange?.();
    setGeneratorOpen(false);
  };

  const handleSave = () => {
    if (!instruction.trim()) {
      toast.error('Aufgabenstellung ist erforderlich.');
      return;
    }
    if (orderedItems.length < 2) {
      toast.error('Mindestens 2 Elemente erforderlich.');
      return;
    }
    if (orderedItems.length > MAX_ITEMS) {
      toast.error(`Maximal ${MAX_ITEMS} Elemente erlaubt.`);
      return;
    }
    if (orderedItems.some(item => !item.trim())) {
      toast.error('Alle Listenelemente müssen ausgefüllt sein.');
      return;
    }
    onSave?.({ instruction, orderedItems });
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
          placeholder="z.B. Sortieren Sie die folgenden Schritte chronologisch..."
          rows={3}
          className="resize-none text-sm"
          disabled={readOnly}
        />
      </div>

      {/* Elemente-Liste mit Drag & Drop */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Sortierliste (korrekte Reihenfolge)</Label>
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

        {orderedItems.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sorting-list">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 rounded-lg border-2 p-3 transition-colors ${
                    snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                  }`}
                >
                  {orderedItems.map((item, idx) => (
                    <Draggable key={`item-${idx}`} draggableId={`item-${idx}`} index={idx} isDragDisabled={readOnly}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 rounded-lg border transition-all ${
                            snapshot.isDragging ? 'bg-primary/10 border-primary shadow-lg' : 'bg-card border-border hover:border-primary/50'
                          } p-2`}
                        >
                          {!readOnly && (
                            <div {...provided.dragHandleProps} className="flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          <span className="w-6 text-xs font-semibold text-muted-foreground flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <Input
                            value={item}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            placeholder={`Element ${idx + 1}`}
                            className="h-8 flex-1 text-sm"
                            disabled={readOnly}
                          />
                          {!readOnly && (
                            <button
                              onClick={() => removeItem(idx)}
                              className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive rounded"
                              title="Element löschen"
                            >
                              <Trash2 className="w-4 h-4" />
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
          </DragDropContext>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Keine Elemente. Klicke „Weiteres Element" um zu beginnen.
          </div>
        )}

        {!readOnly && (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addItem}
              disabled={!canAddMore}
              className="w-full gap-1.5 border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              Weiteres Element hinzufügen
            </Button>
            {isAtLimit && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-center">
                Maximale Anzahl von {MAX_ITEMS} Elementen erreicht.
              </p>
            )}
            {orderedItems.length > 0 && orderedItems.length < 2 && (
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-center">
                Mindestens 2 Elemente erforderlich.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Aktions-Buttons — nur wenn hideActions nicht gesetzt (d.h. kein übergeordnetes Modal) */}
      {!readOnly && !hideActions && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 ml-auto">
            Speichern & schließen
          </Button>
        </div>
      )}

      {/* KI-Generierungs-Modal */}
      <SortingListGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onGenerate={handleGenerateItems}
      />
    </div>
  );
}