/**
 * kiBriefingKatalog.js
 *
 * Single Source of Truth für die typabhängigen KI-Briefing-Mini-Fragenkataloge
 * (AP2 / MBK-Schema v1.1.0 §4).
 *
 * Pro `AktivitaetenKatalog.name` definieren wir, welche strukturierten Felder
 * die Lehrkraft im KI-Modus ausfüllt. Das Frontend rendert daraus dynamisch
 * die Eingabemaske, das Backend serialisiert die Werte unverändert in
 * `ki_briefing.standard.parameter` bzw. `ki_briefing.standard.schwerpunkt`.
 *
 * Erweiterungspolitik (s. mbk-abstimmung-schritt5.md §4.2):
 *   - Phase 1: Mini-Kataloge für die fünf Standard-Typen (Quiz, Lückentext,
 *     Begriffe zuordnen, Sortier-/Reihenfolge-Aufgabe, Erklärtext/Input).
 *   - Aktivitätstypen ohne eigenen Katalog fallen auf DEFAULT_BRIEFING_KATALOG.
 *
 * Matching: Wir matchen lose über Substrings im AktivitaetenKatalog.name
 * (lowercase), analog zur Logik in MasterDetailView.jsx. Damit funktionieren
 * unterschiedliche Bezeichnungsvarianten ('Mini-Quiz', 'Miniquiz', 'Quiz') ohne
 * harte Kopplung an exakte Strings.
 */

/**
 * Schwierigkeits-Optionen, die in mehreren Mini-Katalogen wiederverwendet werden.
 */
const SCHWIERIGKEIT_OPTIONS = [
  { value: 'leicht', label: 'Leicht' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'schwer', label: 'Schwer' },
  { value: 'gemischt', label: 'Gemischt' },
];

/**
 * Default-Katalog: ein einziges Pflichtfeld `schwerpunkt`. Kommt zum Einsatz,
 * wenn keine spezifische Zuordnung gefunden wird.
 */
export const DEFAULT_BRIEFING_KATALOG = {
  variant: 'standard',
  schwerpunkt_label: 'Worauf soll die Aktivität abzielen?',
  schwerpunkt_placeholder:
    'Beschreibe in 1–2 Sätzen, was die Schüler hier lernen oder üben sollen.',
  parameter_fields: [],
};

/**
 * Mini-Kataloge pro Aktivitätstyp. Reihenfolge der Felder = Render-Reihenfolge.
 *
 * Feld-Schema:
 *   {
 *     name: string,                         // Schlüssel in ki_briefing.standard.parameter
 *     label: string,                        // UI-Label
 *     type: 'number'|'select'|'text'|'tags',
 *     required?: boolean,
 *     placeholder?: string,
 *     options?: Array<{value,label}>,       // nur für 'select'
 *     min?: number, max?: number,           // nur für 'number'
 *     hint?: string,                        // optionaler Hilfstext
 *   }
 */
