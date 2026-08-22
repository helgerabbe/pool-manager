/**
 * BildEinfuegenFeld.jsx
 *
 * Kleines, fokussiertes Feld, um ein Bild (z. B. ein abfotografiertes/kopiertes
 * Tabellen-Bild) per Copy & Paste (Strg+V) ODER per Datei-Auswahl einzufügen.
 * Lädt das Bild über die Core.UploadFile-Integration hoch und gibt die
 * resultierende URL via onChange zurück. Zeigt eine kleine Vorschau mit
 * Entfernen-Button. Speichert NICHT selbst — die URL wandert in field_values
 * des Eltern-Formulars und wird mit diesem persistiert.
 */

import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ImagePlus, X, Clipboard, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { istPdfUrl, dateiNameAusUrl } from '@/lib/dateiTyp';

/**
 * @param erlaubtPdf  true = neben Bildern ist auch eine PDF erlaubt
 *                    (2026-08-22, z. B. Kompaktwissen-Übersicht als PDF).
 *                    Eine PDF wird als Datei-Kachel angezeigt, nicht als Bild.
 */
export default function BildEinfuegenFeld({ value, onChange, disabled = false, erlaubtPdf = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file) => {
    const istBild = !!file?.type?.startsWith('image/');
    const istPdf = file?.type === 'application/pdf';
    if (!file || !(istBild || (erlaubtPdf && istPdf))) {
      toast.error(erlaubtPdf ? 'Bitte ein Bild oder eine PDF auswählen.' : 'Bitte ein Bild einfügen oder auswählen.');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success(istPdf ? 'PDF hochgeladen.' : 'Bild eingefügt.');
    } catch (err) {
      toast.error(err?.message || 'Datei konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadFile(file);
          return;
        }
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  if (value) {
    const zeigePdf = istPdfUrl(value);
    return (
      <div className="relative inline-block rounded-lg border border-border overflow-hidden bg-muted/30">
        {zeigePdf ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 pl-3 pr-12 py-3 text-sm hover:bg-muted/60 transition-colors"
            title="PDF in neuem Tab öffnen"
          >
            <FileText className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium text-foreground truncate max-w-[16rem]">
              {dateiNameAusUrl(value) || 'PDF-Datei'}
            </span>
          </a>
        ) : (
          <img src={value} alt="Eingefügtes Bild" className="max-h-48 w-auto object-contain" />
        )}
        {!disabled && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 h-7 w-7"
            title={zeigePdf ? 'PDF entfernen' : 'Bild entfernen'}
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
        disabled ? 'opacity-60' : 'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring cursor-text'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={erlaubtPdf ? 'image/*,application/pdf' : 'image/*'}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Bild wird hochgeladen…
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clipboard className="w-4 h-4" />
            Bild hier hinein <strong className="font-semibold text-foreground">einfügen (Strg+V)</strong>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="gap-1.5 text-xs h-7"
          >
            <ImagePlus className="w-3.5 h-3.5" /> {erlaubtPdf ? 'oder Bild / PDF auswählen' : 'oder Bild auswählen'}
          </Button>
        </div>
      )}
    </div>
  );
}