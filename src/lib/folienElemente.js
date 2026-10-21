import { Type, Heading, Square, Circle, Triangle, ArrowRight, MoveRight, PenTool, Sigma, Image, Video, Music, Link, TextCursorInput, ListChecks, SlidersHorizontal, MousePointerClick, Timer, BarChart3, Sparkles } from 'lucide-react';

// Bausteinkatalog des Folien-Designers (2026-10-21): zunächst nur Darstellung, ohne hinterlegte Funktion.
export const FOLIEN_GRUPPEN = [
  { titel: 'Inhalt und Formen', elemente: [
    { typ: 'ueberschrift', label: 'Überschrift', icon: Heading, b: 360, h: 60 },
    { typ: 'text', label: 'Text', icon: Type, b: 300, h: 90 },
    { typ: 'rechteck', label: 'Rechteck', icon: Square, b: 180, h: 110 },
    { typ: 'ellipse', label: 'Ellipse', icon: Circle, b: 160, h: 110 },
    { typ: 'dreieck', label: 'Dreieck', icon: Triangle, b: 140, h: 120 },
    { typ: 'pfeil_duenn', label: 'Pfeil (dünn)', icon: ArrowRight, b: 180, h: 30 },
    { typ: 'pfeil_breit', label: 'Pfeil (breit)', icon: MoveRight, b: 180, h: 70 },
    { typ: 'freihand', label: 'Freihandform', icon: PenTool, b: 170, h: 110 },
    { typ: 'formel', label: 'Formel', icon: Sigma, b: 220, h: 60 },
  ] },
  { titel: 'Medien und Verweise', elemente: [
    { typ: 'bild', label: 'Bild', icon: Image, b: 240, h: 160 },
    { typ: 'video', label: 'Video', icon: Video, b: 280, h: 160 },
    { typ: 'audio', label: 'Audio', icon: Music, b: 260, h: 50 },
    { typ: 'link', label: 'Link', icon: Link, b: 200, h: 40 },
  ] },
  { titel: 'Interaktion und Bewegung', elemente: [
    { typ: 'eingabe', label: 'Eingabefeld', icon: TextCursorInput, b: 280, h: 80, modus: true },
    { typ: 'auswahl', label: 'Auswahl', icon: ListChecks, b: 260, h: 120, modus: true },
    { typ: 'regler', label: 'Regler', icon: SlidersHorizontal, b: 260, h: 60, modus: true },
    { typ: 'knopf', label: 'Knopf (Aktion)', icon: MousePointerClick, b: 160, h: 46 },
    { typ: 'abstimmung', label: 'Abstimmung', icon: BarChart3, b: 260, h: 110, modus: true },
    { typ: 'timer', label: 'Timer', icon: Timer, b: 130, h: 50 },
    { typ: 'animation', label: 'Animation', icon: Sparkles, b: 200, h: 120 },
  ] },
];

export const FOLIEN_ELEMENT = Object.fromEntries(FOLIEN_GRUPPEN.flatMap((g) => g.elemente.map((e) => [e.typ, e])));