/**
 * ImageLabelingEditor.jsx
 *
 * Editor für Bildbeschriftungs-Aufgaben mit:
 * - Bild-Upload
 * - Zielbegriffe-Verwaltung
 * - Distraktoren-Verwaltung
 * - Interaktiver Drag & Drop Vorschau mit relativen Koordinaten (%)
 */

import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Plus, Trash2, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_BADGE_WIDTH = 150;
const DEFAULT_BADGE_HEIGHT = 50;

export default function ImageLabelingEditor({
  initialData,
  onSave,
  onCancel,
  onChange,
  readOnly = false,
}) {
  const [data, setData] = useState(() => ({
    aufgabenstellung: initialData?.aufgabenstellung || '',
    backgroundImage: initialData?.backgroundImage || '',
    dropZones: (initialData?.dropZones || []).map(z => ({
      label: z.label || '',
      x_percent: z.x_percent ?? 50,
      y_percent: z.y_percent ?? 50,
      width: z.width ?? DEFAULT_BADGE_WIDTH,
      height: z.height ?? DEFAULT_BADGE_HEIGHT,
    })),
    distractors: (initialData?.distractors || []).map(d => typeof d === 'string' ? d : d),
  }));

  const [draggedLabel, setDraggedLabel] = useState(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Drag & Resize State
  const [draggingZoneIdx, setDraggingZoneIdx] = useState(null);
  const [resizingZoneIdx, setResizingZoneIdx] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se'
  const [dragStart, setDragStart] = useState(null);
  const [hoveredZoneIdx, setHoveredZoneIdx] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setData(d => ({ ...d, backgroundImage: result.file_url }));
      onChange?.();
      toast.success('Bild hochgeladen.');
    } catch (err) {
      toast.error('Fehler beim Bild-Upload: ' + (err.message || 'Unbekannt'));
    } finally {
      setUploading(false);
    }
  };

  const addDropZone = (label) => {
    setData(d => ({
      ...d,
      dropZones: [...d.dropZones, { label, x_percent: 50, y_percent: 50, width: DEFAULT_BADGE_WIDTH, height: DEFAULT_BADGE_HEIGHT }],
    }));
    onChange?.();
  };

  const updateDropZone = (idx, updates) => {
    setData(d => ({
      ...d,
      dropZones: d.dropZones.map((z, i) =>
        i === idx ? { ...z, ...updates } : z
      ),
    }));
    onChange?.();
  };

  const removeDropZone = (idx) => {
    setData(d => ({
      ...d,
      dropZones: d.dropZones.filter((_, i) => i !== idx),
    }));
    onChange?.();
  };

  const addDistractor = () => {
    setData(d => ({
      ...d,
      distractors: [...d.distractors, ''],
    }));
    onChange?.();
  };

  const updateDistractor = (idx, val) => {
    setData(d => ({
      ...d,
      distractors: d.distractors.map((v, i) => i === idx ? val : v),
    }));
    onChange?.();
  };

  const removeDistractor = (idx) => {
    setData(d => ({
      ...d,
      distractors: d.distractors.filter((_, i) => i !== idx),
    }));
    onChange?.();
  };

  // ── Unplaced Terms Drag & Drop (externe Begriffe auf Bild) ──
  const handleDragStart = (e, label) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', label);
    setDraggedLabel(label);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnImage = (e) => {
    e.preventDefault();
    if (!draggedLabel || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const x_percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const y_percent = Math.max(0, Math.min(100, (y / rect.height) * 100));

    const existingIdx = data.dropZones.findIndex(z => z.label === draggedLabel);
    if (existingIdx >= 0) {
      updateDropZone(existingIdx, { x_percent, y_percent });
    } else {
      addDropZone(draggedLabel);
      // Aktualisierende Koordinate für den gerade hinzugefügten Eintrag
      setData(d => ({
        ...d,
        dropZones: d.dropZones.map((z, i) =>
          i === d.dropZones.length - 1 ? { ...z, x_percent, y_percent } : z
        ),
      }));
    }

    setDraggedLabel(null);
    onChange?.();
  };

  // ── Box-Drag Handler (bereits platzierte Zonen verschieben) ──
  const handleBoxMouseDown = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    
    setDraggingZoneIdx(idx);
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleBoxMouseMove = (e) => {
    if (draggingZoneIdx === null || !dragStart || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const zone = data.dropZones[draggingZoneIdx];
    const dx = currentX - dragStart.x;
    const dy = currentY - dragStart.y;
    
    // Neue Position in Pixeln
    const newPixelX = (zone.x_percent / 100) * rect.width + dx;
    const newPixelY = (zone.y_percent / 100) * rect.height + dy;
    
    // Clamp zu Box-Grenzen
    const clampedX = Math.max(0, Math.min(rect.width, newPixelX));
    const clampedY = Math.max(0, Math.min(rect.height, newPixelY));
    
    // Umrechnung zu Prozent
    const x_percent = (clampedX / rect.width) * 100;
    const y_percent = (clampedY / rect.height) * 100;
    
    updateDropZone(draggingZoneIdx, { x_percent, y_percent });
    setDragStart({ x: currentX, y: currentY });
    onChange?.();
  };

  const handleBoxMouseUp = () => {
    setDraggingZoneIdx(null);
    setDragStart(null);
  };

  // ── Resize Handler ──
  const handleResizeMouseDown = (e, idx, handle) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingZoneIdx(idx);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMouseMove = (e) => {
    if (resizingZoneIdx === null || !resizeHandle || !dragStart || !imageRef.current) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    const zone = data.dropZones[resizingZoneIdx];
    let newWidth = zone.width;
    let newHeight = zone.height;
    
    // Resize basierend auf Handle-Position
    if (resizeHandle.includes('e')) newWidth = Math.max(50, zone.width + dx);
    if (resizeHandle.includes('w')) newWidth = Math.max(50, zone.width - dx);
    if (resizeHandle.includes('s')) newHeight = Math.max(30, zone.height + dy);
    if (resizeHandle.includes('n')) newHeight = Math.max(30, zone.height - dy);
    
    updateDropZone(resizingZoneIdx, { width: newWidth, height: newHeight });
    setDragStart({ x: e.clientX, y: e.clientY });
    onChange?.();
  };

  const handleResizeMouseUp = () => {
    setResizingZoneIdx(null);
    setResizeHandle(null);
    setDragStart(null);
  };

  // Global Mouse Events für Drag & Resize
  useEffect(() => {
    if (draggingZoneIdx !== null || resizingZoneIdx !== null) {
      document.addEventListener('mousemove', draggingZoneIdx !== null ? handleBoxMouseMove : handleResizeMouseMove);
      document.addEventListener('mouseup', draggingZoneIdx !== null ? handleBoxMouseUp : handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', draggingZoneIdx !== null ? handleBoxMouseMove : handleResizeMouseMove);
        document.removeEventListener('mouseup', draggingZoneIdx !== null ? handleBoxMouseUp : handleResizeMouseUp);
      };
    }
  }, [draggingZoneIdx, resizingZoneIdx, resizeHandle, dragStart, data.dropZones]);

  // Alle verfügbaren Begriffe (sowohl in dropZones als auch potenzielle neue)
  const allTerms = [
    ...data.dropZones.map(z => z.label),
    ...data.distractors.filter(d => d && !data.dropZones.some(z => z.label === d)),
  ];
  const unplacedTerms = allTerms.filter(
    term => !data.dropZones.some(z => z.label === term)
  );

  return (
    <div className="space-y-4">
      {/* Aufgabenstellung */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Aufgabenstellung</Label>
        <Textarea
          value={data.aufgabenstellung}
          onChange={e => {
            setData(d => ({ ...d, aufgabenstellung: e.target.value }));
            onChange?.();
          }}
          placeholder="Beschreibe, was die Schüler machen sollen..."
          rows={3}
          disabled={readOnly}
          className="text-sm"
        />
      </div>

      {/* Bild-Upload */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Hintergrundbild</Label>
        <div className="flex items-center gap-3">
          {data.backgroundImage ? (
            <div className="flex-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center justify-between">
              <span className="truncate">✓ Bild hochgeladen</span>
              {!readOnly && (
                <button
                  onClick={() => setData(d => ({ ...d, backgroundImage: '' }))}
                  className="text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-input hover:border-primary/50 cursor-pointer transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs text-muted-foreground">Lädt...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">JPG, PNG – bis 5MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className="hidden"
                disabled={readOnly || uploading}
              />
            </label>
          )}
        </div>
      </div>

      {/* Zielbegriffe-Manager */}
      {!readOnly && (
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Zielbegriffe</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addDropZone('')}
              className="gap-1 text-xs h-7"
            >
              <Plus className="w-3 h-3" /> Begriff
            </Button>
          </div>
          <div className="space-y-2">
            {data.dropZones.map((zone, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={zone.label}
                  onChange={e => {
                    const newLabel = e.target.value;
                    setData(d => ({
                      ...d,
                      dropZones: d.dropZones.map((z, i) =>
                        i === idx ? { ...z, label: newLabel } : z
                      ),
                    }));
                    onChange?.();
                  }}
                  placeholder="z.B. Mitochondrium"
                  className="text-xs flex-1"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {zone.x_percent.toFixed(1)}% / {zone.y_percent.toFixed(1)}%
                </span>
                <button
                  onClick={() => removeDropZone(idx)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distraktoren-Manager */}
      {!readOnly && (
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Distraktoren (Falschantworten)</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={addDistractor}
              className="gap-1 text-xs h-7"
            >
              <Plus className="w-3 h-3" /> Distraktor
            </Button>
          </div>
          <div className="space-y-2">
            {data.distractors.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={d}
                  onChange={e => updateDistractor(idx, e.target.value)}
                  placeholder="Falsche Antwort..."
                  className="text-xs flex-1"
                />
                <button
                  onClick={() => removeDistractor(idx)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag & Drop Editor */}
      {data.backgroundImage && data.dropZones.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Ziehen Sie die Begriffe auf die gewünschte Stelle im Bild. Die gestrichelte Box zeigt den Toleranzbereich.</span>
          </div>

          <div 
            className="relative bg-muted/30 rounded-lg p-4 border border-dashed border-border inline-block max-w-full"
            onDragOver={handleDragOver}
            onDrop={handleDropOnImage}
          >
            {/* Bild mit Drop-Zone */}
            <img
              ref={imageRef}
              src={data.backgroundImage}
              alt="Bildbeschriftung"
              draggable="false"
              onLoad={() => setImageLoaded(true)}
              className="max-w-full h-auto rounded-lg cursor-grab active:cursor-grabbing select-none"
              style={{ maxHeight: '400px' }}
            />

            {/* Drop-Zones visualisieren & interaktiv machen */}
            {imageLoaded && imageRef.current && (
              <div className="absolute inset-0">
                {data.dropZones.map((zone, idx) => {
                  const isHovered = hoveredZoneIdx === idx;
                  const isDragging = draggingZoneIdx === idx;
                  
                  return (
                    <div
                      key={idx}
                      className={`absolute border-2 rounded-lg flex items-center justify-center transition-all ${
                        isDragging
                          ? 'border-primary bg-primary/20 z-50'
                          : isHovered
                          ? 'border-primary/80 bg-primary/10 z-40'
                          : 'border-dashed border-primary/40 bg-primary/5 z-30'
                      }`}
                      style={{
                        left: `${zone.x_percent}%`,
                        top: `${zone.y_percent}%`,
                        width: `${zone.width}px`,
                        height: `${zone.height}px`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isDragging ? 'grabbing' : isHovered ? 'grab' : 'default',
                      }}
                      onMouseDown={(e) => handleBoxMouseDown(e, idx)}
                      onMouseEnter={() => setHoveredZoneIdx(idx)}
                      onMouseLeave={() => setHoveredZoneIdx(null)}
                      title={`${zone.label} – ziehen zum verschieben`}
                    >
                      {/* Label */}
                      <span className="text-xs font-semibold text-primary text-center px-1 line-clamp-2 pointer-events-none">
                        {zone.label}
                      </span>

                      {/* Resize Handles (nur bei Hover sichtbar) */}
                      {isHovered && (
                        <>
                          {['nw', 'ne', 'sw', 'se'].map(handle => (
                            <div
                              key={handle}
                              onMouseDown={(e) => handleResizeMouseDown(e, idx, handle)}
                              className={`absolute w-2 h-2 bg-white border border-primary/60 rounded-sm pointer-events-auto ${
                                handle === 'nw' ? 'top-0 left-0 -translate-x-1 -translate-y-1 cursor-nwse-resize' :
                                handle === 'ne' ? 'top-0 right-0 translate-x-1 -translate-y-1 cursor-nesw-resize' :
                                handle === 'sw' ? 'bottom-0 left-0 -translate-x-1 translate-y-1 cursor-nesw-resize' :
                                'bottom-0 right-0 translate-x-1 translate-y-1 cursor-nwse-resize'
                              }`}
                              title={`Resize ${handle}`}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nicht platzierte Begriffe als Drag-Source */}
          {unplacedTerms.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Nicht platzierte Begriffe:</p>
              <div className="flex flex-wrap gap-2">
                {unplacedTerms.map(term => (
                  <div
                    key={term}
                    draggable
                    onDragStart={(e) => handleDragStart(e, term)}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity"
                  >
                    {term}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Speichern / Abbrechen */}
      {!readOnly && (
        <div className="flex gap-2 border-t pt-3">
          <Button variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={() => onSave(data)} className="ml-auto gap-1.5">
            Speichern & schließen
          </Button>
        </div>
      )}
    </div>
  );
}