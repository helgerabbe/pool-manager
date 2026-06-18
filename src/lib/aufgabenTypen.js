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

import { Pencil, Hand, Code2 } from 'lucide-react';

export const AUFGABEN_TYPEN = {
  inhalt: {
    value: 'inhalt',
    label: 'KI-Tutor-Aufgabe',
    short: 'KI-Tutor-Aufgabe',
    description:
      'Rein digitale Aufgabe. Der Schüler bearbeitet sie am Computer, der KI-Tutor prüft das Ergebnis direkt und gibt Rückmeldung.',
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
  externe_html_seite: {
    value: 'externe_html_seite',
    label: 'Externe HTML-Seite',
    short: 'Externe HTML-Seite',
    description:
      'Eine externe, interaktive HTML-Seite (z.B. GeoGebra, LearningApps), die im Lernpfad eingebettet wird. Die Didaktik liegt in der externen Seite; der Schüler bestätigt die Erledigung.',
    icon: Code2,
    color: {
      ring: 'ring-teal-400',
      border: 'border-teal-400',
      bg: 'bg-teal-50',
      bgSolid: 'bg-teal-500',
      text: 'text-teal-700',
      textOn: 'text-white',
      iconBg: 'bg-teal-100',
      iconText: 'text-teal-700',
      hover: 'hover:border-teal-500 hover:bg-teal-50',
    },
  },
};

// Geordnete Liste in der Anzeigereihenfolge (Picker, Filter-Chips).
export const AUFGABEN_TYPEN_ORDER = ['inhalt', 'handlung', 'externe_html_seite'];

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