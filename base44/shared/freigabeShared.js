/**
 * base44/shared/freigabeShared.js
 *
 * Gemeinsame Logik des Freigabe-Workflows für Backend-Funktionen
 * (setReleaseStatusSecure, bulkReleaseCompleteSecure):
 *   - Vollständigkeits-Validierung (Aktivitäten + AllgemeineAufgaben)
 *   - Paginierte Filter-Hilfe
 *   - RBAC-Check "darf Einheit bearbeiten"
 *
 * WICHTIG: Validierungsregeln synchron halten mit src/lib/completenessValidation.js!
 */

export const EINHEIT_LOCKING_LIFECYCLES = new Set([
  'final_freigegeben',
  'export_running',
  'published',
]);

const PAGE_SIZE = 500;

export async function listAllByFilter(entity, query, sort = 'created_date') {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Vollständigkeits-Validierung
// ---------------------------------------------------------------------------

export function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function validateJsonStruct(fieldName, data) {
  if (!data || typeof data !== 'object') return 'Inhalt fehlt';
  switch (fieldName) {
    case 'match_data': {
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const valid = pairs.filter(p => p && String(p.left || '').trim() !== '' && String(p.right || '').trim() !== '');
      return valid.length < 3 ? `Mindestens 3 vollständige Paare (aktuell: ${valid.length})` : null;
    }
    case 'mc_data': {
      const qs = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length < 1) return 'Mindestens 1 Frage';
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (!q || isEmpty(q.text)) return `Frage ${i + 1}: Text fehlt`;
        const ans = Array.isArray(q.answers) ? q.answers.filter(a => a && !isEmpty(a.text)) : [];
        if (ans.length < 2) return `Frage ${i + 1}: Mindestens 2 Antworten`;
        if (!ans.some(a => a.correct === true)) return `Frage ${i + 1}: Mindestens 1 richtige Antwort markieren`;
      }
      return null;
    }
    case 'lueckentext_data': {
      if (isEmpty(data.text)) return 'Text fehlt';
      const gaps = Array.isArray(data.gaps) ? data.gaps : [];
      const valid = gaps.filter(g => g && !isEmpty(g.correct));
      return valid.length < 1 ? 'Mindestens 1 Lücke mit Lösung' : null;
    }
    case 'answer_data': {
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.fragen) ? data.fragen : []);
      const valid = qs.filter(q => q && !isEmpty(q.frage || q.text) && !isEmpty(q.antwort || q.korrekt));
      return valid.length < 3 ? `Mindestens 3 vollständige Fragen (aktuell: ${valid.length})` : null;
    }
    case 'sort_data': {
      const items = Array.isArray(data.items) ? data.items : [];
      const valid = items.filter(it => it && !isEmpty(it.text));
      return valid.length < 3 ? `Mindestens 3 Sortier-Elemente (aktuell: ${valid.length})` : null;
    }
    case 'marker_data': {
      const zones = Array.isArray(data.dropzones) ? data.dropzones : [];
      const valid = zones.filter(z => z && !isEmpty(z.label));
      return valid.length < 2 ? `Mindestens 2 beschriftete Drop-Zonen (aktuell: ${valid.length})` : null;
    }
    case 'test_data': {
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.fragen) ? data.fragen : []);
      return qs.length < 1 ? 'Mindestens 1 Frage' : null;
    }
    default:
      return null; // Unbekannter JSON-Feldname → Leer-Check via isEmpty()
  }
}

export function validateActivityCompleteness(catalog, fieldValues = {}) {
  if (!catalog || !Array.isArray(catalog.form_schema)) return { isComplete: true, missingFields: [] };

  // ── Sonderfall Bildbeschriftung ──────────────────────────────────────────
  // Der ImageLabelingEditor speichert seine Daten unter eigenen Top-Level-Keys
  // (backgroundImage / dropZones) und NICHT unter den Schema-Feldnamen.
  const isImageLabeling = (catalog.name || '').toLowerCase().includes('bildbeschriftung')
    || catalog.form_schema.some(f => f && f.field_name === 'marker_data');
  if (isImageLabeling) {
    const missing = [];
    const hasImage = !isEmpty(fieldValues.backgroundImage) || !isEmpty(fieldValues.image_url);
    if (!hasImage) {
      missing.push({ fieldName: 'backgroundImage', label: 'Hintergrundbild', reason: 'Bitte ein Bild hochladen' });
    }
    const zones = Array.isArray(fieldValues.dropZones) ? fieldValues.dropZones : [];
    const validZones = zones.filter(z => z && String(z.label || '').trim() !== '');
    if (validZones.length < 2) {
      missing.push({ fieldName: 'dropZones', label: 'Zielbegriffe', reason: `Mindestens 2 beschriftete Begriffe erforderlich (aktuell: ${validZones.length})` });
    }
    return { isComplete: missing.length === 0, missingFields: missing };
  }

  const missingFields = [];
  for (const field of catalog.form_schema) {
    if (!field || !field.field_name || field.type === 'info' || !field.required) continue;
    const value = fieldValues[field.field_name];
    if (field.type === 'json') {
      const reason = validateJsonStruct(field.field_name, value);
      if (reason) missingFields.push({ fieldName: field.field_name, label: field.label, reason });
    } else if (isEmpty(value)) {
      missingFields.push({ fieldName: field.field_name, label: field.label, reason: 'Pflichtfeld leer' });
    }
  }
  return { isComplete: missingFields.length === 0, missingFields };
}

