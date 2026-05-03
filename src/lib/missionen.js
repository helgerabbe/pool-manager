/**
 * lib/missionen.js — Single Source of Truth für die 6 didaktischen Missionen.
 *
 * Epic: Intelligentes Aufgaben-Management & Didaktische Typisierung.
 *
 * Scope-Regel (siehe Epic, Frage A):
 *   `mission_type` gilt AUSSCHLIESSLICH für AllgemeineAufgabe-Datensätze mit
 *     - aufgaben_typ ∈ {inhalt, handlung}     UND
 *     - anforderungsebene ∈ {'1 - Basis', '2 - Transfer'}.
 *   Lernpakete (Tab 3), Projekte (Tab 6) und reine Container (buendel,
 *   projekt_anker, auswahl_buendel, prozess) sind ausgenommen. Bei diesen
 *   Datensätzen bleibt das Feld `null` und wird im UI ausgeblendet
 *   (siehe `isMissionApplicable` weiter unten).
 *
 * Konventionen:
 *   - Werte (Keys) sind SLUGS in Kleinbuchstaben, exakt passend zum Enum
 *     in `entities/AllgemeineAufgabe.json` ('mission_type').
 *   - Tailwind-Klassen werden hier als VOLLSTÄNDIGE Strings (Literale)
 *     ausgeschrieben — niemals dynamisch per Template-String konstruieren,
 *     damit der Tailwind-Purger sie zur Build-Zeit findet.
 *   - Hex-Farben dienen als Fallback (z. B. für inline-styles oder das
 *     4px-Streifen-Element via CSS-Variable).
 *
 * Farbschema (final freigegeben durch Planungsabteilung):
 *   1 problem      → Amber      (#F59E0B) – warm, energetisch
 *   2 entdeckung   → Emerald    (#10B981) – Wachstum, Entdeckung
 *   3 recherche    → Blue       (#3B82F6) – klassisches Info-Blau
 *   4 anwendung    → Violet     (#8B5CF6) – ruhige Bestätigung
 *   5 transfer     → Pink       (#EC4899) – dynamischer Aufbruch
 *   6 kreativitaet → Orange     (#F97316) – kreativ, expressiv
 */

export const MISSION_TYPES = Object.freeze({
  PROBLEM: 'problem',
  ENTDECKUNG: 'entdeckung',
  RECHERCHE: 'recherche',
  ANWENDUNG: 'anwendung',
  TRANSFER: 'transfer',
  KREATIVITAET: 'kreativitaet',
});

/**
 * Konfiguration jeder Mission. Die Reihenfolge in diesem Objekt entspricht
 * der Anzeige-Reihenfolge in Pickern und Filterleisten.
 *
 * Felder:
 *   - id          : Slug (= DB-Wert, identisch zum Enum in AllgemeineAufgabe.json)
 *   - label       : Handlungsorientierte UI-Bezeichnung (Lehrkraft-Sprache)
 *   - emoji       : Single-Character-Emoji für Inline-Anzeige
 *   - kern        : Didaktischer Kern (Tooltip / Subtitle)
 *   - hex         : Primärfarbe als Hex (Fallback / CSS-Variable)
 *   - colorName   : Tailwind-Color-Family-Name (für Lesbarkeit, NICHT für
 *                   dynamische Klassen-Konstruktion verwenden)
 *   - classes     : Vorgefertigte Tailwind-Klassen-Sets (literal strings)
 *       - stripe  : 4px linker Streifen für Listen-Karten
 *       - badge   : Vollflächiges Badge (Detailansicht)
 *       - chip    : Filter-Chip (aktiver Zustand)
 *       - chipIdle: Filter-Chip (inaktiver Zustand)
 *       - tile    : Auswahl-Kachel im Picker (Default)
 *       - tileActive: Auswahl-Kachel im Picker (selektiert)
 */
