/**
 * shared/didaktikerInhalt.js
 *
 * WIE der Didaktiker den Inhalt EINER Aktivität erzeugt.
 *
 * Zwei Wege — genau die beiden, die auch der Pool-Manager selbst benutzt:
 *
 *  A) Masterfähige Aufgabenarten (Lückentext, Begriffe zuordnen, Reihenfolge,
 *     Miniquiz, Test): Der Inhalt liegt NICHT an der Aktivität, sondern in
 *     MasterAufgabe-Datensätzen — genau das lesen die Schüler-Seiten. Die
 *     Formate kommen aus shared/aktivitaetInhaltSpecs.js, damit hier keine
 *     zweite Wahrheit über dieselben Datenformate entsteht.
 *
 *  B) Alle übrigen Aufgabenarten: field_values werden anhand des form_schema
 *     der Aufgabenart befüllt (text/textarea/number/select generisch, bekannte
 *     json-Felder nach fester Spezifikation, url-Felder per Web-Recherche mit
 *     HTTP-Prüfung — eine erfundene Adresse ist im Kurs ein toter Link).
 *
 * Der Foliensatz („slides") ist bewusst zweistufig: Das Modell liefert flache
 * Textfelder je Folie, hier werden daraus die Slot-Strukturen der App gebaut.
 * Ein Modell, das die verschachtelte Slot-Form direkt schreiben soll, trifft
 * sie unzuverlässig — und eine halb gebaute Folie ist im Kurs unbrauchbar.
 */

import {
  isEmptyValue,
  MASTER_TYP_SPEZIFIKATIONEN,
  NICHT_BEFUELLBARE_FELDTYPEN,
  JSON_FELD_SPEZIFIKATIONEN,
  TEXT_FELD_REGELN,
  SYSTEM_PROMPT,
  BASIS_REGELN,
} from './aktivitaetInhaltSpecs.js';
import { unwrapLLM } from './llmUtils.js';

export { SYSTEM_PROMPT, BASIS_REGELN };

// ── Foliensatz ────────────────────────────────────────────────────────
/** Slots je Folien-Vorlage — muss zu src/lib/slideshowVorlagen.js passen. */
const FOLIEN_SLOTS = {
  titel: ['titel', 'untertitel'],
  text: ['ueberschrift', 'text'],
  zwei_spalten: ['ueberschrift', 'links', 'rechts'],
};

const ERLAUBTE_TAGS = /<(?!\/?(?:b|i|u|br|ul|ol|li|strong|em)\b)[^>]*>/gi;

function saeubereHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(ERLAUBTE_TAGS, '')
    .trim();
}

const HELLE_HINTERGRUENDE = ['#ffffff', '#f1f5f9', '#fef3c7', '#dcfce7', '#dbeafe', '#ede9fe'];

