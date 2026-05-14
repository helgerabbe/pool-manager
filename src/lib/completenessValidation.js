/**
 * lib/completenessValidation.js
 *
 * Single Source of Truth für die Vollständigkeitsprüfung von Aktivitäten,
 * Master-Aufgaben, Allgemeinen Aufgaben, Projekten und Lernpaketen.
 *
 * Wird sowohl im Frontend (Live-Anzeige in Modals) als auch im Backend
 * (updateActivitySecure etc.) aufgerufen. So ist garantiert, dass „vollständig"
 * überall dasselbe bedeutet.
 *
 * Konzept (vgl. Schlachtplan 2026-05-14):
 * - `validate*()` liefert immer { isComplete, missingFields }
 * - `missingFields` ist ein Array von { fieldName, label, reason }
 * - Reine Funktionen, KEINE Side-Effects, KEINE Netzwerk-Calls.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function miss(fieldName, label, reason) {
  return { fieldName, label, reason };
}

// ---------------------------------------------------------------------------
// Spezial-Validierer für strukturierte JSON-Felder
// ---------------------------------------------------------------------------

/**
 * Lückentext: braucht Text mit mindestens einer Lücke.
 * Struktur: { text: string, gaps: [{ id, correct }] }
 */
function validateLueckentextData(data) {
  if (!data || typeof data !== 'object') return 'Lückentext-Inhalt fehlt';
  if (!data.text || data.text.trim() === '') return 'Lückentext-Text fehlt';
  const gaps = Array.isArray(data.gaps) ? data.gaps : [];
  const validGaps = gaps.filter(g => g && g.correct && String(g.correct).trim() !== '');
  if (validGaps.length < 1) return 'Mindestens eine Lücke mit Lösung erforderlich';
  return null;
}

/**
 * Begriffe zuordnen: braucht mindestens 3 vollständige Paare.
 * Struktur: { pairs: [{ left, right }] }
 */
function validateMatchData(data) {
  if (!data || typeof data !== 'object') return 'Zuordnungs-Daten fehlen';
  const pairs = Array.isArray(data.pairs) ? data.pairs : [];
  const validPairs = pairs.filter(p =>
    p && String(p.left || '').trim() !== '' && String(p.right || '').trim() !== ''
  );
  if (validPairs.length < 3) {
    return `Mindestens 3 vollständige Paare erforderlich (aktuell: ${validPairs.length})`;
  }
  return null;
}

/**
 * Multiple Choice: mindestens 1 Frage mit ≥2 Antworten und ≥1 richtigen.
 * Struktur: { questions: [{ text, answers: [{ text, correct }] }] }
 */
function validateMcData(data) {
  if (!data || typeof data !== 'object') return 'Multiple-Choice-Inhalt fehlt';
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (questions.length < 1) return 'Mindestens eine Frage erforderlich';
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || !q.text || String(q.text).trim() === '') {
      return `Frage ${i + 1}: Fragetext fehlt`;
    }
    const answers = Array.isArray(q.answers) ? q.answers : [];
    const validAnswers = answers.filter(a => a && String(a.text || '').trim() !== '');
    if (validAnswers.length < 2) {
      return `Frage ${i + 1}: Mindestens 2 Antworten erforderlich`;
    }
    if (!validAnswers.some(a => a.correct === true)) {
      return `Frage ${i + 1}: Mindestens eine richtige Antwort markieren`;
    }
  }
  return null;
}

/**
 * Miniquiz: mindestens 3 Fragen mit Antwort.
 * Struktur: { questions: [{ frage, antwort }] } ODER altes Schema { fragen: [...] }
 */
