/**
 * aufgabenTypen.js
 *
 * Single Source of Truth für die Aufgaben-Typen einer AllgemeineAufgabe.
 *
 * Hintergrund (April 2026): Ursprünglich gab es vier Typen
 * (inhalt | buendel | prozess | projekt_anker), die als Workaround dienten,
 * solange das Lernpfad-Dashboard noch nicht voll funktional war. Mit dem
 * neuen Dashboard sind Bündel, Prozess-Guides und Projekt-Anker dort als
 * System-Bausteine bzw. Bündel-Items abgebildet — die Aufgaben-Typ-Auswahl
 * in Ebene 2 reduziert sich daher auf zwei intuitive Optionen für die
 * Lehrkraft: Brian-Aufgabe (rein digital) vs. Handlungsaufgabe (mit
 * physischem Material). Bestehende Records mit den Legacy-Typen werden via
 * functions/migrateLegacyAufgabenTypen einmalig auf 'inhalt' gehoben.
 *
 * Achsen-Trennung:
 *   - aufgaben_typ        = funktionale/pädagogische Rolle  (diese Datei)
 *   - anforderungsebene   = kognitive Komplexität           (Schema-Enum)
 *   Beide Felder sind orthogonal — siehe Spec.
 */

import { Pencil, Hand } from 'lucide-react';

export const AUFGABEN_TYPEN = {
  inhalt: {
    value: 'inhalt',
    label: 'Brian-Aufgabe',
    short: 'Brian-Aufgabe',
    description:
      'Rein digitale Aufgabe (z. B. Lückentext, Texteingabe). Der Schüler bearbeitet sie am Computer, Brian (KI) prüft das Ergebnis direkt.',
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
  handlung: {
    value: 'handlung',
    label: 'Handlungsaufgabe',
    short: 'Handlungsorientiert',
    description:
      'Aufgabe mit physischem Material in der Realität (z. B. Experiment, Modell). Die Lehrkraft hinterlegt Hinweise zum Material; der Schüler bestätigt die Erledigung digital.',
    icon: Hand,
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
};

// Geordnete Liste in der Anzeigereihenfolge (Picker, Filter-Chips).
export const AUFGABEN_TYPEN_ORDER = ['inhalt', 'handlung'];

// Convenience-Getter mit sauberem Fallback auf 'inhalt'.
export function getAufgabenTyp(value) {
  return AUFGABEN_TYPEN[value] || AUFGABEN_TYPEN.inhalt;
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