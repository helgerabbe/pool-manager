import { Type, Heading, Square, Circle, Triangle, ArrowRight, MoveRight, PenTool, Sigma, Image, Video, Music, Link, TextCursorInput, ListChecks, SlidersHorizontal, MousePointerClick, Timer, BarChart3, Sparkles, Move, ListOrdered, FileText, Eye, EyeOff, MoveHorizontal, Film, Minus } from 'lucide-react';

// Bausteinkatalog des Folien-Designers (2026-10-21): zunächst nur Darstellung, ohne hinterlegte Funktion.
export const FOLIEN_GRUPPEN = [
  { titel: 'Inhalt und Formen', elemente: [
    { typ: 'ueberschrift', label: 'Überschrift', icon: Heading, b: 360, h: 60 },
    { typ: 'text', label: 'Text', icon: Type, b: 300, h: 90 },
    { typ: 'rechteck', label: 'Rechteck', icon: Square, b: 180, h: 110 },
    { typ: 'ellipse', label: 'Ellipse', icon: Circle, b: 160, h: 110 },
    { typ: 'dreieck', label: 'Dreieck', icon: Triangle, b: 140, h: 120 },
    { typ: 'linie', label: 'Linie', icon: Minus, b: 180, h: 20 },
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
    { typ: 'animation_ki', label: 'Animation (KI)', icon: Film, b: 260, h: 160 },
    { typ: 'animation_interaktiv', label: 'Interaktive Animation (KI)', icon: Sparkles, b: 260, h: 190 },
  ] },
  { titel: 'Interaktion', elemente: [
    { typ: 'eingabe', label: 'Eingabefeld (kurz)', icon: TextCursorInput, b: 280, h: 80, modus: true },
    { typ: 'texteingabe', label: 'Texteingabe (lang)', icon: FileText, b: 340, h: 170, modus: true },
    { typ: 'auswahl', label: 'Auswahl', icon: ListChecks, b: 260, h: 120, modus: true },
    { typ: 'regler', label: 'Regler', icon: SlidersHorizontal, b: 260, h: 60, modus: true },
    { typ: 'zuordnen', label: 'Drag and Drop', icon: Move, b: 300, h: 120, modus: true },
    { typ: 'reihenfolge', label: 'Reihenfolge', icon: ListOrdered, b: 240, h: 130, modus: true },
    { typ: 'knopf', label: 'Knopf (Aktion)', icon: MousePointerClick, b: 160, h: 46 },
    { typ: 'abstimmung', label: 'Abstimmung', icon: BarChart3, b: 260, h: 110, modus: true },
    { typ: 'timer', label: 'Timer', icon: Timer, b: 130, h: 50 },
  ] },
  { titel: 'Animation auf der Folie', elemente: [
    { typ: 'erscheinen', label: 'Erscheinen', icon: Eye, b: 150, h: 46 },
    { typ: 'verschwinden', label: 'Verblassen / Entfernen', icon: EyeOff, b: 170, h: 46 },
    { typ: 'bewegung', label: 'Lineare Bewegung', icon: MoveHorizontal, b: 220, h: 46 },
  ] },
];

export const FOLIEN_ELEMENT = Object.fromEntries(FOLIEN_GRUPPEN.flatMap((g) => g.elemente.map((e) => [e.typ, e])));