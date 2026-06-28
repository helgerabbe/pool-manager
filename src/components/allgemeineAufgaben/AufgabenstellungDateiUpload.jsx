/**
 * AufgabenstellungDateiUpload.jsx
 *
 * Kleiner, fokussierter Uploader für die OPTIONALE digitale Aufgabenstellung
 * einer Handlungsaufgabe (PDF, Doc oder Bild). Unterstützt:
 *  - Datei auswählen (Button)
 *  - Einfügen aus der Zwischenablage (Strg+V / Button) – ohne Screenshot-Umweg.
 *
 * Das ist KEIN Abgabekanal, sondern eine digitale Sicherung der Aufgabenstellung,
 * damit Schüler den Auftrag nachlesen können, falls der analoge Zettel fehlt.
 */

import React, { useRef, useState } from 'react';
import { storageService } from '@/services/storageService';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Clipboard, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPT = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';

export default function AufgabenstellungDateiUpload({ fileUrl, fileName, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await storageService.upload(file, false);
      const url = typeof result === 'string' ? result : (result?.file_url || result);
      if (!url || typeof url !== 'string') throw new Error('Upload lieferte keine gültige URL zurück.');
      onChange({ url, name: file.name || 'Aufgabenstellung' });
      toast.success('Aufgabenstellung hochgeladen.');
    } catch (err) {
      toast.error('Fehler beim Upload: ' + (err?.message || 'Unbekannt'));
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async (e) => {
    if (uploading) return;
    const items = Array.from(e.clipboardData?.items || []);
    const fileItem = items.find((it) => it.kind === 'file');
    if (!fileItem) return;
    e.preventDefault();
    await handleFile(fileItem.getAsFile());
  };

  const handleClipboardButton = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/') || t === 'application/pdf');
        if (type) {
          const blob = await item.getType(type);
          const ext = type === 'application/pdf' ? 'pdf' : type.split('/')[1];
          const file = new File([blob], `aufgabenstellung.${ext}`, { type });
          await handleFile(file);
          return;
        }
      }
      toast.error('Keine passende Datei in der Zwischenablage gefunden.');
    } catch {
      toast.error('Zugriff auf Zwischenablage verweigert. Bitte Strg+V im Feld versuchen.');
    }
  };

  return (
    <div onPaste={handlePaste}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
        disabled={uploading}
      />

      {fileUrl ? (
        <div className="px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 flex items-center justify-between gap-3">
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate flex items-center gap-2 hover:underline"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{fileName || 'Aufgabenstellung hochgeladen'}</span>
          </a>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-7 text-xs">
              Ersetzen
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ url: '', name: '' })} className="h-7 text-xs text-green-700 hover:text-green-900">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors ${
              uploading ? 'border-input opacity-60 cursor-not-allowed' : 'border-input hover:border-primary hover:bg-primary/5 cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Lädt hoch…</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Datei auswählen</span>
                <span className="text-xs text-muted-foreground">(PDF, Doc, JPG, PNG – bis 10 MB, oder Strg+V)</span>
              </>
            )}
          </button>
          {!uploading && (
            <button
              type="button"
              onClick={handleClipboardButton}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-input text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Aus Zwischenablage einfügen
            </button>
          )}
        </div>
      )}
    </div>
  );
}