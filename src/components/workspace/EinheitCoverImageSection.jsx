import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeFunction } from '@/utils/functionsHelper';
import { Button } from '@/components/ui/button';
import { ImageIcon, Wand2, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Zeigt das aktuelle Titelbild der Einheit und erlaubt:
 *  - Upload eines eigenen Bildes (empfohlen: 16:9)
 *  - KI-generiertes Bild auf Basis von Titel + Fach
 *  - Bild löschen
 *
 * Speichert die URL direkt über updateEinheitSecure.
 */
export default function EinheitCoverImageSection({ einheit, canEdit }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const currentUrl = einheit.cover_image_url || null;

  const save = async (url) => {
    await invokeFunction('updateEinheitSecure', {
      einheit_id: einheit.id,
      cover_image_url: url,
    });
    await queryClient.refetchQueries({ queryKey: ['workspace-data', einheit.id] });
    await queryClient.refetchQueries({ queryKey: ['einheiten-list-secure'] });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien erlaubt (JPG, PNG, WebP).');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await save(file_url);
      toast.success('Titelbild gespeichert.');
    } catch {
      toast.error('Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = `Ein ansprechendes, schülergerechtes Titelbild für eine Schuleinheit zum Thema "${einheit.titel_der_einheit}" im Fach ${einheit.fach}. Klasse ${einheit.jahrgangsstufe || ''}. Breites Querformat (16:9), modernes, freundliches Illustrationsstil, keine Textelemente, helle warme Farben.`;
      const { url } = await base44.integrations.Core.GenerateImage({ prompt });
      await save(url);
      toast.success('KI-Titelbild erstellt und gespeichert.');
    } catch {
      toast.error('KI-Generierung fehlgeschlagen.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await save(null);
      toast.success('Titelbild entfernt.');
    } catch {
      toast.error('Fehler beim Entfernen.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Titelbild der Einheit</span>
        <span className="text-xs text-muted-foreground ml-1">(wird im Schülerbereich angezeigt)</span>
      </div>

      {/* Vorschau */}
      <div
        className="relative w-full rounded-xl border overflow-hidden bg-muted/30"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Lade-Overlay beim Generieren/Uploaden */}
        {(generating || uploading) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60 text-white rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">
              {generating ? 'KI erstellt Titelbild … (ca. 10–15 Sek.)' : 'Bild wird hochgeladen …'}
            </p>
          </div>
        )}

        {currentUrl ? (
          <>
            <img
              src={currentUrl}
              alt="Titelbild"
              className="w-full h-full object-cover"
            />
            {canEdit && !generating && !uploading && (
              <button
                onClick={handleDelete}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-destructive transition-colors"
                title="Bild entfernen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <ImageIcon className="w-10 h-10 opacity-20" />
            <p className="text-xs">Kein Titelbild vorhanden</p>
          </div>
        )}
      </div>

      {/* Aktionen */}
      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={uploading || generating}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Upload className="w-3.5 h-3.5" />
            }
            Bild hochladen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
            disabled={uploading || generating}
            onClick={handleGenerate}
          >
            {generating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Wand2 className="w-3.5 h-3.5" />
            }
            KI-Bild erstellen
          </Button>
          <p className="text-[10px] text-muted-foreground ml-auto">Empfohlen: 16:9 · min. 800 × 450 px</p>
        </div>
      )}
    </div>
  );
}