/**
 * TextLesenBilderUploader.jsx
 *
 * Optionaler Bildupload für die Aktivität „Text lesen" — bis zu 3 Bilder.
 * Unterstützt zwei Wege:
 *   1. Klassischer Datei-Upload (Klick auf Button → Dateiauswahl)
 *   2. Copy & Paste: Wenn das Modal fokussiert ist, kann die Lehrkraft
 *      einen Screenshot mit Strg+V / Cmd+V direkt einfügen. Wir hören
 *      auf das globale `paste`-Event und filtern auf Bild-Items.
 *
 * Speichert eine Liste von Bild-URLs unter dem Feldnamen `bilder` im
 * fieldValues-Objekt. Jeder Eintrag ist ein Objekt:
 *   { url: string, caption?: string }
 * Die optionale Bildunterschrift hilft beim späteren Moodle-Export
 * (Alt-Text / Caption).
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImagePlus, X, Loader2, ClipboardPaste } from 'lucide-react';

const MAX_BILDER = 3;

export default function TextLesenBilderUploader({
  value = [],
  onChange,
  disabled = false,
}) {
  const bilder = Array.isArray(value) ? value : [];
  const [uploading, setUploading] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef(null);

  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const slotsFree = MAX_BILDER - bilder.length;
    if (slotsFree <= 0) return;
    const toUpload = Array.from(files).slice(0, slotsFree);

    setUploading(true);
    try {
      const uploads = await Promise.all(
        toUpload.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return { url: file_url, caption: '' };
        })
      );
      onChange?.([...bilder, ...uploads]);
    } catch (err) {
      console.error('[TextLesenBilderUploader] Upload fehlgeschlagen:', err);
    } finally {
      setUploading(false);
    }
  }, [bilder, onChange]);

  const handleFileInputChange = (e) => {
    uploadFiles(e.target.files);
    // Reset, damit dieselbe Datei nochmal gewählt werden kann
    e.target.value = '';
  };

  const handleRemove = (idx) => {
    const next = bilder.filter((_, i) => i !== idx);
    onChange?.(next);
  };

  const handleCaptionChange = (idx, caption) => {
    const next = bilder.map((b, i) => (i === idx ? { ...b, caption } : b));
    onChange?.(next);
  };

  // Paste-Handler: globales Event abfangen, Bilder aus der Zwischenablage extrahieren.
  // Wir greifen nur, wenn der Fokus NICHT in einem Text-Input/Textarea liegt,
  // damit normaler Text-Paste in Textfeldern weiterhin funktioniert.
  useEffect(() => {
    if (disabled) return;
    const handler = async (e) => {
      const active = document.activeElement;
      const tag = active?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || active?.isContentEditable;
      // Bei Fokus in einem Textfeld: Paste-Event ignorieren (außer es enthält NUR Bilder).
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter((it) => it.type?.startsWith('image/'));
      if (imageItems.length === 0) return;
      // Wenn Text-Eingabe aktiv und der Paste auch Text enthält → Text-Paste vorrang lassen.
      const hasText = items.some((it) => it.type === 'text/plain');
      if (isEditable && hasText) return;

      e.preventDefault();
      const files = imageItems
        .map((it) => it.getAsFile())
        .filter(Boolean);
      if (files.length > 0) {
        setPasteHint(true);
        await uploadFiles(files);
        setTimeout(() => setPasteHint(false), 1500);
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [disabled, uploadFiles]);

  const reachedLimit = bilder.length >= MAX_BILDER;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Bilder (optional)
          <span className="text-xs text-muted-foreground ml-2 font-normal">
            {bilder.length}/{MAX_BILDER}
          </span>
        </Label>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>Strg/Cmd+V zum Einfügen</span>
        </div>
      </div>

      {/* Bildvorschauen */}
      {bilder.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {bilder.map((bild, idx) => (
            <div
              key={`${bild.url}-${idx}`}
              className="relative rounded-lg border border-border bg-muted/30 overflow-hidden group"
            >
              <div className="aspect-video bg-muted flex items-center justify-center">
                <img
                  src={bild.url}
                  alt={bild.caption || `Bild ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                  title="Bild entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <input
                type="text"
                value={bild.caption || ''}
                onChange={(e) => handleCaptionChange(idx, e.target.value)}
                placeholder="Bildunterschrift (optional)"
                disabled={disabled}
                className="w-full px-2 py-1.5 text-xs border-t border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload-Button + Paste-Hint */}
      {!reachedLimit && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
            {uploading ? 'Wird hochgeladen…' : 'Bild hochladen'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          {pasteHint && (
            <span className="text-xs text-green-700 font-medium">
              Bild aus Zwischenablage übernommen ✓
            </span>
          )}
        </div>
      )}

      {reachedLimit && (
        <p className="text-xs text-muted-foreground italic">
          Maximale Anzahl ({MAX_BILDER}) erreicht. Entferne ein Bild, um ein neues hinzuzufügen.
        </p>
      )}
    </div>
  );
}