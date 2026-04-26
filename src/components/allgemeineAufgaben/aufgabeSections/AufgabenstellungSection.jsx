import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { uploadFile } from '@/services/FileService';
import { AlertCircle, FileUp, ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AufgabenstellungSection
 * Aufgabentext + optionales Aufgabenbild.
 * 1:1 aus AufgabeCreateView extrahiert (nur in eigene Datei verschoben).
 */
export default function AufgabenstellungSection({
  text,
  onTextChange,
  bildUrl,
  onBildUrlChange,
  onUploadingChange,
}) {
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleBildUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      onBildUrlChange(file_url);
      toast.success('Bild hochgeladen');
    } catch (err) {
      toast.error('Bild-Upload fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>
        Aufgabenstellung <span className="text-destructive">*</span>
        <span className="text-xs font-normal text-muted-foreground ml-2">
          (Text, Bild oder beides)
        </span>
      </Label>

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Aufgabentext eingeben (optional wenn ein Bild hochgeladen wird)…"
        className="w-full px-3 py-2 border border-border rounded-lg min-h-28 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <ImagePlus className="w-3.5 h-3.5" /> Aufgaben-Bild / Screenshot (optional)
        </p>

        {bildUrl ? (
          <div className="relative inline-block">
            <img
              src={bildUrl}
              alt="Aufgabenbild"
              className="max-h-48 rounded border border-border object-contain"
            />
            <button
              type="button"
              onClick={() => onBildUrlChange('')}
              className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen…
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" /> Bild auswählen (JPG, PNG, GIF…)
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBildUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {!text.trim() && !bildUrl && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <AlertCircle className="w-3 h-3" /> Bitte Text eingeben oder ein Bild hochladen.
        </div>
      )}
    </div>
  );
}