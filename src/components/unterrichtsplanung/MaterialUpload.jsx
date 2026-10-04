import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, FileText, Loader2, ClipboardPaste } from 'lucide-react';

/** Buchseiten, Arbeitsblätter, Folien hochladen (privat). */
export default function MaterialUpload({ materialien = [], onChange }) {
  const [laedt, setLaedt] = useState(false);

  const hochladen = (e) => {
    const dateien = [...(e.target.files || [])];
    e.target.value = '';
    return laden(dateien);
  };

  const einfuegen = (e) => {
    const dateien = [...(e.clipboardData?.files || [])].map((f, i) =>
      f.name && f.name !== 'image.png' ? f : new File([f], `Snapshot-${Date.now()}-${i + 1}.png`, { type: f.type })
    );
    if (!dateien.length) return;
    e.preventDefault();
    laden(dateien);
  };

  const laden = async (dateien) => {
    if (!dateien.length) return;
    setLaedt(true);
    const neu = await Promise.all(dateien.map(async (f) => {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
      return { file_uri, name: f.name };
    }));
    setLaedt(false);
    onChange([...materialien, ...neu]);
  };

  return (
    <div className="space-y-2">
      {materialien.map((m, i) => (
        <div key={m.file_uri} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate">{m.name}</span>
          <button type="button" onClick={() => onChange(materialien.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50">
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {laedt ? 'Wird hochgeladen …' : 'Buchseiten, Arbeitsblätter, Foliensätze hochladen (PDF, Bild, PowerPoint, Word)'}
        <input type="file" multiple accept=".pdf,image/*,.ppt,.pptx,.doc,.docx" className="hidden" onChange={hochladen} disabled={laedt} />
      </label>
      <div
        tabIndex={0}
        onPaste={einfuegen}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground outline-none focus:border-primary focus:bg-primary/5"
      >
        <ClipboardPaste className="h-4 w-4" />
        Hier klicken und mit Strg+V aus der Zwischenablage einfügen (Screenshot, Bild, Datei)
      </div>
    </div>
  );
}