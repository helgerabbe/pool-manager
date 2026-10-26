import React from 'react';
import FolieAnzeige from '@/components/aktivitaetengalerie/foliensatz/FolieAnzeige';

/** Tafelbild eines Schritts im Präsentationsmodus: gespeicherte Folie, sonst Textbild. */
export default function LiveTafelSchritt({ schritt, nr, gesamt }) {
  if (schritt.folie) return (
    <div className="flex h-full items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[min(100%,calc((100vh-7rem)*16/9))]"><FolieAnzeige folie={schritt.folie} kopf={schritt.kopf} /></div>
    </div>
  );
  return (
    <div className="h-full flex flex-col justify-center px-16 py-10 space-y-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Phase {nr} von {gesamt}{schritt.minuten ? ` · ${schritt.minuten} Min.` : ''}{schritt.sozialform ? ` · ${schritt.sozialform}` : ''}</p>
      <h1 className="text-5xl font-display font-bold text-primary leading-tight">{schritt.titel}</h1>
      {schritt.tafel && <p className="text-2xl text-foreground leading-relaxed whitespace-pre-line max-w-5xl">{schritt.tafel}</p>}
      {schritt.methode && <p className="text-base text-muted-foreground">Methode: {schritt.methode}</p>}
    </div>
  );
}