export function validateAllgemeineAufgabeCompleteness(a) {
  if (!a) return { isComplete: false, missingFields: [{ fieldName: '_', reason: 'Keine Aufgabe' }] };
  const missing = [];

  if (a.erstellungs_modus === 'ki') {
    const br = a.ki_briefing || {};
    if (!br.variant) missing.push({ fieldName: 'ki_briefing.variant', reason: 'Variante fehlt' });
    else if (br.variant === 'offen') {
      if (isEmpty(br.offen?.lernziel)) missing.push({ fieldName: 'ki_briefing.offen.lernziel', reason: 'Pflichtfeld leer' });
      if (isEmpty(br.offen?.funktionsweise)) missing.push({ fieldName: 'ki_briefing.offen.funktionsweise', reason: 'Pflichtfeld leer' });
    } else if (br.variant === 'standard') {
      if (isEmpty(br.standard?.schwerpunkt)) missing.push({ fieldName: 'ki_briefing.standard.schwerpunkt', reason: 'Pflichtfeld leer' });
    }
    return { isComplete: missing.length === 0, missingFields: missing };
  }

  switch (a.aufgaben_typ || 'inhalt') {
    case 'inhalt':
    case 'prozess':
      if (isEmpty(a.aufgabenstellung)) missing.push({ fieldName: 'aufgabenstellung', reason: 'Pflichtfeld leer' });
      break;
    case 'handlung':
      if (isEmpty(a.aufgabenstellung)) missing.push({ fieldName: 'aufgabenstellung', reason: 'Pflichtfeld leer' });
      if (isEmpty(a.hinweise_zum_material)) missing.push({ fieldName: 'hinweise_zum_material', reason: 'Pflichtfeld leer' });
      break;
    case 'buendel':
      if (!Array.isArray(a.verlinkte_lernpaket_ids) || a.verlinkte_lernpaket_ids.length < 1) {
        missing.push({ fieldName: 'verlinkte_lernpaket_ids', reason: 'Mindestens 1 Lernpaket' });
      }
      break;
    case 'auswahl_buendel':
      if (!Array.isArray(a.verlinkte_aufgaben_ids) || a.verlinkte_aufgaben_ids.length < 2) {
        missing.push({ fieldName: 'verlinkte_aufgaben_ids', reason: 'Mindestens 2 Aufgaben' });
      }
      if (!Number.isInteger(a.erforderliche_anzahl) || a.erforderliche_anzahl < 1) {
        missing.push({ fieldName: 'erforderliche_anzahl', reason: 'Muss ≥ 1 sein' });
      }
      break;
    case 'projekt_anker':
      if (!Array.isArray(a.verlinkte_projekt_ids) || a.verlinkte_projekt_ids.length < 1) {
        missing.push({ fieldName: 'verlinkte_projekt_ids', reason: 'Mindestens 1 Projekt' });
      }
      break;
    default:
      if (isEmpty(a.aufgabenstellung)) missing.push({ fieldName: 'aufgabenstellung', reason: 'Pflichtfeld leer' });
  }

  // Projekt-Zusatzfelder
  if (a.anforderungsebene === '3 - Projekt') {
    if (isEmpty(a.erwartungshorizont)) missing.push({ fieldName: 'erwartungshorizont', reason: 'Pflichtfeld leer' });
    if (isEmpty(a.ergebnis_form)) missing.push({ fieldName: 'ergebnis_form', reason: 'Pflichtfeld leer' });
    if (isEmpty(a.ergebnis_dateiformat)) missing.push({ fieldName: 'ergebnis_dateiformat', reason: 'Pflichtfeld leer' });
  }

  return { isComplete: missing.length === 0, missingFields: missing };
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

export async function checkUserCanEditEinheit(base44, user, einheit) {
  const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  const profil = benutzer[0];
  const rolle = profil?.rolle || 'Betrachter';
  const faecher = profil?.fachbereich_zustaendigkeit || [];

  if (rolle === 'Administrator') return { allowed: true, rolle };
  if (rolle === 'Fachschaftsleitung') {
    return faecher.includes(einheit.fach)
      ? { allowed: true, rolle }
      : { allowed: false, rolle, reason: 'wrong_fach' };
  }
  if (rolle === 'Fachlehrkraft') {
    const ms = await listAllByFilter(base44.asServiceRole.entities.EinheitMembers, {
      einheit_id: einheit.id,
      user_email: user.email,
    });
    const m = ms[0];
    if (m && (m.unit_role === 'LEITUNG' || m.unit_role === 'EDITOR')) {
      return { allowed: true, rolle };
    }
    return { allowed: false, rolle, reason: 'no_delegation' };
  }
  return { allowed: false, rolle, reason: 'insufficient_role' };
}