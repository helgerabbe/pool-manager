import React from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

function TafelBild({ block }) {
  const { url } = useSignedUrl(block.url);
  if (!url) return null;
  return (
    <figure className="flex flex-col items-center gap-2">
      <img src={url} alt={block.inhalt || 'Tafelbild'} className="max-h-[60vh] rounded-lg object-contain" />
      {block.inhalt && <figcaption className="text-lg text-white/80">{block.inhalt}</figcaption>}
    </figure>
  );
}

/** Tafel einer Phase im Abspielmodus (nur lesen). */
export default function TafelAnzeige({ phase }) {
  const bloecke = phase.tafel || [];
  if (!bloecke.length) {
    return <p className="text-center font-display text-5xl font-bold text-white">{phase.phasenname}</p>;
  }
  return (
    <div className="flex flex-col items-center gap-6 text-center text-white">
      {bloecke.map((b) => (
        b.typ === 'ueberschrift' ? <h2 key={b.id} className="font-display text-5xl font-bold">{b.inhalt}</h2>
          : b.typ === 'text' ? <p key={b.id} className="whitespace-pre-line text-3xl">{b.inhalt}</p>
          : <TafelBild key={b.id} block={b} />
      ))}
    </div>
  );
}