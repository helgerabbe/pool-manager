import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Upload, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────────
// MarkerCard: Konfigurationskarte für einen einzelnen Marker
// ────────────────────────────────────────────────────────────────────────────────

function MarkerCard({ marker, onUpdate, onDelete }) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);

  const handleLabelChange = (value) => {
    onUpdate(marker.id, { ...marker, label: value });
    setIsEditingLabel(false);
  };

  const handleDescriptionChange = (value) => {
    onUpdate(marker.id, { ...marker, description: value });
  };

  return (
    <Card className="p-3 space-y-2 border border-border/60 bg-card/70">
      {/* Header: Marker ID, Position, Delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
            📍 #{marker.id}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {marker.x.toFixed(1)}% × {marker.y.toFixed(1)}%
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(marker.id)}
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Label</label>
        {isEditingLabel ? (
          <div className="flex gap-1">
            <Input
              type="text"
              value={marker.label}
              onChange={(e) => onUpdate(marker.id, { ...marker, label: e.target.value })}
              className="h-7 text-xs"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleLabelChange(marker.label)}
              className="h-7 text-xs px-2"
            >
              OK
            </Button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingLabel(true)}
            className="px-2 py-1.5 bg-muted/50 rounded text-xs border border-border/40 cursor-pointer hover:bg-muted/70 transition"
          >
            {marker.label || '(leeres Label)'}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Beschreibung (optional)</label>
        <Textarea
          value={marker.description || ''}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="z.B. 'Das ist die Hauptstadt von Deutschland.'"
          className="h-12 text-xs resize-none"
        />
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// ImageLabelingForm: Hauptkomponente
// ────────────────────────────────────────────────────────────────────────────────

export default function ImageLabelingForm({ initialData = {}, onChange }) {
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl || '');
  const [markers, setMarkers] = useState(initialData.markers || []);
  const [isPreview, setIsPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [draggedMarkerId, setDraggedMarkerId] = useState(null);
  const imageContainerRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Callback: Externe Änderungen übermitteln
  // ──────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (onChange) {
      onChange({ imageUrl, markers });
    }
  }, [imageUrl, markers]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Image-Upload Handler
  // ──────────────────────────────────────────────────────────────────────────────

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
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
        setImageUrl(event.target?.result || '');
      };
      reader.readAsDataURL(file);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Marker-Platzierung: Click-to-Place
  // ──────────────────────────────────────────────────────────────────────────────

  const handleImageClick = (e) => {
    if (!imageContainerRef.current || isPreview) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarkerId = Math.max(...markers.map((m) => m.id), -1) + 1;
    const newMarker = {
      id: newMarkerId,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      label: `Marker ${newMarkerId}`,
      description: '',
    };

    setMarkers([...markers, newMarker]);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Marker-Bewegung: Drag-to-Move
  // ──────────────────────────────────────────────────────────────────────────────

  const handleMarkerMouseDown = (e, markerId) => {
    if (isPreview) return;
    e.stopPropagation();
    setDraggedMarkerId(markerId);
  };

  useEffect(() => {
    if (!draggedMarkerId) return;

    const handleMouseMove = (e) => {
      if (!imageContainerRef.current) return;

      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const marker = markers.find((m) => m.id === draggedMarkerId);
      if (marker) {
        const updatedMarker = {
          ...marker,
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        };
        setMarkers(markers.map((m) => (m.id === draggedMarkerId ? updatedMarker : m)));
      }
    };

    const handleMouseUp = () => {
      setDraggedMarkerId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedMarkerId, markers]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Marker aktualisieren
  // ──────────────────────────────────────────────────────────────────────────────

  const handleUpdateMarker = (markerId, updatedMarker) => {
    setMarkers(markers.map((m) => (m.id === markerId ? updatedMarker : m)));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Marker löschen
  // ──────────────────────────────────────────────────────────────────────────────

  const handleDeleteMarker = (markerId) => {
    setMarkers(markers.filter((m) => m.id !== markerId));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Bild mit Marker-Pins (Editor & Vorschau)
  // ──────────────────────────────────────────────────────────────────────────────

  const renderImage = () => {
    return (
      <div
        ref={imageContainerRef}
        onClick={handleImageClick}
        className={cn(
          'relative w-full rounded-lg border-2 border-border bg-muted overflow-hidden',
          !isPreview && imageUrl && 'cursor-crosshair',
          isPreview && imageUrl && 'cursor-auto'
        )}
        style={{ aspectRatio: '4/3', minHeight: '300px' }}
      >
        {imageUrl ? (
          <>
            {/* Hintergrundbild */}
            <img
              src={imageUrl}
              alt="Bildbeschriftungs-Aufgabe"
              className="w-full h-full object-cover"
            />

            {/* Marker-Pins */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
                className={cn(
                  'absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full cursor-move group',
                  draggedMarkerId === marker.id ? 'ring-2 ring-blue-400 scale-110' : 'hover:scale-110',
                  !isPreview && 'bg-red-500 border-2 border-white shadow-lg',
                  isPreview && 'bg-red-400 border-2 border-white shadow-md'
                )}
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  transition: draggedMarkerId !== marker.id ? 'transform 0.1s' : 'none',
                }}
                title={isPreview ? '' : `${marker.label}`}
              >
                {/* Nummer im Pin */}
                <span className="text-xs font-bold text-white">{marker.id}</span>

                {/* Label-Tooltip (nur im Editor) */}
                {!isPreview && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {marker.label}
                  </div>
                )}
              </div>
            ))}

            {/* Vorschau-Input/Select-Elemente */}
            {isPreview &&
              markers.map((marker) => (
                <div
                  key={`preview-${marker.id}`}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${marker.x}%`,
                    top: `${Math.max(marker.y + 4, 5)}%`,
                    transform: 'translate(-50%, 0)',
                  }}
                >
                  <Select
                    value={previewAnswers[marker.id] || ''}
                    onValueChange={(value) =>
                      setPreviewAnswers({ ...previewAnswers, [marker.id]: value })
                    }
                  >
                    <SelectTrigger className="h-7 text-[10px] w-24 bg-white border border-border shadow-sm">
                      <SelectValue placeholder="…" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value={marker.label} className="text-xs">
                        {marker.label}
                      </SelectItem>
                      {markers
                        .filter((m) => m.id !== marker.id)
                        .map((other) => (
                          <SelectItem key={other.id} value={other.label} className="text-xs">
                            {other.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Kein Bild hochgeladen</span>
          </div>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header mit Preview-Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Bildbeschriftungs-Editor</h3>
            <p className="text-xs text-muted-foreground">
              {!isPreview
                ? 'Lade ein Bild hoch und klicke auf Positionen um Marker zu platzieren.'
                : 'Schüler-Vorschau: So sehen deine Lernenden das Bild.'}
            </p>
          </div>

          {/* Preview-Toggle */}
          <Tabs
            value={isPreview ? 'preview' : 'editor'}
            onValueChange={(v) => {
              setIsPreview(v === 'preview');
              setPreviewAnswers({});
            }}
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

      {/* Editor-Modus */}
      {!isPreview && (
        <>
          {/* Image-Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Bild hochladen</label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDropImage}
              className="relative border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20 hover:bg-muted/40 transition cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="space-y-2 pointer-events-none">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Bild hierher ziehen oder klicken zum Auswählen
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bild-Anzeige */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">
          {isPreview ? 'Schüler-Ansicht' : 'Interaktive Karte (klicke um Marker zu setzen)'}
        </label>
        {renderImage()}
      </div>

      {/* Marker-Verwaltung (ausgegraut im Vorschau-Modus) */}
      {markers.length > 0 && (
        <div className={cn('space-y-2', isPreview && 'opacity-40 pointer-events-none')}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">
              Verwaltete Marker ({markers.length})
            </label>
            <Badge variant="outline" className="text-xs">
              Insgesamt {markers.length} Pin{markers.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {markers.map((marker) => (
              <MarkerCard
                key={marker.id}
                marker={marker}
                onUpdate={handleUpdateMarker}
                onDelete={handleDeleteMarker}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leerer Zustand */}
      {!isPreview && markers.length === 0 && imageUrl && (
        <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
          Keine Marker gesetzt. Klicke auf das Bild um Marker zu platzieren.
        </div>
      )}
    </div>
  );
}