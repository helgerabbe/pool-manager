import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

/** Buchseiten, Arbeitsblätter, Folien hochladen (privat). */
export default function MaterialUpload({ materialien = [], onChange }) {
  const [laedt, setLaedt] = useState(false);

  const hochladen = async (e) => {
    const dateien = [...(e.target.files || [])];
    e.target.value = '';
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
        {laedt ? 'Wird hochgeladen …' : 'Buchseiten, Arbeitsblätter, Folien hochladen (PDF oder Bild)'}
        <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={hochladen} disabled={laedt} />
      </label>
    </div>
  );
}