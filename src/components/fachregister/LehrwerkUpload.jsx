import React from 'react';
import { Upload, Loader2, FileImage } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/** Lehrwerksseiten hochladen (privat). */
export default function LehrwerkUpload({ dateien = [], onChange, label = 'Lehrwerksseiten hochladen' }) {
  const [laedt, setLaedt] = React.useState(false);
  const hochladen = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    setLaedt(true);
    const neu = await Promise.all(files.map(async (f) => ({
      file_uri: (await base44.integrations.Core.UploadPrivateFile({ file: f })).file_uri, name: f.name,
    })));
    await onChange([...dateien, ...neu]);
    setLaedt(false);
    e.target.value = '';
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {dateien.map((d, i) => (
        <span key={i} className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs">
          <FileImage className="h-3 w-3" /> {d.name}
          <button onClick={() => onChange(dateien.filter((_, j) => j !== i))} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
        </span>
      ))}
      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {label}
        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={hochladen} disabled={laedt} />
      </label>
    </div>
  );
}