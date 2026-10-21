import React from 'react';
import { Loader2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/** Lädt eine Datei hoch und gibt die Datei-Adresse zurück. */
export default function DateiFeld({ accept, label, setze }) {
  const [laedt, setLaedt] = React.useState(false);
  const hoch = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLaedt(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }).finally(() => setLaedt(false));
    setze(file_uri, file.name);
  };
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-2 text-sm text-muted-foreground hover:bg-muted">
      {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{label}
      <input type="file" accept={accept} className="hidden" onChange={hoch} />
    </label>
  );
}