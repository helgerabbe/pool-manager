import { useState } from 'react';
import { toast } from 'sonner';
import { storageService } from '@/services/storageService';

/**
 * Bilder aus der Zwischenablage für eine Nachricht an den Assistenten:
 * Strg+V mit einem Bild im Puffer → hochladen → als [{ url, name }] halten.
 * Gemeinsam genutzt von Formatwahl (Einstieg) und Gesprächsspalte.
 */
export default function useBildAnhaenge({ disabled = false } = {}) {
  const [bilder, setBilder] = useState([]);
  const [uploading, setUploading] = useState(false);

  const hochladen = async (file) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const antwort = await storageService.upload(file);
      const url = typeof antwort === 'string' ? antwort : antwort?.file_url;
      if (!url) throw new Error('Das Bild konnte nicht gespeichert werden.');
      setBilder((alt) => [...alt, { url, name: file.name || `Bild ${alt.length + 1}` }]);
    } catch (err) {
      toast.error(err?.message || 'Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
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

  const entfernen = (i) => setBilder((alt) => alt.filter((_, idx) => idx !== i));
  const leeren = () => setBilder([]);

  return { bilder, uploading, onPaste, entfernen, leeren };
}