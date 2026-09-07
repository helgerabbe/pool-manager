/**
 * SlideBildSlot.jsx
 *
 * Bild-Platz einer Folie: im Editor per Strg+V (Snapshot aus der Zwischenablage)
 * oder Dateiauswahl befüllen, in der Anzeige das Bild eingepasst.
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImagePlus, Loader2, X, Clipboard } from 'lucide-react';
import { toast } from 'sonner';

export default function SlideBildSlot({ url = '', modus, onChange }) {
  const fileRef = useRef(null);
  const [laedt, setLaedt] = useState(false);

  const hochladen = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('Bitte ein Bild einfügen oder auswählen.');
      return;
    }
    setLaedt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange?.(file_url);
    } finally {
      setLaedt(false);
    }
  };

  const onPaste = (e) => {
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); hochladen(file); return; }
      }
    }
  };

  if (url) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {modus === 'edit' && (
          <button
            type="button"
            onClick={() => onChange?.('')}
            title="Bild entfernen"
            style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 999, background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, cursor: 'pointer' }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        )}
      </div>
    );
  }

  if (modus !== 'edit') return null;

  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        border: '2px dashed rgba(100,116,139,0.5)', borderRadius: 12, background: 'rgba(148,163,184,0.12)', color: '#475569', fontSize: 20, outline: 'none', cursor: 'text',
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) hochladen(f); e.target.value = ''; }} />
      {laedt ? (
        <><Loader2 style={{ width: 32, height: 32 }} className="animate-spin" /> Bild wird hochgeladen …</>
      ) : (
        <>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clipboard style={{ width: 24, height: 24 }} /> Hier klicken und Bild einfügen (Strg+V)</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid #94a3b8', background: '#fff', fontSize: 18, cursor: 'pointer', color: '#1e293b' }}
          >
            <ImagePlus style={{ width: 20, height: 20 }} /> oder Bilddatei auswählen
          </button>
        </>
      )}
    </div>
  );
}