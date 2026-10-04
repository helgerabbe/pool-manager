import React from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSignedUrl } from '@/hooks/useSignedUrl';

/** Bild-Baustein der Tafel: hochladen bzw. austauschen, mit Bildunterschrift. */
export default function TafelBildBlock({ block, onChange }) {
  const { url } = useSignedUrl(block.url);
  const [laedt, setLaedt] = React.useState(false);
  const hochladen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLaedt(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    setLaedt(false);
    onChange({ url: file_uri });
  };
  return (
    <figure className="flex flex-col items-center gap-2">
      <label className="cursor-pointer">
        {url ? (
          <img src={url} alt={block.inhalt || 'Tafelbild'} className="max-h-[22rem] rounded-lg object-contain" />
        ) : (
          <span className="flex h-40 w-72 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/40 text-sm text-white/70">
            {laedt ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            Bild auswählen
          </span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={hochladen} />
      </label>
      <input
        value={block.inhalt || ''}
        onChange={(e) => onChange({ inhalt: e.target.value })}
        placeholder="Bildunterschrift (optional)"
        className="w-full bg-transparent text-center text-sm text-white/80 outline-none placeholder:text-white/40"
      />
    </figure>
  );
}