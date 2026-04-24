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
import { storageService } from '@/services/storageService';
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
  hideInternalFooter = false, // ← NEU: Ausblenden, wenn das Modal seinen eigenen Footer liefert
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
      // Zentraler Upload-Pfad: erzwingt storageService (inkl. 10 MB-Limit).
      const result = await storageService.upload(file, false);
      const fileUrl = typeof result === 'string' ? result : (result?.file_url || result);

      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error('Upload lieferte keine gültige URL zurück.');
      }

      setData(d => {
        const next = { ...d, backgroundImage: fileUrl };
        // Änderung nach oben melden, damit Modal-State synchron bleibt.
        onChange?.(next);
        return next;
      });
      toast.success('Bild hochgeladen.');
    } catch (err) {
      toast.error('Fehler beim Bild-Upload: ' + (err?.message || 'Unbekannt'));
    } finally {
      setUploading(false);
    }
  };

  // Helfer: State setzen UND den neuen Wert synchron nach oben melden.
  const applyChange = (updater) => {
    setData(d => {
      const next = updater(d);
      onChange?.(next);
      return next;
    });
  };

  const addDropZone = (label) => {
    applyChange(d => ({
      ...d,
      dropZones: [...d.dropZones, { label, x_percent: 50, y_percent: 50, width: DEFAULT_BADGE_WIDTH, height: DEFAULT_BADGE_HEIGHT }],
    }));
  };

  const updateDropZone = (idx, updates) => {
    applyChange(d => ({
      ...d,
      dropZones: d.dropZones.map((z, i) =>
        i === idx ? { ...z, ...updates } : z
      ),
    }));
  };

  const removeDropZone = (idx) => {
    applyChange(d => ({
      ...d,
      dropZones: d.dropZones.filter((_, i) => i !== idx),
    }));
  };

  const addDistractor = () => {
    applyChange(d => ({
      ...d,
      distractors: [...d.distractors, ''],
    }));
  };

  const updateDistractor = (idx, val) => {
    applyChange(d => ({
      ...d,
      distractors: d.distractors.map((v, i) => i === idx ? val : v),
    }));
  };

  const removeDistractor = (idx) => {
    applyChange(d => ({
      ...d,
      distractors: d.distractors.filter((_, i) => i !== idx),
    }));
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
      // Kombiniert: Zone hinzufügen MIT Zielkoordinaten – in einem State-Update.
      applyChange(d => ({
        ...d,
        dropZones: [
          ...d.dropZones,
          { label: draggedLabel, x_percent, y_percent, width: DEFAULT_BADGE_WIDTH, height: DEFAULT_BADGE_HEIGHT },
        ],
      }));
    }

    setDraggedLabel(null);
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
        {!readOnly && <Label className="text-sm font-medium">Aufgabenstellung</Label>}
        {readOnly ? (
          <p className="text-sm leading-relaxed text-foreground">{data.aufgabenstellung || 'Keine Aufgabenstellung definiert.'}</p>
        ) : (
          <Textarea
            value={data.aufgabenstellung}
            onChange={e => {
              const val = e.target.value;
              applyChange(d => ({ ...d, aufgabenstellung: val }));
            }}
            placeholder="Beschreibe, was die Schüler machen sollen..."
            rows={3}
            className="text-sm"
          />
        )}
      </div>

      {/* Bild-Upload (nur im Edit-Modus) */}
      {!readOnly && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Hintergrundbild</Label>
          <div className="flex items-center gap-3">
            {data.backgroundImage ? (
              <div className="flex-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center justify-between">
                <span className="truncate">✓ Bild hochgeladen</span>
                <button
                  onClick={() => applyChange(d => ({ ...d, backgroundImage: '' }))}
                  className="text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-input transition-colors ${uploading ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'}`}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs text-muted-foreground">Lädt hoch…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">JPG, PNG – bis 10 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>
      )}

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
                    applyChange(d => ({
                      ...d,
                      dropZones: d.dropZones.map((z, i) =>
                        i === idx ? { ...z, label: newLabel } : z
                      ),
                    }));
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

      {/* Drag & Drop Editor (nur im Edit-Modus) / Read-Only Ansicht */}
      {data.backgroundImage && data.dropZones.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          {!readOnly && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Ziehen Sie die Begriffe auf die gewünschte Stelle im Bild. Die gestrichelte Box zeigt den Toleranzbereich.</span>
            </div>
          )}

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
              <div className={readOnly ? 'absolute inset-0 pointer-events-none' : 'absolute inset-0'}>
                {data.dropZones.map((zone, idx) => {
                  const isHovered = hoveredZoneIdx === idx;
                  const isDragging = draggingZoneIdx === idx;
                  
                  return (
                    <div
                      key={idx}
                      className={`absolute border-2 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm shadow-sm ${
                        readOnly
                          ? 'border-solid border-white/80 bg-white/35 z-40'
                          : isDragging
                          ? 'border-dashed border-blue-600 bg-white/40 z-50'
                          : isHovered
                          ? 'border-dashed border-blue-500 bg-white/40 z-40'
                          : 'border-dashed border-blue-500/60 bg-white/40 z-30'
                      }`}
                      style={{
                        left: `${zone.x_percent}%`,
                        top: `${zone.y_percent}%`,
                        width: `${zone.width}px`,
                        height: `${zone.height}px`,
                        transform: 'translate(-50%, -50%)',
                        cursor: readOnly ? 'default' : (isDragging ? 'grabbing' : isHovered ? 'grab' : 'default'),
                      }}
                      {...(!readOnly && {
                        onMouseDown: (e) => handleBoxMouseDown(e, idx),
                        onMouseEnter: () => setHoveredZoneIdx(idx),
                        onMouseLeave: () => setHoveredZoneIdx(null),
                      })}
                      title={zone.label}
                    >
                      {/* Label Badge mit solidem Hintergrund */}
                      <span className="px-2 py-1 rounded-md shadow-md text-xs font-bold tracking-wide pointer-events-none bg-blue-600 text-white line-clamp-2 text-center max-w-[calc(100%-8px)]">
                        {zone.label}
                      </span>

                      {/* Resize Handles (nur im Edit-Modus & bei Hover sichtbar) */}
                      {!readOnly && isHovered && (
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

          {/* Nicht platzierte Begriffe als Drag-Source (nur im Edit-Modus) / Wortspeicher (Read-Only) */}
          {(() => {
            const wordsToDisplay = readOnly ? allTerms : unplacedTerms;
            return wordsToDisplay.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {readOnly ? 'Wortspeicher:' : 'Nicht platzierte Begriffe:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {wordsToDisplay.map(term => (
                    <div
                      key={term}
                      draggable={!readOnly}
                      onDragStart={(e) => !readOnly && handleDragStart(e, term)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-opacity ${
                        readOnly
                          ? 'bg-slate-100 border border-slate-300 text-slate-700'
                          : 'bg-primary text-primary-foreground cursor-grab active:cursor-grabbing hover:opacity-90'
                      }`}
                    >
                      {term}
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}



      {/* Speichern / Abbrechen – NUR wenn kein Modal-Footer darum herum liegt */}
      {!readOnly && !hideInternalFooter && (
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