function validateMiniQuizData(data) {
  if (!data || typeof data !== 'object') return 'Miniquiz-Inhalt fehlt';
  const questions = Array.isArray(data.questions)
    ? data.questions
    : (Array.isArray(data.fragen) ? data.fragen : []);
  const validQs = questions.filter(q =>
    q && String(q.frage || q.text || '').trim() !== '' &&
    String(q.antwort || q.korrekt || '').trim() !== ''
  );
  if (validQs.length < 3) {
    return `Mindestens 3 vollständige Fragen erforderlich (aktuell: ${validQs.length})`;
  }
  return null;
}

/**
 * Sortier-Liste: mindestens 3 Items.
 * Struktur: { items: [{ text, position }] }
 */
function validateSortData(data) {
  if (!data || typeof data !== 'object') return 'Sortier-Daten fehlen';
  const items = Array.isArray(data.items) ? data.items : [];
  const validItems = items.filter(it => it && String(it.text || '').trim() !== '');
  if (validItems.length < 3) {
    return `Mindestens 3 Sortier-Elemente erforderlich (aktuell: ${validItems.length})`;
  }
  return null;
}

/**
 * Bildbeschriftung: mindestens 2 Drop-Zones mit Label.
 * Struktur: { dropzones: [{ id, x, y, label }], distraktoren?: [...] }
 */
function validateMarkerData(data) {
  if (!data || typeof data !== 'object') return 'Markerdaten fehlen';
  const zones = Array.isArray(data.dropzones) ? data.dropzones : [];
  const validZones = zones.filter(z => z && String(z.label || '').trim() !== '');
  if (validZones.length < 2) {
    return `Mindestens 2 beschriftete Drop-Zonen erforderlich (aktuell: ${validZones.length})`;
  }
  return null;
}

/**
 * Test (Abschluss): mindestens 1 Frage.
 * Struktur: flexibel — { questions: [...] } oder { fragen: [...] }
 */
function validateTestData(data) {
  if (!data || typeof data !== 'object') return 'Test-Inhalt fehlt';
  const qs = Array.isArray(data.questions)
    ? data.questions
    : (Array.isArray(data.fragen) ? data.fragen : []);
  if (qs.length < 1) return 'Mindestens eine Frage erforderlich';
  return null;
}

// JSON-Validatoren pro field_name. Wenn ein field_name hier nicht gelistet ist,
// wird der generische „nicht leer"-Check verwendet.
const JSON_FIELD_VALIDATORS = {
  lueckentext_data: validateLueckentextData,
  match_data: validateMatchData,
  mc_data: validateMcData,
  answer_data: validateMiniQuizData,
  sort_data: validateSortData,
  marker_data: validateMarkerData,
  test_data: validateTestData,
};

// ---------------------------------------------------------------------------
// 1) Aktivität (LernpaketPhaseAktivitaet) — generisch via form_schema
// ---------------------------------------------------------------------------

/**
 * Prüft, ob eine Aktivität auf Basis ihres Katalog-Schemas vollständig ist.
 *
 * @param {object} catalogEntry   AktivitaetenKatalog-Record (mit form_schema)
 * @param {object} fieldValues    LernpaketPhaseAktivitaet.field_values
 * @returns {{ isComplete: boolean, missingFields: Array<{fieldName,label,reason}> }}
 */
export function validateActivity(catalogEntry, fieldValues = {}) {
  if (!catalogEntry || !Array.isArray(catalogEntry.form_schema)) {
    return { isComplete: true, missingFields: [] };
  }

  const missingFields = [];
  for (const field of catalogEntry.form_schema) {
    if (!field || !field.field_name) continue;
    if (field.type === 'info') continue;
    if (!field.required) continue;

    const value = fieldValues[field.field_name];

    // Spezial-Validatoren für strukturierte JSON-Felder.
    const customValidator = JSON_FIELD_VALIDATORS[field.field_name];
    if (customValidator) {
      const reason = customValidator(value);
      if (reason) missingFields.push(miss(field.field_name, field.label, reason));
      continue;
    }

    // Generischer Leer-Check.
    if (isEmptyValue(value)) {
      missingFields.push(miss(field.field_name, field.label, 'Pflichtfeld leer'));
    }
  }

  return { isComplete: missingFields.length === 0, missingFields };
}

