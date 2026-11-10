/**
 * sektorTypStil.js (2026-11-10)
 * Symbol und Farbe je Sektor-Typ für die Sektor-Karten im Lernpfad-Architekt
 * und das „Sektor hinzufügen"-Menü. Alle Klassen sind literale Tailwind-Strings.
 */
import { Flag, BookOpen, PenLine, Lock, ClipboardCheck, MessageSquare, FilePlus, Compass } from 'lucide-react';
import { SEKTOR_TYP } from '@/lib/sektorTypen';

const STIL = {
  [SEKTOR_TYP.UEBERBLICK]: { Icon: Flag, chip: 'bg-cyan-100 text-cyan-900', leiste: 'border-l-cyan-500', icon: 'text-cyan-600' },
  [SEKTOR_TYP.ARBEITSPHASE]: { Icon: BookOpen, chip: 'bg-blue-100 text-blue-900', leiste: 'border-l-blue-500', icon: 'text-blue-600' },
  [SEKTOR_TYP.ABSCHLUSSTEST]: { Icon: PenLine, chip: 'bg-rose-100 text-rose-900', leiste: 'border-l-rose-500', icon: 'text-rose-600' },
  [SEKTOR_TYP.PROJEKTE]: { Icon: Lock, chip: 'bg-violet-100 text-violet-900', leiste: 'border-l-violet-500', icon: 'text-violet-600' },
  [SEKTOR_TYP.ZWISCHENTEST]: { Icon: ClipboardCheck, chip: 'bg-amber-100 text-amber-900', leiste: 'border-l-amber-400', icon: 'text-amber-600' },
  [SEKTOR_TYP.FEEDBACK]: { Icon: MessageSquare, chip: 'bg-emerald-100 text-emerald-900', leiste: 'border-l-emerald-500', icon: 'text-emerald-600' },
  [SEKTOR_TYP.ONBOARDING]: { Icon: Compass, chip: 'bg-cyan-100 text-cyan-900', leiste: 'border-l-cyan-500', icon: 'text-cyan-600' },
  [SEKTOR_TYP.INDIVIDUELL]: { Icon: FilePlus, chip: 'bg-secondary text-foreground', leiste: 'border-l-border', icon: 'text-muted-foreground' },
};

export function getSektorTypStil(typ) {
  return STIL[typ] || STIL[SEKTOR_TYP.INDIVIDUELL];
}