const FOLIEN_SPEZIFIKATION = {
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        vorlage: { type: 'string', enum: ['titel', 'text', 'zwei_spalten'] },
        hintergrund: { type: 'string' },
        titel: { type: 'string' },
        untertitel: { type: 'string' },
        ueberschrift: { type: 'string' },
        text: { type: 'string' },
        links: { type: 'string' },
        rechts: { type: 'string' },
      },
      required: ['vorlage'],
    },
  },
  regel: [
    'slides: 5–8 ERKLÄRFOLIEN. Das sind KEINE PowerPoint-Stichpunkte, sondern ausformulierte Erklärungen, die Schüler ALLEIN lesen und verstehen.',
    'Aufbau: (1) Vorlage "titel" mit Thema + Leitfrage als Untertitel. (2) Eine Folie, die anknüpft: woher kennen die Schüler das? (3) Erklärfolien, jede baut auf der vorigen auf. (4) Mindestens eine Folie mit einem durchgerechneten oder durchgedachten Beispiel. (5) Abschlussfolie "Das musst du behalten".',
    'Vorlagen und ihre Felder: "titel" → titel + untertitel. "text" → ueberschrift + text (das Arbeitspferd). "zwei_spalten" → ueberschrift + links + rechts (für Gegenüberstellungen, häufige Fehler).',
    'Umfang: Feld "text" etwa 400–900 Zeichen (4–8 Sätze). Spalten je 200–450 Zeichen. Überschriften eine Zeile. Was länger wird, gehört auf zwei Folien — die Folie wird NICHT gescrollt.',
    'Formatierung nur mit <b>, <i>, <br>, <ul><li>. Keine anderen Tags, kein style-Attribut, keine Bilder.',
    'hintergrund: heller Hex-Wert aus #ffffff, #f1f5f9, #fef3c7, #dcfce7, #dbeafe, #ede9fe.',
  ].join(' '),
  build: (roh) => {
    const liste = Array.isArray(roh) ? roh : [];
    const folien = [];
    liste.forEach((f, i) => {
      const vorlage = FOLIEN_SLOTS[String(f?.vorlage || '').trim()] ? String(f.vorlage).trim() : 'text';
      const slots = FOLIEN_SLOTS[vorlage];
      const elemente = {};
      const reihenfolge = [];
      slots.forEach((slot) => {
        const html = saeubereHtml(f?.[slot]);
        if (html) {
          elemente[slot] = { html };
          reihenfolge.push(slot);
        }
      });
      if (reihenfolge.length === 0) return;
      const hg = String(f?.hintergrund || '').trim().toLowerCase();
      folien.push({
        id: `dk${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 7)}`,
        vorlage,
        hintergrund: HELLE_HINTERGRUENDE.includes(hg) ? hg : '#ffffff',
        elemente,
        einblenden: 'sofort',
        reihenfolge,
      });
    });
    return folien;
  },
  validate: (v) => Array.isArray(v) && v.length >= 3,
};

/** json-Feld-Spezifikationen des Didaktikers = Bestand + Foliensatz. */
const JSON_SPEZIFIKATIONEN = {
  ...JSON_FELD_SPEZIFIKATIONEN,
  slides: { schema: FOLIEN_SPEZIFIKATION.schema, regel: FOLIEN_SPEZIFIKATION.regel, validate: FOLIEN_SPEZIFIKATION.validate },
};

/** True, wenn diese Aufgabenart über MasterAufgaben befüllt wird. */
export function istMasterArt(katalog) {
  return !!(katalog && MASTER_TYP_SPEZIFIKATIONEN[katalog.name]);
}

export function getMasterSpezifikation(katalog) {
  return katalog ? MASTER_TYP_SPEZIFIKATIONEN[katalog.name] || null : null;
}

/**
 * Plant die Befüllung einer Aufgabenart nach Weg B (field_values).
 * @returns {{ felder: Array, urlFelder: Array, fehler: string|null }}
 */
export function planeFelder(katalog) {
  const formSchema = Array.isArray(katalog?.form_schema) ? katalog.form_schema : [];
  const felder = [];
  const urlFelder = [];

  for (const field of formSchema) {
    if (!field || !field.field_name || field.type === 'info') continue;

    if (field.type === 'url') {
      urlFelder.push(field);
      continue;
    }
    if (NICHT_BEFUELLBARE_FELDTYPEN.has(field.type)) {
      if (field.required) {
        return { felder: [], urlFelder: [], fehler: `„${field.label || field.field_name}" braucht eine hochgeladene Datei — das kann der Didaktiker nicht erzeugen.` };
      }
      continue;
    }
    if (field.type === 'json') {
      const spez = JSON_SPEZIFIKATIONEN[field.field_name];
      if (!spez) {
        if (field.required) {
          return { felder: [], urlFelder: [], fehler: `Die Aufgabenart „${katalog.name}" kann der Didaktiker noch nicht befüllen.` };
        }
        continue;
      }
      felder.push({ field, schema: spez.schema, regel: spez.regel, validate: spez.validate, jsonName: field.field_name });
      continue;
    }

    let schema;
    if (field.type === 'number') schema = { type: 'number' };
    else if (field.type === 'select') {
      const werte = (field.options || []).map((o) => o?.value).filter(Boolean);
      schema = werte.length > 0 ? { type: 'string', enum: werte } : { type: 'string' };
    } else schema = { type: 'string' };

    felder.push({
      field,
      schema,
      regel: TEXT_FELD_REGELN[field.field_name] || null,
      validate: (v) => !isEmptyValue(v),
    });
  }

  return { felder, urlFelder, fehler: null };
}

