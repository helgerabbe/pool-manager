/**
 * shared/importAuftragInhalt.js
 *
 * Die INHALTLICHE Prüfung eines Auftrags, der Aktivitäts-Inhalte mitbringt.
 * Die Strukturprüfung (Vertrag) sitzt in importAuftragSchemata.js — hier geht
 * es um die Frage, ob die mitgelieferten field_values eine Aufgabe ergeben,
 * mit der Schüler etwas anfangen können.
 *
 * Die Regeln sind bewusst dieselben, die auch beim Speichern im Pool-Manager
 * gelten (Spiegel von src/lib/completenessValidation.js bzw. der Inline-Prüfung
 * in updateActivitySecure) — sonst würde ein Auftrag durchgehen, den die App
 * selbst als unvollständig ablehnen würde.
 *
 * Reine Funktionen, keine I/O.
 */

function leer(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function pruefeJsonFeld(fieldName, data) {
  if (!data || typeof data !== 'object') return 'Inhalt fehlt';
  switch (fieldName) {
    case 'match_data': {
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const valid = pairs.filter((p) => p && !leer(p.left) && !leer(p.right));
      return valid.length < 3 ? `Mindestens 3 vollständige Paare (aktuell: ${valid.length})` : null;
    }
    case 'mc_data': {
      const qs = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length < 1) return 'Mindestens eine Frage erforderlich';
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (!q || leer(q.text)) return `Frage ${i + 1}: Fragetext fehlt`;
        const ans = Array.isArray(q.answers) ? q.answers.filter((a) => a && !leer(a.text)) : [];
        if (ans.length < 2) return `Frage ${i + 1}: Mindestens 2 Antworten`;
        if (!ans.some((a) => a.correct === true)) return `Frage ${i + 1}: Richtige Antwort markieren`;
      }
      return null;
    }
    case 'lueckentext_data': {
      if (leer(data.text)) return 'Lückentext-Text fehlt';
      const gaps = Array.isArray(data.gaps) ? data.gaps : [];
      return gaps.filter((g) => g && !leer(g.correct)).length < 1 ? 'Mindestens eine Lücke mit Lösung' : null;
    }
    case 'answer_data': {
      const qs = Array.isArray(data.questions) ? data.questions : Array.isArray(data.fragen) ? data.fragen : [];
      const valid = qs.filter((q) => q && !leer(q.frage || q.text) && !leer(q.antwort || q.korrekt));
      return valid.length < 3 ? `Mindestens 3 vollständige Fragen (aktuell: ${valid.length})` : null;
    }
    case 'sort_data': {
      const items = Array.isArray(data.items) ? data.items : [];
      const valid = items.filter((it) => it && !leer(it.text));
      return valid.length < 3 ? `Mindestens 3 Sortier-Elemente (aktuell: ${valid.length})` : null;
    }
    case 'marker_data': {
      const zones = Array.isArray(data.dropzones) ? data.dropzones : [];
      const valid = zones.filter((z) => z && !leer(z.label));
      return valid.length < 2 ? `Mindestens 2 beschriftete Drop-Zonen (aktuell: ${valid.length})` : null;
    }
    case 'test_data': {
      const qs = Array.isArray(data.questions) ? data.questions : Array.isArray(data.fragen) ? data.fragen : [];
      return qs.length < 1 ? 'Mindestens eine Frage erforderlich' : null;
    }
    default:
      return null;
  }
}

const PLATZHALTER = /(lorem ipsum|todo|tbd|xxx+|platzhalter|hier text|beispieltext)/i;

/**
 * Prüft die field_values einer Aktivität gegen das form_schema ihrer
 * Aufgabenart (Katalog-Eintrag).
 *
 * @returns {{ isComplete: boolean, missingFields: Array<{fieldName,label,reason}> }}
 */
export function pruefeAktivitaetInhalt(katalog, fieldValues = {}) {
  const missingFields = [];
  if (!katalog || !Array.isArray(katalog.form_schema)) {
    return { isComplete: true, missingFields };
  }

  // Sonderfall Bildbeschriftung: Der Editor speichert unter eigenen Keys.
  const istBildbeschriftung =
    String(katalog.name || '').toLowerCase().includes('bildbeschriftung') ||
    katalog.form_schema.some((f) => f && f.field_name === 'marker_data');
  if (istBildbeschriftung) {
    const hatBild = !leer(fieldValues.backgroundImage) || !leer(fieldValues.image_url);
    if (!hatBild) {
      missingFields.push({ fieldName: 'backgroundImage', label: 'Hintergrundbild', reason: 'Bild fehlt' });
    }
    const zonen = Array.isArray(fieldValues.dropZones) ? fieldValues.dropZones : [];
    const gueltig = zonen.filter((z) => z && !leer(z.label));
    if (gueltig.length < 2) {
      missingFields.push({
        fieldName: 'dropZones',
        label: 'Zielbegriffe',
        reason: `Mindestens 2 beschriftete Begriffe (aktuell: ${gueltig.length})`,
      });
    }
    return { isComplete: missingFields.length === 0, missingFields };
  }

  for (const field of katalog.form_schema) {
    if (!field || !field.field_name || field.type === 'info') continue;
    const wert = fieldValues[field.field_name];

    if (field.type === 'json') {
      if (!field.required && leer(wert)) continue;
      const grund = pruefeJsonFeld(field.field_name, wert);
      if (grund) missingFields.push({ fieldName: field.field_name, label: field.label, reason: grund });
      continue;
    }

    if (field.required && leer(wert)) {
      missingFields.push({ fieldName: field.field_name, label: field.label, reason: 'Pflichtfeld leer' });
      continue;
    }

    // Platzhalter-Erkennung: ein Auftrag mit "TODO" im Aufgabentext ist keine
    // fertige Aufgabe — genau das meldet die eigene Prüfung sonst später als Fund.
    if (typeof wert === 'string' && PLATZHALTER.test(wert)) {
      missingFields.push({
        fieldName: field.field_name,
        label: field.label,
        reason: 'Enthält einen Platzhalter-Text',
      });
    }
  }

  return { isComplete: missingFields.length === 0, missingFields };
}