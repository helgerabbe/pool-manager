/**
 * aufgabenTypen.js
 *
 * Single Source of Truth für die vier Aufgaben-Typen einer AllgemeineAufgabe.
 * Wird in Phase 1 (Picker, Editor, Migration) und Phase 3 (Lernpfad-Dashboard, Pool, Filter-Chips)
 * gemeinsam genutzt.
 *
 * Achsen-Trennung:
 *   - aufgaben_typ        = funktionale/pädagogische Rolle  (diese Datei)
 *   - anforderungsebene   = kognitive Komplexität           (Schema-Enum)
 *   Beide Felder sind orthogonal — siehe Spec.
 */

import { Pencil, Folder, Compass, Rocket } from 'lucide-react';

export const AUFGABEN_TYPEN = {
  inhalt: {
    value: 'inhalt',
    label: 'Inhalts-Aktivität',
    short: 'Inhalt',
    description:
      'Erstelle klassische Aufgaben (z. B. Lückentexte). Der Schüler bearbeitet die Aufgabe und gibt ein Ergebnis ab, das Brian (KI) direkt mit ihm prüft.',
    icon: Pencil,
    // Tailwind-Tokens (Amber/Gold)
    color: {
      ring: 'ring-amber-400',
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      bgSolid: 'bg-amber-500',
      text: 'text-amber-700',
      textOn: 'text-white',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-700',
      hover: 'hover:border-amber-500 hover:bg-amber-50',
    },
  },
  buendel: {
    value: 'buendel',
    label: 'Paket-Bündel',
    short: 'Bündel',
    description:
      'Fasse mehrere Lernpakete aus der Ebene 1 zusammen. Ideal, um Schülern einen klaren Weg durch das Fundamentum vorzugeben.',
    icon: Folder,
    color: {
      ring: 'ring-blue-400',
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      bgSolid: 'bg-blue-500',
      text: 'text-blue-700',
      textOn: 'text-white',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-700',
      hover: 'hover:border-blue-500 hover:bg-blue-50',
    },
  },
  prozess: {
    value: 'prozess',
    label: 'Prozess-Guide',
    short: 'Prozess',
    description:
      'Steuere den Lernfluss mit Checkpoints oder Meilensteinen. Hier geht es nicht um Fachwissen, sondern um die Organisation des Lernens.',
    icon: Compass,
    color: {
      ring: 'ring-emerald-400',
      border: 'border-emerald-400',
      bg: 'bg-emerald-50',
      bgSolid: 'bg-emerald-500',
      text: 'text-emerald-700',
      textOn: 'text-white',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-700',
      hover: 'hover:border-emerald-500 hover:bg-emerald-50',
    },
  },
  projekt_anker: {
    value: 'projekt_anker',
    label: 'Projekt-Anker',
    short: 'Projekt',
    description:
      'Das Tor zur Ebene 3. Hier bietest du Schülern komplexe Anwendungsaufgaben zur Auswahl an, sobald sie bereit dafür sind.',
    icon: Rocket,
    color: {
      ring: 'ring-violet-400',
      border: 'border-violet-400',
      bg: 'bg-violet-50',
      bgSolid: 'bg-violet-500',
      text: 'text-violet-700',
      textOn: 'text-white',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-700',
      hover: 'hover:border-violet-500 hover:bg-violet-50',
    },
  },
};

// Geordnete Liste in der gewünschten Anzeigereihenfolge (Picker, Filter-Chips).
export const AUFGABEN_TYPEN_ORDER = ['inhalt', 'buendel', 'prozess', 'projekt_anker'];

// Convenience-Getter mit sauberem Fallback auf 'inhalt'.
export function getAufgabenTyp(value) {
  return AUFGABEN_TYPEN[value] || AUFGABEN_TYPEN.inhalt;
}

// Welche Typen sind „Meta" (= keine echten Inhaltsaufgaben)?
export const META_AUFGABEN_TYPEN = ['buendel', 'prozess', 'projekt_anker'];

export function isMetaAufgabenTyp(value) {
  return META_AUFGABEN_TYPEN.includes(value);
}

// ── Item-Typen im Lernpfad-Sektor ────────────────────────────────────────────
// Ein Item im items-Array kann entweder eine reguläre Aufgabe (UUID) oder
// ein globaler System-Baustein (z. B. "sys_diagnose") sein. Single Source of
// Truth für die Anti-Duplikat-Logik & das Rendering – Magic Strings vermeiden.
export const ITEM_TYPE = Object.freeze({
  AUFGABE: 'aufgabe',
  SYSTEM: 'system',
});

export const ITEM_TYPES = Object.freeze([ITEM_TYPE.AUFGABE, ITEM_TYPE.SYSTEM]);