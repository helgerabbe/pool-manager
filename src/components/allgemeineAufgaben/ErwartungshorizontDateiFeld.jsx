/**
 * ErwartungshorizontDateiFeld.jsx
 *
 * Upload-Feld für eine vorhandene Musterlösung / einen Erwartungshorizont
 * als Datei (PDF, Word, Bild/Screenshot). Unterstützt zusätzlich das
 * Einfügen eines Screenshots aus der Zwischenablage (Strg+V).
 *
 * PDFs und Bilder werden bei der KI-Generierung des Erwartungshorizonts
 * direkt mitgelesen; Word-Dateien dienen als Archiv für die Lehrkraft.
 */
import React, { useState, useCallback } from 'react';
import { uploadFile } from '@/services/FileService';
import { Button } from '@/components/ui/button';
import { FileUp, X, Loader2, ClipboardPaste, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPT = '.pdf,.doc,.docx,image/*';

export default function ErwartungshorizontDateiFeld({
  fileUrl,
  fileName,
  onChange,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [highlight, setHighlight] = useState(false);

  const upload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      onChange({ url: file_url, name: file.name || 'Screenshot' });
      toast.success('Datei hochgeladen');
    } catch (err) {
      toast.error('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handlePaste = (e) => {
    if (disabled) return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        upload(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
        return;
      }
    }
  };

  const isBild = /\.(png|jpe?g|gif|webp)$/i.test(fileUrl || '');
  const isPdf = /\.pdf$/i.test(fileUrl || '');

  return (
    <div
      className={`space-y-2 p-3 rounded-lg border-2 transition-colors ${
        highlight ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
      }`}
      onPaste={handlePaste}
      onDrop={(e) => { e.preventDefault(); setHighlight(false); if (!disabled) upload(e.dataTransfer.files?.[0]); }}
      onDragOver={(e) => { e.preventDefault(); setHighlight(true); }}
      onDragLeave={() => setHighlight(false)}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vorhandene Lösung als Datei (optional)
      </p>
      <p className="text-xs text-muted-foreground">
        Lade eine fertige Musterlösung als PDF, Word-Datei oder Bild hoch – oder füge einen
        Screenshot mit <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Strg+V</kbd> ein.
        PDFs und Bilder liest die KI beim Generieren mit.
      </p>

      {fileUrl ? (
        <div className="space-y-2">
          {isBild && (
            <img
              src={fileUrl}
              alt={fileName || 'Lösung'}
              className="max-h-56 rounded border border-border object-contain bg-white"
            />
          )}
          {isPdf && (
            <iframe
              src={fileUrl}
              title={fileName || 'PDF'}
              className="w-full h-56 rounded border border-border bg-white"
            />
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="truncate flex-1">{fileName || 'Datei'}</span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline"
            >
              <ExternalLink className="w-3 h-3" /> öffnen
            </a>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive"
                onClick={() => onChange({ url: '', name: '' })}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <label className={`flex items-center gap-2 text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground cursor-pointer hover:text-foreground'}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          {uploading ? 'Wird hochgeladen…' : 'Datei auswählen (PDF, Word, Bild)'}
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      )}

      {!fileUrl && !uploading && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ClipboardPaste className="w-3 h-3" />
          Screenshot einfach hier einfügen
        </p>
      )}
    </div>
  );
}