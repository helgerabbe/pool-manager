import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { uploadFile } from '@/services/FileService';
import { AlertCircle, FileUp, ImagePlus, X, Loader2, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AufgabenstellungSection
 * Aufgabentext + optionales Aufgabenbild.
 * Unterstützt Datei-Upload und Einfügen per Copy & Paste (Ctrl+V / Cmd+V).
 */
export default function AufgabenstellungSection({
  text,
  onTextChange,
  bildUrl,
  onBildUrlChange,
  onUploadingChange,
}) {
  const [uploading, setUploading] = useState(false);
  const [pasteHighlight, setPasteHighlight] = useState(false);
  const hasImage = !!bildUrl;

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const uploadImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
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
  }, [onBildUrlChange]);

  // Globaler Paste-Listener: fängt Strg+V überall im Dokument ab,
  // solange noch kein Bild gesetzt ist und der User nicht in einem Input tippt.
  useEffect(() => {
    if (hasImage) return;
    const handleGlobalPaste = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          uploadImageFile(item.getAsFile());
          return;
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [hasImage, uploadImageFile]);

  const handleBildUpload = (e) => uploadImageFile(e.target.files?.[0]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadImageFile(file);
        return;
      }
    }
  }, [uploadImageFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setPasteHighlight(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) uploadImageFile(file);
  }, [uploadImageFile]);

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
        onPaste={handlePaste}
        placeholder="Aufgabentext eingeben (optional wenn ein Bild hochgeladen wird)…"
        className="w-full px-3 py-2 border border-border rounded-lg min-h-28 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <div
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setPasteHighlight(true); }}
        onDragLeave={() => setPasteHighlight(false)}
        className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
          pasteHighlight ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
        }`}
      >
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
        ) : uploading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen…
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <FileUp className="w-4 h-4" /> Bild auswählen
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBildUpload}
              />
            </label>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClipboardPaste className="w-3.5 h-3.5" />
              Einfügen mit <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Strg+V</kbd>
            </span>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="text-xs text-muted-foreground">Drag &amp; Drop</span>
          </div>
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