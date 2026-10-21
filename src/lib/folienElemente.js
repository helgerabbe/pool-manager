import { Type, Heading, Square, Circle, Triangle, ArrowRight, MoveRight, PenTool, Sigma, Image, Video, Music, Link, TextCursorInput, ListChecks, SlidersHorizontal, MousePointerClick, Timer, BarChart3, Sparkles, Move, ListOrdered, FileText, Eye, EyeOff, MoveHorizontal, Film, Minus, TextCursor, Tag, Columns3, StickyNote, Gauge, Network, Highlighter, Trophy, UserCheck } from 'lucide-react';

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
    { typ: 'timer', label: 'Timer', icon: Timer, b: 130, h: 50 },
    { typ: 'zuteilung', label: 'Zuteilungsanzeige', icon: UserCheck, b: 280, h: 70 },
  ] },
  { titel: 'Medien und Verweise', elemente: [
    { typ: 'bild', label: 'Bild', icon: Image, b: 240, h: 160 },
    { typ: 'video', label: 'Video', icon: Video, b: 280, h: 160 },
    { typ: 'audio', label: 'Audio', icon: Music, b: 260, h: 50 },
    { typ: 'link', label: 'Link', icon: Link, b: 200, h: 40 },
    { typ: 'animation_ki', label: 'Animation (KI)', icon: Film, b: 260, h: 160 },
    { typ: 'animation_interaktiv', label: 'Interaktive Animation (KI)', icon: Sparkles, b: 260, h: 190 },
  ] },
  { titel: 'Interaktiv', hinweis: 'Schüler ↔ Folie: Die Eingabe bleibt beim Schüler.', elemente: [
    { typ: 'eingabe', label: 'Eingabefeld (kurz)', icon: TextCursorInput, b: 280, h: 80, art: 'interaktiv' },
    { typ: 'texteingabe', label: 'Texteingabe (lang)', icon: FileText, b: 340, h: 170, art: 'interaktiv' },
    { typ: 'regler', label: 'Regler', icon: SlidersHorizontal, b: 260, h: 60, art: 'interaktiv' },
    { typ: 'lueckentext_dnd', label: 'Lückentext (Ziehen)', icon: TextCursor, b: 340, h: 120, art: 'interaktiv' },
    { typ: 'bildbeschriftung', label: 'Bildbeschriftung (Ziehen)', icon: Tag, b: 320, h: 200, art: 'interaktiv' },
    { typ: 'markieren', label: 'Text markieren', icon: Highlighter, b: 340, h: 120, art: 'interaktiv' },
    { typ: 'knopf', label: 'Knopf (Aktion)', icon: MousePointerClick, b: 160, h: 46, art: 'interaktiv' },
  ] },
  { titel: 'Interaktiv oder kollaborativ', hinweis: 'Allein bearbeiten oder im Team vernetzt: Das gemeinsame Ergebnis sehen alle.', elemente: [
    { typ: 'auswahl', label: 'Auswahl', icon: ListChecks, b: 260, h: 120, art: 'beides' },
    { typ: 'reihenfolge', label: 'Reihenfolge', icon: ListOrdered, b: 240, h: 130, art: 'beides' },
    { typ: 'kanban', label: 'Kanban-Board', icon: Columns3, b: 380, h: 180, art: 'beides' },
    { typ: 'skala', label: 'Skala / Positionieren', icon: Gauge, b: 320, h: 60, art: 'beides' },
    { typ: 'legeboard', label: 'Legeboard (Karten verbinden)', icon: Network, b: 360, h: 200, art: 'beides' },
  ] },
  { titel: 'Kollaborativ', hinweis: 'Nutzer ↔ Nutzer: Mehrere tragen bei, die Ergebnisse erscheinen bei anderen.', elemente: [
    { typ: 'pinnwand', label: 'Live-Pinnwand', icon: StickyNote, b: 380, h: 190, art: 'kollaborativ' },
    { typ: 'abstimmung', label: 'Abstimmung', icon: BarChart3, b: 260, h: 110, art: 'kollaborativ' },
    { typ: 'punktestand', label: 'Punktestand / Rangliste', icon: Trophy, b: 260, h: 120, art: 'kollaborativ' },
  ] },
  { titel: 'Animation auf der Folie', elemente: [
    { typ: 'erscheinen', label: 'Erscheinen', icon: Eye, b: 150, h: 46 },
    { typ: 'verschwinden', label: 'Verblassen / Entfernen', icon: EyeOff, b: 170, h: 46 },
    { typ: 'bewegung', label: 'Lineare Bewegung', icon: MoveHorizontal, b: 220, h: 46 },
  ] },
];

export const FOLIEN_ELEMENT = Object.fromEntries(FOLIEN_GRUPPEN.flatMap((g) => g.elemente.map((e) => [e.typ, e])));