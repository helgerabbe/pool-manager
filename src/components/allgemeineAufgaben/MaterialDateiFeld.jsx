/**
 * MaterialDateiFeld.jsx
 *
 * Universelles Upload-Feld für Materialien einer Aufgabensequenz:
 * Datei auswählen ODER (bei Bildern) direkt aus der Zwischenablage einfügen
 * (Strg+V / Screenshot). Lädt über Core.UploadFile hoch und gibt die
 * resultierende URL via onChange zurück. Speichert nicht selbst.
 */

import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Clipboard, FileCheck2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPT = {
  bild: 'image/*',
  pdf: 'application/pdf',
  audio: 'audio/*',
  video: 'video/*',
  text: '.txt,.md,.doc,.docx,.rtf,application/pdf',
};

export default function MaterialDateiFeld({ value, onChange, materialTyp = 'bild', disabled = false, maxMB = null }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const istBild = materialTyp === 'bild';

  const upload = async (file) => {
    if (!file) return;
    // Optionale Größenbegrenzung (z. B. Ton- und Videodateien).
    if (maxMB && file.size > maxMB * 1024 * 1024) {
      toast.error(`Die Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximal erlaubt sind ${maxMB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success('Material hochgeladen.');
    } catch (err) {
      toast.error(err?.message || 'Datei konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e) => {
    if (disabled || !istBild) return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          upload(file);
          return;
        }
      }
    }
  };

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  if (value) {
    return (
      <div className="relative rounded-lg border border-border bg-muted/30 p-2">
        {istBild ? (
          <img src={value} alt="Material" className="max-h-48 w-auto object-contain mx-auto" />
        ) : materialTyp === 'audio' ? (
          <audio src={value} controls className="w-full" />
        ) : materialTyp === 'video' ? (
          <video src={value} controls className="w-full max-h-48" />
        ) : (
          <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary underline break-all">
            <FileCheck2 className="w-4 h-4 shrink-0" /> Hochgeladene Datei öffnen
          </a>
        )}
        {!disabled && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 h-7 w-7"
            title="Datei entfernen"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onPaste={handlePaste}
      tabIndex={disabled ? -1 : 0}
      className={`rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-center transition-colors ${
        disabled ? 'opacity-60' : 'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT[materialTyp] || undefined}
        onChange={handleSelect}
        className="hidden"
        disabled={disabled}
      />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Datei wird hochgeladen…
        </div>
      ) : (
        <div className="space-y-2">
          {istBild && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Clipboard className="w-4 h-4" />
              Screenshot hier <strong className="font-semibold text-foreground">einfügen (Strg+V)</strong>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="gap-1.5 text-xs h-7"
          >
            <Upload className="w-3.5 h-3.5" /> {istBild ? 'oder Datei auswählen' : 'Datei auswählen'}
          </Button>
        </div>
      )}
    </div>
  );
}