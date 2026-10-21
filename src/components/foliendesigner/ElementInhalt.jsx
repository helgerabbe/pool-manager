import React from 'react';
import { Image, Play, Music, Link, Sparkles } from 'lucide-react';

const platz = 'flex h-full w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-sm text-primary';

/** Darstellung eines Folienelements (nur Vorschau, ohne Funktion). */
export default function ElementInhalt({ typ }) {
  switch (typ) {
    case 'ueberschrift': return <p className="font-display text-3xl font-bold">Überschrift</p>;
    case 'text': return <p className="text-base">Hier steht ein Text der Folie, z. B. ein Arbeitsauftrag.</p>;
    case 'rechteck': return <div className="h-full w-full rounded-md bg-primary/80" />;
    case 'ellipse': return <div className="h-full w-full rounded-full bg-accent/80" />;
    case 'dreieck': return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points="50,0 100,100 0,100" className="fill-chart-3" /></svg>;
    case 'pfeil_duenn': return <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full"><line x1="0" y1="10" x2="92" y2="10" className="stroke-foreground" strokeWidth="2" /><polygon points="88,3 100,10 88,17" className="fill-foreground" /></svg>;
    case 'pfeil_breit': return <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full"><polygon points="0,15 65,15 65,0 100,25 65,50 65,35 0,35" className="fill-primary" /></svg>;
    case 'freihand': return <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full"><path d="M5,40 C20,5 35,55 50,25 S80,5 95,35" fill="none" className="stroke-chart-4" strokeWidth="3" /></svg>;
    case 'formel': return <p className="font-serif text-2xl italic">a² + b² = c²</p>;
    case 'bild': return <div className={platz}><Image className="h-6 w-6" />Bild</div>;
    case 'video': return <div className="flex h-full w-full items-center justify-center rounded-lg bg-foreground/90"><Play className="h-10 w-10 text-background" /></div>;
    case 'audio': return <div className="flex h-full w-full items-center gap-2 rounded-full bg-muted px-3"><Music className="h-4 w-4 text-primary" /><div className="h-1.5 flex-1 rounded-full bg-primary/30"><div className="h-full w-1/3 rounded-full bg-primary" /></div></div>;
    case 'link': return <span className="flex items-center gap-1 text-primary underline"><Link className="h-4 w-4" />Zur Webseite</span>;
    case 'eingabe': return <div className="w-full space-y-1"><p className="text-xs text-muted-foreground">Deine Antwort</p><div className="h-10 rounded-md border border-input bg-background" /></div>;
    case 'auswahl': return <div className="w-full space-y-1.5">{['Antwort A', 'Antwort B', 'Antwort C'].map((a) => <div key={a} className="rounded-md border border-border bg-background px-2 py-1 text-sm">{a}</div>)}</div>;
    case 'regler': return <div className="w-full space-y-1"><p className="text-xs text-muted-foreground">Wert: 40</p><div className="relative h-2 rounded-full bg-muted"><div className="h-full w-2/5 rounded-full bg-primary" /><div className="absolute left-[40%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" /></div></div>;
    case 'knopf': return <div className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Weiter</div>;
    case 'abstimmung': return <div className="w-full space-y-1.5">{[['Ja', 'w-3/4'], ['Nein', 'w-1/4']].map(([l, w]) => <div key={l} className="flex items-center gap-2 text-xs"><span className="w-9">{l}</span><div className="h-3 flex-1 rounded-full bg-muted"><div className={`h-full rounded-full bg-primary ${w}`} /></div></div>)}</div>;
    case 'timer': return <div className="rounded-full bg-foreground px-4 py-1.5 text-xl font-bold tabular-nums text-background">10:00</div>;
    case 'animation': return <div className={platz}><Sparkles className="h-6 w-6" />Animation</div>;
    default: return null;
  }
}