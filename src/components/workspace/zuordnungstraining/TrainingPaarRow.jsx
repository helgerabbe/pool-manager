import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';

const TYPEN = [
  { value: 'text', label: 'Text' },
  { value: 'bild', label: 'Bild' },
  { value: 'audio', label: 'Audio' },
];

/**
 * Eine Editor-Zeile im Zuordnungstraining: links Text ODER Bild-/Audio-Upload,
 * rechts der zuzuordnende Begriff.
 */
export default function TrainingPaarRow({ pair, onChange, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const typ = pair.left_typ || 'text';

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...pair, left_url: file_url });
    } catch (err) {
      toast.error('Upload fehlgeschlagen: ' + (err.message || 'Unbekannt'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={typ}
        onChange={(e) => onChange({ ...pair, left_typ: e.target.value })}
        className="h-9 rounded-md border border-input bg-card px-2 text-xs shrink-0"
      >
        {TYPEN.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {typ === 'text' ? (
        <Input
          value={pair.left_text || ''}
          onChange={(e) => onChange({ ...pair, left_text: e.target.value })}
          placeholder="Begriff / Frage"
          className="text-sm flex-1"
        />
      ) : (
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            ref={fileRef}
            type="file"
            accept={typ === 'bild' ? 'image/*' : 'audio/*'}
            className="hidden"
            onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-card text-xs hover:bg-muted shrink-0 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {typ === 'bild' ? 'Bild' : 'Audio'}
          </button>
          {pair.left_url ? (
            typ === 'bild'
              ? <img src={pair.left_url} alt="" className="h-9 w-12 object-cover rounded border border-border shrink-0" />
              : <audio src={pair.left_url} controls preload="none" className="h-8 min-w-0 flex-1" />
          ) : (
            <span className="text-[11px] text-muted-foreground italic truncate">Noch keine Datei</span>
          )}
        </div>
      )}

      <span className="text-muted-foreground text-sm shrink-0">→</span>
      <Input
        value={pair.right || ''}
        onChange={(e) => onChange({ ...pair, right: e.target.value })}
        placeholder="Richtige Zuordnung"
        className="text-sm flex-1"
      />
      <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}