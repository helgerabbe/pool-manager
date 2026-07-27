/**
 * components/workspace/lernpaketWizard/WizardMaterialUpload.jsx
 *
 * Aufgabeneditor Etappe 2 (2026-07-27): Optionaler Material-Upload im
 * Vorschlags-Briefing. Hochgeladene Dateien (Bilder, Texte, PDFs …)
 * werden der KI bei der Ideen-Erstellung als inhaltliche Grundlage
 * mitgegeben und können später an den neuen Aktivitäten gespeichert werden.
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Paperclip, Loader2, X, FileText } from 'lucide-react';

export default function WizardMaterialUpload({ materialien = [], onChange, disabled = false }) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const neue = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        neue.push({ url: file_url, name: file.name });
      }
      onChange([...materialien, ...neue]);
    } catch (err) {
      console.error('[WizardMaterialUpload] upload failed', err);
      toast.error('Material-Upload fehlgeschlagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const remove = (idx) => onChange(materialien.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1.5">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFiles} />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          Materialien hochladen (optional)
        </button>
        <span className="text-[11px] text-muted-foreground">
          Bilder, Texte, PDFs — die KI nutzt sie als Grundlage für die Vorschläge.
        </span>
      </div>
      {materialien.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {materialien.map((m, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-background text-[11px]">
              <FileText className="w-3 h-3 text-primary" />
              <span className="max-w-[160px] truncate">{m.name}</span>
              <button type="button" onClick={() => remove(idx)} disabled={disabled} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}