// ---------------------------------------------------------------------------
// 2) Master-Aufgabe — identisches Schema wie Aktivität
// ---------------------------------------------------------------------------

/**
 * Master-Aufgaben verwenden dieselben field_values wie ihre Aktivität,
 * deshalb ist die Validierung identisch.
 */
export function validateMasterAufgabe(catalogEntry, fieldValues = {}) {
  return validateActivity(catalogEntry, fieldValues);
}

// ---------------------------------------------------------------------------
// 3) Allgemeine Aufgabe (Ebene 2 & 3, ohne Projekt)
// ---------------------------------------------------------------------------

/**
 * Prüft AllgemeineAufgabe basierend auf `aufgaben_typ`.
 *
 * @param {object} aufgabe  AllgemeineAufgabe-Record
 */
export function validateAllgemeineAufgabe(aufgabe) {
  if (!aufgabe) return { isComplete: false, missingFields: [miss('_', 'Aufgabe', 'Keine Aufgabe vorhanden')] };

  const missingFields = [];
  const typ = aufgabe.aufgaben_typ || 'inhalt';

  // KI-Modus: Briefing prüfen, nicht Aufgabenstellung.
  if (aufgabe.erstellungs_modus === 'ki') {
    const briefing = aufgabe.ki_briefing || {};
    const variant = briefing.variant;
    if (!variant) {
      missingFields.push(miss('ki_briefing.variant', 'KI-Briefing', 'Briefing-Variante fehlt'));
    } else if (variant === 'offen') {
      const off = briefing.offen || {};
      if (isEmptyValue(off.lernziel)) missingFields.push(miss('ki_briefing.offen.lernziel', 'Lernziel', 'Pflichtfeld leer'));
      if (isEmptyValue(off.funktionsweise)) missingFields.push(miss('ki_briefing.offen.funktionsweise', 'Funktionsweise', 'Pflichtfeld leer'));
    } else if (variant === 'standard') {
      const std = briefing.standard || {};
      if (isEmptyValue(std.schwerpunkt)) missingFields.push(miss('ki_briefing.standard.schwerpunkt', 'Schwerpunkt', 'Pflichtfeld leer'));
    }
    return { isComplete: missingFields.length === 0, missingFields };
  }

  // Manueller Modus — typabhängig:
  switch (typ) {
    case 'inhalt':
    case 'prozess':
      if (isEmptyValue(aufgabe.aufgabenstellung)) {
        missingFields.push(miss('aufgabenstellung', 'Aufgabenstellung', 'Pflichtfeld leer'));
      }
      break;
    case 'handlung':
      if (isEmptyValue(aufgabe.aufgabenstellung)) {
        missingFields.push(miss('aufgabenstellung', 'Aufgabenstellung', 'Pflichtfeld leer'));
      }
      if (isEmptyValue(aufgabe.hinweise_zum_material)) {
        missingFields.push(miss('hinweise_zum_material', 'Material-Hinweise', 'Pflichtfeld leer'));
      }
      break;
    case 'buendel': {
      const ids = Array.isArray(aufgabe.verlinkte_lernpaket_ids) ? aufgabe.verlinkte_lernpaket_ids : [];
      if (ids.length < 1) {
        missingFields.push(miss('verlinkte_lernpaket_ids', 'Verlinkte Lernpakete', 'Mindestens ein Lernpaket erforderlich'));
      }
      break;
    }
    case 'auswahl_buendel': {
      const ids = Array.isArray(aufgabe.verlinkte_aufgaben_ids) ? aufgabe.verlinkte_aufgaben_ids : [];
      if (ids.length < 2) {
        missingFields.push(miss('verlinkte_aufgaben_ids', 'Auswahl-Aufgaben', `Mindestens 2 Aufgaben erforderlich (aktuell: ${ids.length})`));
      }
      if (!Number.isInteger(aufgabe.erforderliche_anzahl) || aufgabe.erforderliche_anzahl < 1) {
        missingFields.push(miss('erforderliche_anzahl', 'Erforderliche Anzahl', 'Muss ≥ 1 sein'));
      }
      break;
    }
    case 'projekt_anker': {
      const ids = Array.isArray(aufgabe.verlinkte_projekt_ids) ? aufgabe.verlinkte_projekt_ids : [];
      if (ids.length < 1) {
        missingFields.push(miss('verlinkte_projekt_ids', 'Verlinkte Projekte', 'Mindestens ein Projekt erforderlich'));
      }
      break;
    }
    default:
      if (isEmptyValue(aufgabe.aufgabenstellung)) {
        missingFields.push(miss('aufgabenstellung', 'Aufgabenstellung', 'Pflichtfeld leer'));
      }
  }

  return { isComplete: missingFields.length === 0, missingFields };
}

