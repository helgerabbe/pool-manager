import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, X } from 'lucide-react';

/**
 * Kleiner Thumbnail-Upload für eine Katalog-Aktivität. Zeigt das aktuelle
 * Symbolbild (falls vorhanden) und erlaubt das Hochladen/Austauschen oder
 * Entfernen. Speichert die Bild-URL im Feld `thumbnail_url` der Aktivität.
 */
export default function AktivitaetThumbnailUpload({ value, onChange, disabled = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange?.(file_url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-xl border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
        {value ? (
          <img src={value} alt="Thumbnail" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {value ? 'Austauschen' : 'Thumbnail hochladen'}
        </Button>
        {value && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            onClick={() => onChange?.('')}
            title="Thumbnail entfernen"
          >
            <X className="w-3.5 h-3.5 text-destructive" />
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}