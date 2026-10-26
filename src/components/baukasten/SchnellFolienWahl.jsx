import React from 'react';
import { FileText, Film, AppWindow } from 'lucide-react';
import { leereFolie, filmFolie, htmlFolie } from '@/lib/schnellFolien';

/** Schnellwahl: leere Inhaltsfolie, Filmfolie (nur Adresse angeben) oder interaktive Seite. */
export default function SchnellFolienWahl({ onFolie }) {
  const [art, setArt] = React.useState(null);
  const [url, setUrl] = React.useState('');
  const fertig = () => { if (!url.trim()) return; onFolie(art === 'film' ? filmFolie(url.trim()) : htmlFolie(url.trim())); setUrl(''); setArt(null); };
  const knopf = 'flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-xs hover:border-primary hover:text-primary';
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => onFolie(leereFolie())} className={knopf}><FileText className="h-5 w-5" /> Leere Inhaltsfolie</button>
        <button onClick={() => setArt('film')} className={`${knopf} ${art === 'film' ? 'border-primary text-primary' : ''}`}><Film className="h-5 w-5" /> Film</button>
        <button onClick={() => setArt('html')} className={`${knopf} ${art === 'html' ? 'border-primary text-primary' : ''}`}><AppWindow className="h-5 w-5" /> Interaktive Seite</button>
      </div>
      {art && (
        <div className="flex gap-2">
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fertig()}
            placeholder={art === 'film' ? 'Adresse des Films (YouTube, Vimeo, MP4 …)' : 'Adresse der Seite (z. B. GeoGebra)'}
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
          <button onClick={fertig} className="rounded-md bg-primary px-3 text-sm text-primary-foreground">Einfügen</button>
        </div>
      )}
    </div>
  );
}