import React from 'react';
import { Sparkles, Film, Eye, EyeOff, MoveHorizontal } from 'lucide-react';
import FormelAnzeige from './FormelAnzeige';
import MedienInhalt from './MedienInhalt';
import ZiehInhalte from './ZiehInhalte';
import NeueInhalte from './NeueInhalte';
import WeitereInhalte from './WeitereInhalte';
import ZusatzInhalte from './ZusatzInhalte';
import BrueckenInhalte from './BrueckenInhalte';
import ErweiterteInhalte from './ErweiterteInhalte';
import LetzteInhalte from './LetzteInhalte';
import { schriftKlasse, UEBERSCHRIFT_GROESSEN } from '@/lib/folienStil';

const platz = 'flex h-full w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-sm text-primary';

/** Darstellung eines Folienelements (nur Vorschau, ohne Funktion). */
export default function ElementInhalt({ el }) {
  const { typ, farbe } = el;
  if (typ === 'zufall' || typ === 'extern' || (typ === 'raster' && el.raster_art === 'kreuzwort') || (typ === 'audioaufnahme' && el.mit_zeichnung)) return <LetzteInhalte el={el} />;
  if ((typ === 'skala' && el.belegung === 'karten') || (typ === 'kanban' && el.bereiche === 'venn') || (typ === 'abstimmung' && el.zwei_runden)) return <ErweiterteInhalte el={el} />;
  if ((typ === 'markieren' && el.ziel === 'bild') || (typ === 'auswahl' && el.begruendung) || (typ === 'abstimmung' && el.budget > 1)) return <ZusatzInhalte el={el} />;
  switch (typ) {
    case 'ueberschrift': return <p className={`w-full font-bold leading-tight ${schriftKlasse(el.schrift)}`} style={{ color: farbe, fontSize: UEBERSCHRIFT_GROESSEN[el.stufe] }}>{el.inhalt}</p>;
    case 'text': return <p className={`w-full whitespace-pre-wrap ${schriftKlasse(el.schrift)}`} style={{ color: farbe, fontSize: el.groesse }}>{el.inhalt}</p>;
    case 'rechteck': return <div className={`h-full w-full ${el.form === 'rund' ? 'rounded-2xl' : ''}`} style={{ background: farbe }} />;
    case 'ellipse': return <div className={`rounded-full ${el.form === 'kreis' ? 'aspect-square h-full max-w-full' : 'h-full w-full'}`} style={{ background: farbe }} />;
    case 'dreieck': return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points={el.form === 'recht' ? '0,0 0,100 100,100' : '50,0 100,100 0,100'} fill={farbe} /></svg>;
    case 'linie': return <div className="h-0.5 w-full" style={{ background: farbe }} />;
    case 'pfeil_duenn': return <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full"><line x1="0" y1="10" x2="97" y2="10" stroke={farbe} strokeWidth="2" />{el.spitze === 'linie' ? <polyline points="88,3 98,10 88,17" fill="none" stroke={farbe} strokeWidth="2" /> : <polygon points="88,3 100,10 88,17" fill={farbe} />}</svg>;
    case 'pfeil_breit': return <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full"><polygon points="1,15 65,15 65,1 99,25 65,49 65,35 1,35" fill={el.fuellung === 'umriss' ? 'none' : farbe} stroke={farbe} strokeWidth="2" /></svg>;
    case 'freihand': return <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full"><path d="M5,40 C20,5 35,55 50,25 S80,5 95,35" fill="none" className="stroke-chart-4" strokeWidth="3" /></svg>;
    case 'formel': return <FormelAnzeige teile={el.teile} farbe={farbe} groesse={el.groesse} />;
    case 'bild': case 'video': case 'audio': case 'link': return <MedienInhalt el={el} />;
    case 'eingabe': return <div className="w-full space-y-1"><p className="text-xs text-muted-foreground">Deine Antwort</p><div className="h-10 rounded-md border border-input bg-background" /></div>;
    case 'texteingabe': return <div className="flex h-full w-full flex-col gap-1"><p className="text-xs text-muted-foreground">Schreibe deinen Text</p><div className="flex-1 space-y-2 rounded-md border border-input bg-background p-2">{['w-full', 'w-11/12', 'w-2/3'].map((w) => <div key={w} className={`h-1.5 rounded-full bg-muted ${w}`} />)}</div></div>;
    case 'auswahl': return <div className="w-full space-y-1.5">{['Antwort A', 'Antwort B', 'Antwort C'].map((a) => <div key={a} className="rounded-md border border-border bg-background px-2 py-1 text-sm">{a}</div>)}</div>;
    case 'regler': return <div className="w-full space-y-1"><p className="text-xs text-muted-foreground">Wert: 40</p><div className="relative h-2 rounded-full bg-muted"><div className="h-full w-2/5 rounded-full bg-primary" /><div className="absolute left-[40%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" /></div></div>;
    case 'lueckentext_dnd': case 'bildbeschriftung': case 'kanban': case 'pinnwand': return <ZiehInhalte typ={typ} />;
    case 'zeichenflaeche': case 'raster': case 'wortwolke': case 'karteikarte': return <WeitereInhalte typ={typ} />;
    case 'skala': case 'legeboard': case 'markieren': case 'punktestand': return <NeueInhalte typ={typ} />;
    case 'foto': case 'audioaufnahme': case 'tabelle': case 'melden': return <BrueckenInhalte typ={typ} />;
    case 'reihenfolge': return <div className="w-full space-y-1.5">{['1', '2', '3'].map((n) => <div key={n} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm"><span className="text-muted-foreground">⋮⋮</span>Schritt {n}</div>)}</div>;
    case 'knopf': return <div className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Weiter</div>;
    case 'abstimmung': return <div className="w-full space-y-1.5">{[['Ja', 'w-3/4'], ['Nein', 'w-1/4']].map(([l, w]) => <div key={l} className="flex items-center gap-2 text-xs"><span className="w-9">{l}</span><div className="h-3 flex-1 rounded-full bg-muted"><div className={`h-full rounded-full bg-primary ${w}`} /></div></div>)}</div>;
    case 'zuteilung': return <div className="w-full rounded-lg border-2 border-primary bg-primary/5 px-3 py-2 text-sm"><p className="text-xs text-muted-foreground">Deine Zuteilung</p><p className="font-semibold text-primary">Gruppe B · Rolle: Zeitwächter</p></div>;
    case 'timer': return <div className="rounded-full bg-foreground px-4 py-1.5 text-xl font-bold tabular-nums text-background">10:00</div>;
    case 'animation_ki': return <div className={platz}><Film className="h-6 w-6" />Animation (KI)</div>;
    case 'animation_interaktiv': return <div className="flex h-full w-full flex-col gap-2"><div className={platz}><Sparkles className="h-6 w-6" />Interaktive Animation</div><div className="h-2 rounded-full bg-muted"><div className="h-full w-1/2 rounded-full bg-primary" /></div></div>;
    case 'erscheinen': return <div className="flex items-center gap-2 rounded-full bg-chart-3/15 px-3 py-1.5 text-sm text-chart-3"><Eye className="h-4 w-4" />Erscheint auf Klick</div>;
    case 'verschwinden': return <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-sm text-destructive"><EyeOff className="h-4 w-4" />Verschwindet auf Klick</div>;
    case 'bewegung': return <div className="flex w-full items-center gap-2 text-sm text-primary"><span className="h-3 w-3 rounded-full bg-primary" /><span className="flex-1 border-t-2 border-dashed border-primary" /><MoveHorizontal className="h-4 w-4" /></div>;
    default: return null;
  }
}