const KATALOGE = [
  // ── Miniquiz / Multiple Choice / Test ─────────────────────────────────
  {
    matchers: ['miniquiz', 'mini-quiz', 'quiz', 'multiple choice', 'multiple-choice', 'test'],
    katalog: {
      variant: 'standard',
      schwerpunkt_label: 'Worauf soll das Quiz abzielen?',
      schwerpunkt_placeholder:
        'z. B. „Steigung in Linearen Funktionen ablesen und berechnen."',
      parameter_fields: [
        {
          name: 'anzahl_fragen',
          label: 'Anzahl Fragen',
          type: 'number',
          min: 1,
          max: 30,
          placeholder: 'z. B. 5',
          hint: 'Optional. Leer lassen, wenn die KI selbst entscheiden soll.',
        },
        {
          name: 'schwierigkeit',
          label: 'Schwierigkeit',
          type: 'select',
          options: SCHWIERIGKEIT_OPTIONS,
        },
        {
          name: 'quiz_typ',
          label: 'Aufgabenform',
          type: 'select',
          options: [
            { value: 'true_false', label: 'Wahr / Falsch' },
            { value: 'single_choice', label: 'Single Choice (eine richtige Antwort)' },
            { value: 'multiple_choice', label: 'Multiple Choice (mehrere richtig möglich)' },
          ],
          hint: 'Hilft der KI, Distraktoren passend zu bauen.',
        },
        {
          name: 'schwerpunktbereich',
          label: 'Eingrenzung (optional)',
          type: 'text',
          placeholder: 'z. B. „nur positive Steigungen" oder „ohne Spezialfälle"',
        },
      ],
    },
  },

  // ── Lückentext ────────────────────────────────────────────────────────
  {
    matchers: ['lückentext', 'lueckentext', 'lücken', 'cloze'],
    katalog: {
      variant: 'standard',
      schwerpunkt_label: 'Worauf soll der Lückentext abzielen?',
      schwerpunkt_placeholder: 'z. B. „Fachbegriffe der Zellbiologie."',
      parameter_fields: [
        {
          name: 'anzahl_luecken',
          label: 'Anzahl Lücken',
          type: 'number',
          min: 1,
          max: 30,
          placeholder: 'z. B. 8',
        },
        {
          name: 'wortarten_fokus',
          label: 'Wortart-Fokus (optional)',
          type: 'tags',
          placeholder: 'z. B. Substantive, Verben',
          hint: 'Mehrere Werte mit Enter trennen.',
        },
        {
          name: 'themenbereich',
          label: 'Themenbereich (optional)',
          type: 'text',
          placeholder: 'z. B. „nur Tierzelle, keine Pflanzenzelle"',
        },
      ],
    },
  },

  // ── Begriffe zuordnen ─────────────────────────────────────────────────
  {
    matchers: ['begriffe zuordnen', 'zuordnen', 'match terms', 'match'],
    katalog: {
      variant: 'standard',
      schwerpunkt_label: 'Worauf sollen die Zuordnungen abzielen?',
      schwerpunkt_placeholder: 'z. B. „Englisch-Vokabeln Klasse 7, Unit 3."',
      parameter_fields: [
        {
          name: 'anzahl_paare',
          label: 'Anzahl Paare',
          type: 'number',
          min: 2,
          max: 30,
          placeholder: 'z. B. 10',
        },
        {
          name: 'themenbereich',
          label: 'Themenbereich (optional)',
          type: 'text',
          placeholder: 'z. B. „Verben zur Reisetätigkeit"',
        },
      ],
    },
  },

  // ── Sortier- / Reihenfolge-Aufgabe ────────────────────────────────────
  {
    matchers: ['reihenfolge', 'sortierung', 'sortier', 'sequenzierung', 'sorting', 'sequence'],
    katalog: {
      variant: 'standard',
      schwerpunkt_label: 'Was soll sortiert werden?',
      schwerpunkt_placeholder: 'z. B. „Stationen der industriellen Revolution."',
      parameter_fields: [
        {
          name: 'anzahl_elemente',
          label: 'Anzahl Elemente',
          type: 'number',
          min: 2,
          max: 20,
          placeholder: 'z. B. 6',
        },
        {
          name: 'sortierkriterium',
          label: 'Sortierkriterium',
          type: 'text',
          placeholder: 'z. B. „zeitlich" oder „nach Komplexität"',
        },
      ],
    },
  },

  // ── Erklärtext / Input / Video-Beschreibung ───────────────────────────
  {
    matchers: ['erklärtext', 'erklaertext', 'input', 'video', 'erklärung', 'erklaerung'],
    katalog: {
      variant: 'standard',
      schwerpunkt_label: 'Was soll erklärt werden?',
      schwerpunkt_placeholder: 'z. B. „Was ist eine Hypotenuse?"',
      parameter_fields: [
        {
          name: 'kernpunkte',
          label: 'Kernpunkte (optional)',
          type: 'tags',
          placeholder: 'z. B. Definition, Lage im Dreieck, Beispiel',
          hint: 'Mehrere Werte mit Enter trennen.',
        },
        {
          name: 'wortlimit_override',
          label: 'Wortlimit überschreiben (optional)',
          type: 'number',
          min: 30,
          max: 1000,
          placeholder: 'z. B. 200',
          hint: 'Leer lassen, um die globale Lerntyp-Vorgabe zu verwenden.',
        },
      ],
    },
  },
];

/**
 * Findet den passenden Mini-Katalog für einen Aktivitätsnamen.
 * Liefert immer einen Katalog (im Zweifel den Default).
 *
 * @param {string} aktivitaetName  AktivitaetenKatalog.name
 * @returns {object} Katalog
 */
export function getBriefingKatalog(aktivitaetName) {
  const name = (aktivitaetName || '').toLowerCase();
  if (!name) return DEFAULT_BRIEFING_KATALOG;
  const found = KATALOGE.find(({ matchers }) =>
    matchers.some((m) => name.includes(m))
  );
  return found ? found.katalog : DEFAULT_BRIEFING_KATALOG;
}

/**
 * Validiert ein `ki_briefing`-Objekt gegen den passenden Katalog.
 * Liefert ein Array von Fehlermeldungen (leer = OK).
 *
 * Wird sowohl im Frontend (vor dem Speichern) als auch im Backend (
 * `updateActivitySecure`) verwendet, damit beide Seiten dieselben Pflicht-
 * felder durchsetzen.
 *
 * @param {object} briefing  ki_briefing-Objekt
 * @param {string} aktivitaetName  AktivitaetenKatalog.name (für variant='standard')
 */
export function validateKiBriefing(briefing, aktivitaetName = '') {
  const errors = [];
  if (!briefing || typeof briefing !== 'object') {
    errors.push('ki_briefing fehlt.');
    return errors;
  }

  if (briefing.variant === 'offen') {
    const offen = briefing.offen || {};
    if (!offen.lernziel?.trim()) {
      errors.push('Lernziel ist Pflicht.');
    }
    if (!offen.funktionsweise?.trim()) {
      errors.push('Funktionsweise ist Pflicht.');
    }
    return errors;
  }

  if (briefing.variant === 'standard') {
    const std = briefing.standard || {};
    if (!std.schwerpunkt?.trim()) {
      errors.push('Schwerpunkt ist Pflicht.');
    }
    return errors;
  }

  errors.push(`Unbekannte ki_briefing.variant: ${briefing.variant}`);
  return errors;
}