// ---------------------------------------------------------------------------
// 4) Projektaufgabe (anforderungsebene === '3 - Projekt')
// ---------------------------------------------------------------------------

/**
 * Projekte sind Allgemeine Aufgaben mit zusätzlichen Pflichtfeldern.
 */
export function validateProjektaufgabe(aufgabe) {
  const base = validateAllgemeineAufgabe(aufgabe);
  const missingFields = [...base.missingFields];

  if (isEmptyValue(aufgabe?.erwartungshorizont)) {
    missingFields.push(miss('erwartungshorizont', 'Erwartungshorizont', 'Pflichtfeld leer'));
  }
  if (isEmptyValue(aufgabe?.ergebnis_form)) {
    missingFields.push(miss('ergebnis_form', 'Ergebnis-Form', 'Pflichtfeld leer'));
  }
  if (isEmptyValue(aufgabe?.ergebnis_dateiformat)) {
    missingFields.push(miss('ergebnis_dateiformat', 'Ergebnis-Dateiformat', 'Pflichtfeld leer'));
  }

  return { isComplete: missingFields.length === 0, missingFields };
}

// ---------------------------------------------------------------------------
// 5) Lernpaket — aggregiert, prüft auch Kinder
// ---------------------------------------------------------------------------

/**
 * Ein Lernpaket ist vollständig, wenn alle aktiven Phasen-Aktivitäten
 * einzeln vollständig UND freigegeben sind.
 *
 * @param {object} lernpaket
 * @param {Array<object>} activities  LernpaketPhaseAktivitaet-Records des Pakets
 *                                    (jede mit `is_complete` und `content_status`)
 * @returns {{ isComplete, missingFields, blockingActivities }}
 *   - blockingActivities: Aktivitäten, die noch nicht freigegeben sind
 */
export function validateLernpaketReleaseReadiness(lernpaket, activities = []) {
  if (!lernpaket) {
    return { isComplete: false, missingFields: [], blockingActivities: [] };
  }

  const phasenConf = lernpaket.phasen_konfiguration || {};
  const activeActivities = activities.filter(a => {
    if (!a || !a.phase) return false;
    const conf = phasenConf[a.phase];
    return !(conf && conf.disabled === true);
  });

  const blockingActivities = activeActivities.filter(
    a => a.content_status !== 'approved' || a.is_complete !== true
  );

  const missingFields = blockingActivities.map(a =>
    miss(`activity:${a.id}`, a.titel || a.id, 'Aktivität noch nicht freigegeben oder unvollständig')
  );

  return {
    isComplete: blockingActivities.length === 0 && activeActivities.length > 0,
    missingFields,
    blockingActivities,
  };
}

// ---------------------------------------------------------------------------
// Exports gesammelt
// ---------------------------------------------------------------------------

export default {
  validateActivity,
  validateMasterAufgabe,
  validateAllgemeineAufgabe,
  validateProjektaufgabe,
  validateLernpaketReleaseReadiness,
};