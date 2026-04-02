import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, X, Plus, Upload, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────────
// SortableItemCard: Einzelne sortierbare Karte
// ────────────────────────────────────────────────────────────────────────────────

function SortableItemCard({ id, item, isPreview, onUpdate, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const textareaRef = useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Auto-resize Textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(scrollHeight, 80) + 'px';
    }
  }, [item.content]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onUpdate(id, { ...item, content: event.target?.result || '' });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOverImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate(id, { ...item, content: event.target?.result || '' });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all',
        isDragging && 'shadow-xl ring-2 ring-primary'
      )}
    >
      <Card className="p-4 space-y-3 bg-card/80 hover:bg-card/100 border border-border/50">
        {/* Header: Grip & Delete */}
        <div className="flex items-start justify-between">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'text-muted-foreground hover:text-foreground transition cursor-grab active:cursor-grabbing p-1',
              !isPreview && 'visible',
              isPreview && 'opacity-40 cursor-not-allowed'
            )}
            disabled={isPreview}
          >
            <GripVertical className="w-5 h-5" />
          </button>

          {!isPreview && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Content: Text or Image */}
        {item.type === 'text' ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Text-Inhalt
            </label>
            <Textarea
              ref={textareaRef}
              value={item.content}
              onChange={(e) => onUpdate(id, { ...item, content: e.target.value })}
              placeholder="Gib den Text ein…"
              className={cn(
                'min-h-20 text-sm resize-none overflow-hidden',
                isPreview && 'bg-muted/40 cursor-not-allowed'
              )}
              readOnly={isPreview}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Bild-Inhalt
            </label>
            {item.content ? (
              <div className="space-y-2">
                <img
                  src={item.content}
                  alt="Item"
                  className="max-h-32 max-w-full rounded-lg border border-border/30 object-cover"
                />
                {!isPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate(id, { ...item, content: '' })}
                    className="w-full h-7 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Bild entfernen
                  </Button>
                )}
              </div>
            ) : (
              <div
                onDragOver={handleDragOverImage}
                onDrop={handleDropImage}
                className={cn(
                  'relative border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/10 transition',
                  !isPreview && 'hover:bg-muted/20 cursor-pointer'
                )}
              >
                {!isPreview && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2 pointer-events-none">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground font-semibold">
                        Bild hierher ziehen oder klicken
                      </p>
                    </div>
                  </>
                )}
                {isPreview && (
                  <p className="text-xs text-muted-foreground italic">
                    Kein Bild vorhanden
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────────

export default function SortingTaskForm({ initialData = {}, onChange }) {
  const [items, setItems] = useState(initialData.items || []);
  const [isPreview, setIsPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Callback: Externe Änderungen übermitteln
  // ──────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (onChange) {
      onChange({ items });
    }
  }, [items]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Helper: Shuffle Items
  // ──────────────────────────────────────────────────────────────────────────────

  const shuffleItems = (itemsToShuffle) => {
    const shuffled = [...itemsToShuffle].sort(() => Math.random() - 0.5);
    return shuffled;
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────────────

  const handleAddTextItem = () => {
    const newId = `item-${Date.now()}`;
    const newItem = { id: newId, type: 'text', content: '' };
    setItems([...items, newItem]);
  };

  const handleAddImageItem = () => {
    const newId = `item-${Date.now()}`;
    const newItem = { id: newId, type: 'image', content: '' };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id, updatedItem) => {
    setItems(items.map((item) => (item.id === id ? updatedItem : item)));
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const targetArray = isPreview ? previewItems : items;
      const oldIndex = targetArray.findIndex((item) => item.id === active.id);
      const newIndex = targetArray.findIndex((item) => item.id === over.id);

      const newArray = arrayMove(targetArray, oldIndex, newIndex);

      if (isPreview) {
        setPreviewItems(newArray);
      } else {
        setItems(newArray);
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Toggle Preview
  // ──────────────────────────────────────────────────────────────────────────────

  const handleTogglePreview = (newMode) => {
    setIsPreview(newMode === 'preview');

    if (newMode === 'preview' && !isPreview) {
      // Wechsel zu Vorschau: Items mischen
      setPreviewItems(shuffleItems(items));
    }
  };

  const activeItems = isPreview ? previewItems : items;
  const itemIds = activeItems.map((item) => item.id);

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header mit Preview-Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Sortier-Aufgabe Editor</h3>
            <p className="text-xs text-muted-foreground">
              {!isPreview
                ? 'Definiere die korrekte Reihenfolge der Elemente. Drag-and-Drop zum Ordnen.'
                : 'Schüler-Vorschau: Die Elemente sind gemischt. So sehen Lernende die Aufgabe.'}
            </p>
          </div>

          {/* Preview-Toggle */}
          <Tabs
            value={isPreview ? 'preview' : 'editor'}
            onValueChange={handleTogglePreview}
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

      {/* Editor-Modus: Add Buttons */}
      {!isPreview && (
        <div className="flex gap-2">
          <Button
            onClick={handleAddTextItem}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Text-Block hinzufügen
          </Button>
          <Button
            onClick={handleAddImageItem}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Bild hinzufügen
          </Button>
        </div>
      )}

      {/* Items List mit Drag-and-Drop */}
      {activeItems.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">
              Sortierbare Elemente ({activeItems.length})
            </label>
            {isPreview && (
              <Badge variant="secondary" className="text-xs">
                ✓ Gemischt für Schüler-Ansicht
              </Badge>
            )}
            {!isPreview && (
              <Badge variant="outline" className="text-xs">
                Position #{activeItems.length}
              </Badge>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {activeItems.map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* Index-Badge */}
                    <div className="absolute -left-10 top-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      {index + 1}
                    </div>

                    {/* Item Card */}
                    <SortableItemCard
                      id={item.id}
                      item={item}
                      isPreview={isPreview}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="p-6 rounded-lg bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
          Keine Elemente vorhanden. Klicke auf "Text-Block hinzufügen" oder "Bild hinzufügen" um zu beginnen.
        </div>
      )}

      {/* Editor-Info */}
      {!isPreview && items.length > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <p className="font-semibold">ℹ️ Die aktuelle Reihenfolge definiert die korrekte Lösung</p>
          <p>
            In der Vorschau werden die Elemente automatisch gemischt und Lernende können sie per Drag-and-Drop neu ordnen.
          </p>
        </div>
      )}

      {/* Preview-Info */}
      {isPreview && items.length > 0 && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-400 space-y-1">
          <p className="font-semibold">👁️ Schüler-Vorschau aktiv</p>
          <p>
            Ziehe die Elemente in die richtige Reihenfolge. Im Editor ist die Lösung sichtbar.
          </p>
        </div>
      )}
    </div>
  );
}