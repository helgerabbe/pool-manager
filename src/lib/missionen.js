/**
 * lib/missionen.js — Single Source of Truth für die 4 Aufgabenkategorien.
 *
 * Umstellung 2026-08-29: Aus den ursprünglich sechs "Missionen" sind vier
 * Kategorien entlang des Unterrichtsverlaufs geworden. Die Migration der
 * Bestandsdaten ist abgeschlossen:
 *
 *   problem                  → erstbegegnung
 *   entdeckung, recherche    → erarbeitung
 *   transfer, kreativitaet   → anwendung
 *   anwendung (alt)          → einzeln verteilt auf sicherung / anwendung
 *
 * Der Slug `anwendung` hat dabei seine Bedeutung geändert: früher hieß er
 * "Anwenden & Sichern", heute nur noch Anwendung. Alle 28 Altbestände wurden
 * vor der Umdeutung von Hand zugeordnet, deshalb ist der Wert eindeutig.
 *
 * Scope-Regel (neu gefasst 2026-08-31):
 *   Die Kategorie beschreibt, WO im Unterrichtsverlauf eine Aufgabe steht.
 *   Das gilt für jede echte Aufgabe — unabhängig davon, ob die Schüler:innen
 *   sie in der Lernplattform, am realen Material oder auf einer eingebetteten
 *   Seite bearbeiten.
 *
 *   Ausgenommen bleiben nur:
 *     - CONTAINER (buendel, prozess, projekt_anker, auswahl_buendel) — sie
 *       bündeln andere Aufgaben und stehen selbst nirgends im Verlauf.
 *     - EBENE 3 (Projekte) — Projekte haben keine Kategorie.
 *
 *   Zur Vorgeschichte: Bis zum Umbau hing die Regel am `aufgaben_typ` und
 *   ließ nur {inhalt, handlung} zu. Damals war 'inhalt' gleichbedeutend mit
 *   "KI-Tutor-Aufgabe". Seit der Typ am SCHRITT sitzt, sagt er nichts mehr
 *   über die Aufgabe aus — und die externe HTML-Seite fiel ohne Grund heraus:
 *   Auch eine GeoGebra-Aufgabe steht irgendwo im Unterrichtsverlauf.
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
 * Farbschema:
 *   1 erstbegegnung → Amber   (#F59E0B) – warm, energetisch
 *   2 erarbeitung   → Emerald (#10B981) – Wachstum, Entdeckung
 *   3 sicherung     → Violet  (#8B5CF6) – ruhige Bestätigung
 *   4 anwendung     → Pink    (#EC4899) – dynamischer Aufbruch
 */

export const MISSION_TYPES = Object.freeze({
  ERSTBEGEGNUNG: 'erstbegegnung',
  ERARBEITUNG: 'erarbeitung',
  SICHERUNG: 'sicherung',
  ANWENDUNG: 'anwendung',
});

/**
 * Konfiguration jeder Kategorie. Die Reihenfolge in diesem Array entspricht
 * der Anzeige-Reihenfolge in Pickern und Filterleisten und folgt dem
 * Unterrichtsverlauf.
 *
 * Felder:
 *   - id          : Slug (= DB-Wert, identisch zum Enum in AllgemeineAufgabe.json)
 *   - label       : UI-Bezeichnung (Lehrkraft-Sprache)
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
    id: MISSION_TYPES.ERSTBEGEGNUNG,
    label: 'Erstbegegnung',
    emoji: '💡',
    kern: 'Schüler:innen begegnen dem Thema zum ersten Mal, bevor sie es gelernt haben — meist über eine Alltagssituation. Vorwissen wird aktiviert, die Bedeutsamkeit des Themas wird sichtbar.',
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
    id: MISSION_TYPES.ERARBEITUNG,
    label: 'Erarbeitung',
    emoji: '🔍',
    kern: 'Schüler:innen erschließen sich das Neue selbst — an Beispielen eine Regel entdecken oder aus Texten, Grafiken und Videos Informationen gewinnen und ordnen.',
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
    id: MISSION_TYPES.SICHERUNG,
    label: 'Sicherung',
    emoji: '✅',
    kern: 'Schüler:innen üben das Gelernte im bekannten Kontext, bis es sitzt. Ziel ist Routine und Sicherheit, nicht Transfer.',
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
    id: MISSION_TYPES.ANWENDUNG,
    label: 'Anwendung',
    emoji: '🚀',
    kern: 'Schüler:innen übertragen ihr Wissen auf einen neuen Kontext oder erschaffen damit ein eigenes Produkt. Hier zeigt sich, wie flexibel das Gelernte ist.',
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
]);

/**
 * Schneller Lookup per ID. Gibt `undefined` zurück, wenn die ID unbekannt ist
 * (z. B. veralteter DB-Wert nach Schema-Änderung).
 */
const MISSION_BY_ID = Object.freeze(
  Object.fromEntries(MISSIONEN.map((m) => [m.id, m]))
);

/**
 * Gibt die Kategorie-Konfiguration zu einer ID zurück, oder `null` wenn die ID
 * fehlt/unbekannt ist. Niemals werfen — die UI muss tolerant bleiben.
 */
export function getMission(id) {
  if (!id) return null;
  return MISSION_BY_ID[id] || null;
}

/**
 * Hübsches Inline-Display: "💡 Erstbegegnung". Nutzt Fallbacks für
 * unbekannte/null-Werte, damit die UI nie kaputtgeht.
 */
export function formatMissionLabel(id, { withEmoji = true } = {}) {
  const mission = getMission(id);
  if (!mission) return '—';
  return withEmoji ? `${mission.emoji} ${mission.label}` : mission.label;
}

/**
 * Scope-Helper: Soll für diese Aufgabe die Kategorie-Auswahl überhaupt
 * angezeigt werden?
 *
 * @param {object} aufgabe - AllgemeineAufgabe-Record (oder Subset davon)
 * @returns {boolean}
 */
/** Container bündeln andere Aufgaben und stehen selbst nirgends im Verlauf. */
const CONTAINER_TYPEN = new Set(['buendel', 'prozess', 'projekt_anker', 'auswahl_buendel']);

export function isMissionApplicable(aufgabe) {
  if (!aufgabe) return false;
  if (CONTAINER_TYPEN.has(aufgabe.aufgaben_typ)) return false;
  // Projekte (Ebene 3) haben keine Kategorie. Fehlende Angabe gilt als Ebene 1.
  return aufgabe.anforderungsebene !== '3 - Projekt';
}

/**
 * Liste aller IDs in fester Reihenfolge (für Picker, Filter, Iteration).
 */
export const MISSION_IDS = Object.freeze(MISSIONEN.map((m) => m.id));
