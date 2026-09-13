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

import { MASTER_TYP_SPEZIFIKATIONEN } from './aktivitaetInhaltSpecs.js';

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
 * Prüft mitgelieferte AUFGABEN-VARIANTEN (MasterAufgaben) einer Aufgabenart.
 *
 * Gemessen wird mit derselben Elle, die auch der Pool-Manager selbst anlegt:
 * die `build`-Funktion der Format-Spezifikation. Sie liefert null, wenn der
 * Inhalt zu dünn ist (zu wenige Paare, keine Lücken, keine richtige Antwort) —
 * genau das wäre für Schüler eine unbrauchbare Aufgabe.
 *
 * @returns {{ missingFields: Array, gebaut: Array }} gebaut = normalisierte Varianten
 */
export function pruefeMasterVarianten(katalog, varianten, pfad = 'parameter.master_varianten') {
  const missingFields = [];
  const gebaut = [];
  const spez = katalog ? MASTER_TYP_SPEZIFIKATIONEN[katalog.name] : null;

  if (!spez) {
    missingFields.push({
      fieldName: pfad,
      label: 'Aufgaben-Varianten',
      reason: `Die Aufgabenart „${katalog?.name || '—'}" arbeitet nicht mit Varianten`,
    });
    return { missingFields, gebaut };
  }

  const liste = Array.isArray(varianten) ? varianten : [];
  liste.forEach((variante, idx) => {
    const fertig = spez.build(variante);
    if (!fertig) {
      missingFields.push({
        fieldName: `${pfad}.${idx}`,
        label: `Variante ${idx + 1}`,
        reason: 'Inhalt unvollständig für diese Aufgabenart',
      });
      return;
    }
    gebaut.push(fertig);
  });

  if (gebaut.length === 0 && missingFields.length === 0) {
    missingFields.push({ fieldName: pfad, label: 'Aufgaben-Varianten', reason: 'Mindestens eine Variante' });
  }

  return { missingFields, gebaut };
}

/**
 * Prüft die field_values einer Aktivität gegen das form_schema ihrer
 * Aufgabenart (Katalog-Eintrag).
 *
 * `masterVarianten`: Sind Varianten mitgeliefert, steckt der Inhalt dort — die
 * json-Pflichtfelder der Aufgabenart werden dann nicht mehr verlangt. Ohne
 * diese Ausnahme wäre keines der Varianten-Formate über das Tor anlegbar.
 *
 * @returns {{ isComplete: boolean, missingFields: Array<{fieldName,label,reason}> }}
 */
