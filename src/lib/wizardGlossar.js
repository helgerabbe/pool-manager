/**
 * lib/wizardGlossar.js
 *
 * Single Source of Truth für didaktische Beschreibungen der
 * Aktivitätstypen im Lernpaket-Wizard (Tab 3, Konzept v0.4 §6).
 *
 * Wird parallel von zwei Stellen konsumiert:
 *   – UI: Glossar-Sidebar im Wizard-Modal (Click/Drag-Insert + Tooltip).
 *   – Backend: `functions/generateLernpaketAktivitaeten` spiegelt den
 *     Inhalt für den System-Prompt der KI (Beschreibungen + Phase).
 *
 * WICHTIG: Bei Änderungen hier IMMER auch
 * `functions/generateLernpaketAktivitaeten` nachziehen — Deno-Funktionen
 * können keine lokalen Module importieren (siehe coding_instructions §19).
 */

// Phase, der ein Aktivitätstyp im Pool-Manager fest zugeordnet ist.
export const VALID_PHASES = ['Input', 'Übung', 'Abschluss'];

/**
 * Map: aktivitaetstyp-Name (wie im AktivitaetenKatalog) →
 *   { phase, beschreibung }
 *
 * `phase` muss exakt mit der Phase im Katalog übereinstimmen,
 * sonst greift im Backend die Phase-Autokorrektur (§4.4).
 */
export const AKTIVITAETSTYP_GLOSSAR = {
  // ── Input ────────────────────────────────────────────────────────
  'Link / URL': {
    phase: 'Input',
    beschreibung: 'Schüler:innen besuchen eine externe Webseite und verschaffen sich einen Überblick.',
  },
  Video: {
    phase: 'Input',
    beschreibung: 'Schüler:innen schauen ein Erklärvideo.',
  },
  Lehrwerk: {
    phase: 'Input',
    beschreibung: 'Verweis auf eine Seite/einen Abschnitt im Schulbuch.',
  },
  Quelle: {
    phase: 'Input',
    beschreibung: 'Verweis auf einen externen Text, ein PDF oder eine zitierfähige Quelle.',
  },
  Audio: {
    phase: 'Input',
    beschreibung: 'Schüler:innen hören ein Audio (Podcast, Hörverstehen).',
  },
  Bild: {
    phase: 'Input',
    beschreibung: 'Schüler:innen betrachten ein Bild oder Schema und entnehmen Informationen.',
  },
  'Text lesen': {
    phase: 'Input',
    beschreibung: 'Schüler:innen lesen einen längeren Text.',
  },

  // ── Übung ────────────────────────────────────────────────────────
  Miniquiz: {
    phase: 'Übung',
    beschreibung: 'Kurze Wissensfrage mit ein bis drei erwarteten Antworten.',
  },
  'Lückentext': {
    phase: 'Übung',
    beschreibung: 'Schüler:innen füllen Lücken in einem vorgegebenen Text.',
  },
  'Begriffe zuordnen': {
    phase: 'Übung',
    beschreibung: 'Schüler:innen verbinden Begriffe mit ihren Definitionen oder Beispielen.',
  },
  'Reihenfolge / Sortierung': {
    phase: 'Übung',
    beschreibung: 'Schüler:innen bringen Elemente in die richtige Reihenfolge.',
  },
  Bildbeschriftung: {
    phase: 'Übung',
    beschreibung: 'Schüler:innen beschriften Marker in einem Bild.',
  },
  'KI-Tutor Aufgabe': {
    phase: 'Übung',
    beschreibung: 'Offene Aufgabe, die die KI individuell auswertet und Feedback gibt.',
  },
  'Offene Aufgabe': {
    phase: 'Übung',
    beschreibung: 'Frei formulierte Aufgabe ohne Auto-Korrektur.',
  },
  'Multiple Choice': {
    phase: 'Übung',
    beschreibung: 'Klassische Auswahlfrage mit mehreren Antwortoptionen.',
  },

  // ── Abschluss ────────────────────────────────────────────────────
  Test: {
    phase: 'Abschluss',
    beschreibung: 'Kombinierter Lernstandstest mit mehreren Teilaufgaben.',
  },
  'KI-Check': {
    phase: 'Abschluss',
    beschreibung: 'Offene Abschlussaufgabe, die die KI nach hinterlegten Kriterien bewertet.',
  },
  'Bearbeitung bestätigen': {
    phase: 'Abschluss',
    beschreibung: 'Schüler:innen bestätigen die Bearbeitung der vorherigen Aktivitäten.',
  },
};

/**
 * Liste der Aktivitätstypen für eine konkrete Phase, gefiltert auf
 * tatsächlich im Katalog aktive Einträge.
 *
 * @param {string} phase
 * @param {Array<{name:string,is_active:boolean}>} katalog
 * @returns {Array<{name:string,beschreibung:string}>}
 */
export function getGlossarFuerPhase(phase, katalog = []) {
  const aktiveNamen = new Set(
    katalog.filter((k) => k.is_active === true).map((k) => k.name)
  );
  return Object.entries(AKTIVITAETSTYP_GLOSSAR)
    .filter(([name, entry]) => entry.phase === phase && aktiveNamen.has(name))
    .map(([name, entry]) => ({ name, beschreibung: entry.beschreibung }));
}