export const MISSIONEN = Object.freeze([
  {
    id: MISSION_TYPES.PROBLEM,
    label: 'Den Funken zünden',
    emoji: '💡',
    kern: 'Alltagsbezug & Motivation',
    hex: '#F59E0B',
    colorName: 'amber',
    classes: {
      stripe: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      chip: 'bg-amber-500 text-white border-amber-500',
      chipIdle: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
      tile: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
      tileActive: 'border-amber-500 bg-amber-50 ring-2 ring-amber-300',
    },
  },
  {
    id: MISSION_TYPES.ENTDECKUNG,
    label: 'Selber rausfinden lassen',
    emoji: '🔍',
    kern: 'Induktion & Regelbildung',
    hex: '#10B981',
    colorName: 'emerald',
    classes: {
      stripe: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      chip: 'bg-emerald-500 text-white border-emerald-500',
      chipIdle: 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50',
      tile: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
      tileActive: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300',
    },
  },
  {
    id: MISSION_TYPES.RECHERCHE,
    label: 'Informationen checken',
    emoji: '🌐',
    kern: 'Informationsbeschaffung & Quellen',
    hex: '#3B82F6',
    colorName: 'blue',
    classes: {
      stripe: 'bg-blue-500',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      chip: 'bg-blue-500 text-white border-blue-500',
      chipIdle: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50',
      tile: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
      tileActive: 'border-blue-500 bg-blue-50 ring-2 ring-blue-300',
    },
  },
  {
    id: MISSION_TYPES.ANWENDUNG,
    label: 'Zeigen, was man kann',
    emoji: '✅',
    kern: 'Wissen im bekannten Kontext festigen',
    hex: '#8B5CF6',
    colorName: 'violet',
    classes: {
      stripe: 'bg-violet-500',
      badge: 'bg-violet-50 text-violet-800 border-violet-200',
      chip: 'bg-violet-500 text-white border-violet-500',
      chipIdle: 'bg-white text-violet-700 border-violet-200 hover:bg-violet-50',
      tile: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
      tileActive: 'border-violet-500 bg-violet-50 ring-2 ring-violet-300',
    },
  },
  {
    id: MISSION_TYPES.TRANSFER,
    label: 'In neue Welten übertragen',
    emoji: '🚀',
    kern: 'Wissen im neuen Kontext anwenden',
    hex: '#EC4899',
    colorName: 'pink',
    classes: {
      stripe: 'bg-pink-500',
      badge: 'bg-pink-50 text-pink-800 border-pink-200',
      chip: 'bg-pink-500 text-white border-pink-500',
      chipIdle: 'bg-white text-pink-700 border-pink-200 hover:bg-pink-50',
      tile: 'border-pink-200 hover:border-pink-400 hover:bg-pink-50',
      tileActive: 'border-pink-500 bg-pink-50 ring-2 ring-pink-300',
    },
  },
  {
    id: MISSION_TYPES.KREATIVITAET,
    label: 'Etwas Eigenes erschaffen',
    emoji: '🎨',
    kern: 'Schöpferische Gestaltung & Deep Dive',
    hex: '#F97316',
    colorName: 'orange',
    classes: {
      stripe: 'bg-orange-500',
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      chip: 'bg-orange-500 text-white border-orange-500',
      chipIdle: 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50',
      tile: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
      tileActive: 'border-orange-500 bg-orange-50 ring-2 ring-orange-300',
    },
  },
]);

/**
 * Schneller Lookup per ID. Gibt `undefined` zurück, wenn die ID unbekannt ist
 * (z. B. veralteter DB-Wert nach Schema-Änderung).
 */
const MISSION_BY_ID = Object.freeze(
  Object.fromEntries(MISSIONEN.map((m) => [m.id, m]))
);

/**
 * Gibt die Mission-Konfiguration zu einer ID zurück, oder `null` wenn die ID
 * fehlt/unbekannt ist. Niemals werfen — die UI muss tolerant bleiben.
 */
export function getMission(id) {
  if (!id) return null;
  return MISSION_BY_ID[id] || null;
}

/**
 * Hübsches Inline-Display: "💡 Den Funken zünden". Nutzt Fallbacks für
 * unbekannte/null-Werte, damit die UI nie kaputtgeht.
 */
export function formatMissionLabel(id, { withEmoji = true } = {}) {
  const mission = getMission(id);
  if (!mission) return '—';
  return withEmoji ? `${mission.emoji} ${mission.label}` : mission.label;
}

/**
 * Scope-Helper: Soll für diese Aufgabe die Mission-Auswahl überhaupt
 * angezeigt werden? Implementiert exakt die im Epic festgelegte Regel
 * (Frage A, präzisiert durch Planungsabteilung).
 *
 * @param {object} aufgabe - AllgemeineAufgabe-Record (oder Subset davon)
 * @returns {boolean}
 */
export function isMissionApplicable(aufgabe) {
  if (!aufgabe) return false;
  const typOk = aufgabe.aufgaben_typ === 'inhalt' || aufgabe.aufgaben_typ === 'handlung';
  const ebeneOk =
    !aufgabe.anforderungsebene ||
    aufgabe.anforderungsebene === '1 - Basis' ||
    aufgabe.anforderungsebene === '2 - Transfer';
  return typOk && ebeneOk;
}

/**
 * Liste aller IDs in fester Reihenfolge (für Picker, Filter, Iteration).
 */
export const MISSION_IDS = Object.freeze(MISSIONEN.map((m) => m.id));