export function pruefeAktivitaetInhalt(katalog, fieldValues = {}, masterVarianten = null) {
  const missingFields = [];
  if (!katalog || !Array.isArray(katalog.form_schema)) {
    return { isComplete: true, missingFields };
  }

  const mitVarianten = Array.isArray(masterVarianten) && masterVarianten.length > 0;
  if (mitVarianten) {
    missingFields.push(...pruefeMasterVarianten(katalog, masterVarianten).missingFields);
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
      // Varianten-Weg: der Inhalt liegt in den MasterAufgaben, nicht hier.
      if (mitVarianten && leer(wert)) continue;
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

/**
 * Die inhaltliche Prüfung EINES Schritts einer Aufgabensequenz.
 *
 * Geprüft wird gegen die Pflichtfelder seiner Schritt-Art (SCHRITT_TYPEN im
 * Vertrag) — bei Schritten aus dem Aktivitätenkatalog zusätzlich gegen das
 * form_schema der Aufgabenart, also mit genau derselben Messlatte wie eine
 * Aktivität in einem Lernpaket.
 *
 * @param {object} schritt      Der Schritt aus sequenz_schritte
 * @param {Map}    katalogById  id → Katalog-Eintrag (für typ='katalog')
 * @param {string} pfad         Feld-Präfix für die Meldungen (z. B. 'parameter.schritt')
 */
export function pruefeSchrittInhalt(schritt, katalogById = new Map(), pfad = 'schritt') {
  const missingFields = [];
  const typ = schritt?.typ;

  if (!schritt || typeof schritt !== 'object') {
    return { missingFields: [{ fieldName: pfad, label: 'Schritt', reason: 'Schritt fehlt' }] };
  }
  if (!SCHRITT_REGELN[typ]) {
    missingFields.push({
      fieldName: `${pfad}.typ`,
      label: 'Schritt-Art',
      reason: `Unbekannte oder in v1 nicht unterstützte Schritt-Art "${typ || '—'}"`,
    });
    return { missingFields };
  }

  if (typ === 'katalog') {
    const katalog = katalogById.get(schritt.aktivitaet_id);
    if (!katalog) {
      missingFields.push({
        fieldName: `${pfad}.aktivitaet_id`,
        label: 'Aufgabenart',
        reason: 'Aufgabenart nicht im Katalog gefunden',
      });
      return { missingFields };
    }
    const inhalt = pruefeAktivitaetInhalt(katalog, schritt.field_values || {});
    missingFields.push(
      ...inhalt.missingFields.map((m) => ({ ...m, fieldName: `${pfad}.field_values.${m.fieldName}` }))
    );
    return { missingFields };
  }

  const regel = SCHRITT_REGELN[typ];
  const block = schritt[regel.block] || {};

  for (const feldName of regel.pflicht || []) {
    if (leer(block[feldName])) {
      missingFields.push({
        fieldName: `${pfad}.${regel.block}.${feldName}`,
        label: regel.labels?.[feldName] || feldName,
        reason: 'Pflichtfeld leer',
      });
    }
  }

  // Material braucht mindestens EINE Quelle — ein Materialschritt ohne Inhalt
  // ist für Schüler eine leere Seite.
  if (typ === 'material' && leer(block.inhalt) && leer(block.url) && leer(block.datei_url)) {
    missingFields.push({
      fieldName: `${pfad}.material.inhalt`,
      label: 'Inhalt des Materials',
      reason: 'Text, Link oder Datei angeben',
    });
  }

  for (const [feldName, wert] of Object.entries(block)) {
    if (typeof wert === 'string' && PLATZHALTER.test(wert)) {
      missingFields.push({
        fieldName: `${pfad}.${regel.block}.${feldName}`,
        label: regel.labels?.[feldName] || feldName,
        reason: 'Enthält einen Platzhalter-Text',
      });
    }
  }

  return { missingFields };
}

/**
 * Die Prüfung einer GANZEN Schrittfolge. Eine Sequenz ohne Schritt ist keine
 * Aufgabe; doppelte Schritt-IDs wären fatal, weil schrittgenaue Aufträge den
 * Schritt über seine id finden.
 *
 * @returns {{ isComplete: boolean, missingFields: Array }}
 */
export function pruefeSequenzInhalt(schritte, katalogById = new Map(), pfad = 'parameter.sequenz_schritte') {
  const missingFields = [];
  const liste = Array.isArray(schritte) ? schritte : [];

  if (liste.length === 0) {
    missingFields.push({ fieldName: pfad, label: 'Schritte der Sequenz', reason: 'Mindestens ein Schritt' });
    return { isComplete: false, missingFields };
  }

  const gesehen = new Set();
  liste.forEach((schritt, idx) => {
    const id = schritt?.id;
    if (id) {
      if (gesehen.has(id)) {
        missingFields.push({
          fieldName: `${pfad}.${idx}.id`,
          label: `Schritt ${idx + 1}`,
          reason: 'Diese Schritt-ID kommt mehrfach vor',
        });
      }
      gesehen.add(id);
    }
    const res = pruefeSchrittInhalt(schritt, katalogById, `${pfad}.${idx}`);
    missingFields.push(
      ...res.missingFields.map((m) => ({ ...m, label: `Schritt ${idx + 1}: ${m.label}` }))
    );
  });

  return { isComplete: missingFields.length === 0, missingFields };
}

/** Pflichtfelder je Schritt-Art — Spiegel von SCHRITT_TYPEN im Vertrag. */
const SCHRITT_REGELN = {
  material: {
    block: 'material',
    pflicht: ['material_typ'],
    labels: { material_typ: 'Art des Materials', inhalt: 'Text / Inhalt', url: 'Link' },
  },
  aufgabe: {
    block: 'aufgabe',
    pflicht: ['aufgabenstellung'],
    labels: { aufgabenstellung: 'Aufgabenstellung', musterloesung: 'Musterlösung' },
  },
  katalog: { block: null, pflicht: [], labels: {} },
  offen: { block: 'offen', pflicht: ['fragment'], labels: { fragment: 'HTML-Fragment' } },
  handlung: {
    block: 'handlung',
    pflicht: ['arbeitsauftrag'],
    labels: { arbeitsauftrag: 'Arbeitsauftrag', material_hinweis: 'Materialhinweis' },
  },
  extern: { block: 'extern', pflicht: ['url'], labels: { url: 'Adresse der Seite' } },
  abgabe: { block: 'abgabe', pflicht: ['formate'], labels: { formate: 'Abgabeformate' } },
};