/** Baut die field_values aus der Modell-Antwort — mit Nachbau der json-Felder. */
export function baueFieldValues(plan, ausgabe, urlWert) {
  const werte = {};
  const probleme = [];

  for (const eintrag of plan.felder) {
    const rohWert = ausgabe?.[eintrag.field.field_name];
    const wert = eintrag.jsonName === 'slides' ? FOLIEN_SPEZIFIKATION.build(rohWert) : rohWert;
    if (eintrag.validate(wert)) werte[eintrag.field.field_name] = wert;
    else if (eintrag.field.required) probleme.push(eintrag.field.label || eintrag.field.field_name);
  }

  if (urlWert) {
    for (const f of plan.urlFelder) werte[f.field_name] = urlWert;
  } else if (plan.urlFelder.some((f) => f.required)) {
    probleme.push('Adresse (Link)');
  }

  return { field_values: werte, probleme };
}

// ── Web-Recherche für url-Felder ──────────────────────────────────────
const URL_TIMEOUT_MS = 6000;

/** Prüft, ob eine Adresse wirklich erreichbar ist. */
export async function urlExistiert(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoolManagerBot/1.0; +https://base44.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    res.body?.cancel().catch(() => {});
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sucht eine echte, erreichbare Lernquelle. Studyflix wird bevorzugt (dort
 * besteht ein Vertrag); jeder Kandidat wird per HTTP geprüft, bevor er
 * zurückkommt — erfundene Adressen fallen so heraus.
 */
export async function findeQuelle(base44, { fach, jahrgangsstufe, thema, lernpaket, vorschlaege = [] }) {
  // Zuerst die in der Recherche gefundenen Adressen prüfen — sie sind schon
  // fachlich eingeordnet und kosten keinen weiteren Modellaufruf.
  for (const kandidat of vorschlaege.slice(0, 4)) {
    const url = String(kandidat?.url || '').trim();
    if (url && (await urlExistiert(url))) {
      return { url, titel: String(kandidat.titel || ''), beschreibung: String(kandidat.beschreibung || '') };
    }
  }

  const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Du suchst ein Lernvideo für den Schulunterricht.

Fach: ${fach} · Jahrgangsstufe: ${jahrgangsstufe}
Thema der Einheit: ${thema}
Lernpaket: ${lernpaket}

Finde ein passendes Lernvideo — BEVORZUGT auf studyflix.de (Format https://studyflix.de/...). Nur wenn es dort nichts Passendes gibt, weiche auf andere seriöse deutschsprachige Lernangebote aus.

WICHTIG: Gib bis zu 5 Kandidaten zurück, den besten zuerst. Ausschließlich echte, existierende Adressen — erfinde nichts, im Zweifel weglassen.`,
    add_context_from_internet: true,
    model: 'gemini_3_8_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        kandidaten: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              titel: { type: 'string' },
              beschreibung: { type: 'string' },
            },
            required: ['url', 'titel'],
          },
        },
      },
      required: ['kandidaten'],
    },
  });

  const daten = unwrapLLM(antwort);
  let kandidaten = (Array.isArray(daten?.kandidaten) ? daten.kandidaten : []).filter(
    (k) => k && typeof k.url === 'string' && k.url.trim() !== ''
  );
  kandidaten = [
    ...kandidaten.filter((k) => k.url.includes('studyflix.de')),
    ...kandidaten.filter((k) => !k.url.includes('studyflix.de')),
  ];
  for (const k of kandidaten.slice(0, 5)) {
    if (await urlExistiert(k.url.trim())) {
      return { url: k.url.trim(), titel: String(k.titel || ''), beschreibung: String(k.beschreibung || '') };
    }
  }
  return null;
}