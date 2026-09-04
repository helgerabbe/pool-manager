/**
 * shared/mbkRueckmeldung.js
 *
 * Liest und normalisiert die Rückmeldungen des Baus (MBK) zu einem Kurs.
 *
 * Ablageort im Repository:
 *   kurse/<slug>/rueckmeldung/<YYYY-MM-DD>.json
 * Es gilt immer die JÜNGSTE .json-Datei je Kurs (Dateiname sortiert = Datum).
 * Das erwartete Format ist in src/docs/mbk-rueckmeldung-format.md beschrieben —
 * diese Datei ist die Spezifikation, die der MBK übergeben wird.
 *
 * Zwei Sorten Punkte, die bewusst getrennt bleiben:
 *   · befunde         → Stellen in der Einheit  → Pruefbefund (quelle='mbk')
 *   · externe_punkte  → Aufgaben der Administration → MbkAdminTodo
 *
 * Robustheit ist hier Absicht: Das Format wird noch mit der MBK abgestimmt.
 * Fehlende oder unbekannte Werte führen NICHT zum Abbruch, sondern zu einem
 * konservativen Standardwert (Kategorie 7 = „ohne Kategorie", Schwere 'hinweis').
 */

export const RUECKMELDUNG_FORMAT_VERSION = 1;

const ZIEL_TYPEN = ['aktivitaet', 'master_aufgabe', 'allgemeine_aufgabe', 'systembaustein', 'lernpaket'];
const SCHWEREN = ['blockiert', 'stoert', 'hinweis'];
const ARTEN = ['moodle', 'ki_prompt', 'sonstiges'];

/** Dateinamens-Slug — identisch zu src/lib/airGapClipboard.js slugify(). */
function slugify(input, fallback = 'einheit') {
  const s = (input || '').toString().toLowerCase().trim();
  if (!s) return fallback;
  return s
    .replace(/[äöüß]/g, (ch) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[ch]))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || fallback;
}

/**
 * Ordnername des Kurses im Repository. Muss exakt der Logik in
 * useAirGapPayloads (ordnerSlug) entsprechen, sonst zeigt der Pool-Manager
 * in einen fremden Ordner.
 */
export function getKursSlug(einheit) {
  if (!einheit) return '';
  return slugify(
    `${einheit.fach || 'fach'}-${einheit.jahrgangsstufe || ''}-${einheit.titel_der_einheit || ''}`,
    einheit.id || 'einheit'
  );
}

export function getRueckmeldungOrdner(slug) {
  return `kurse/${slug}/rueckmeldung`;
}

/** Wählt die jüngste .json-Datei aus einer Verzeichnisliste. */
export function waehleJuengsteDatei(dateien = []) {
  const jsons = dateien
    .filter((d) => /\.json$/i.test(d?.name || ''))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return jsons.length > 0 ? jsons[jsons.length - 1] : null;
}

function text(wert, max = 800) {
  if (wert === null || wert === undefined) return '';
  return String(wert).trim().slice(0, max);
}

/**
 * Normalisiert den Inhalt einer Rückmeldungs-Datei.
 * @returns {{meta: object, befunde: Array, externe: Array, warnungen: string[]}}
 */
export function parseRueckmeldung(rohText, quelldatei = '') {
  const warnungen = [];
  let daten;
  try {
    daten = JSON.parse(rohText);
  } catch (_e) {
    throw new Error(`Die Rückmeldung ${quelldatei} ist kein gültiges JSON.`);
  }

  const version = Number(daten?.format_version);
  if (Number.isFinite(version) && version > RUECKMELDUNG_FORMAT_VERSION) {
    warnungen.push(
      `Die Datei nutzt Format-Version ${version}; der Pool-Manager kennt ${RUECKMELDUNG_FORMAT_VERSION}. `
      + 'Unbekannte Felder werden ignoriert.'
    );
  }

  const gemeldetAm = text(daten?.erzeugt_am, 40) || null;

  const rohBefunde = Array.isArray(daten?.befunde) ? daten.befunde : [];
  const befunde = [];
  rohBefunde.forEach((b, index) => {
    const befundText = text(b?.befund, 900);
    if (!befundText) {
      warnungen.push(`Befund ${index + 1} ohne Text — übersprungen.`);
      return;
    }
    const stelle = b?.stelle && typeof b.stelle === 'object' ? b.stelle : {};
    const kategorieRoh = Number(b?.kategorie);
    // Kategorie 7 = „von der MBK gemeldet, ohne Kategorie". Bewusst kein
    // Raten per KI: eine falsche Kategorie ist schlechter als eine offene.
    const kategorie = [1, 2, 3, 4, 5, 6].includes(kategorieRoh) ? kategorieRoh : 7;
    const zielTyp = ZIEL_TYPEN.includes(stelle.ziel_typ) ? stelle.ziel_typ : 'lernpaket';

    befunde.push({
      mbk_id: text(b?.id, 120) || `${quelldatei}#${index + 1}`,
      kategorie,
      schwere: SCHWEREN.includes(b?.schwere) ? b.schwere : 'hinweis',
      ziel_typ: zielTyp,
      ziel_id: text(stelle.ziel_id, 120),
      ref_titel: text(stelle.ref_titel, 200),
      lernpaket_titel: text(stelle.lernpaket_titel, 200),
      themenfeld_titel: text(stelle.themenfeld_titel, 200),
      befund: befundText,
      vorschlag: text(b?.vorschlag, 600),
      gemeldet_am: gemeldetAm,
    });
  });

  const rohExterne = Array.isArray(daten?.externe_punkte) ? daten.externe_punkte : [];
  const externe = [];
  rohExterne.forEach((p, index) => {
    const titel = text(p?.titel, 200);
    if (!titel) {
      warnungen.push(`Externer Punkt ${index + 1} ohne Titel — übersprungen.`);
      return;
    }
    const anzahl = Number(p?.anzahl);
    externe.push({
      mbk_id: text(p?.id, 120) || `${quelldatei}#extern-${index + 1}`,
      titel,
      beschreibung: text(p?.beschreibung, 900),
      art: ARTEN.includes(p?.art) ? p.art : 'sonstiges',
      anzahl: Number.isFinite(anzahl) && anzahl > 0 ? Math.floor(anzahl) : null,
      gemeldet_am: gemeldetAm,
    });
  });

  return {
    meta: {
      format_version: Number.isFinite(version) ? version : null,
      erzeugt_am: gemeldetAm,
      kurs_slug: text(daten?.kurs_slug, 120),
      quelldatei,
    },
    befunde,
    externe,
    warnungen,
  };
}

/** Stabiler Fingerprint eines MBK-Befunds — kollidiert nie mit internen Befunden. */
export function buildMbkFingerprint(mbkId) {
  return `mbk:${mbkId}`;
}

/**
 * Ergänzt einen normalisierten Befund um die Zuordnung im Pool-Manager
 * (Lernpaket-Verweis), soweit sie sich aus ID oder Titel ergibt. Das ist die
 * Voraussetzung dafür, dass die Befund-Kachel später verlinken kann.
 */
export function ordneBefundZu(befund, { lernpakete = [], aufgaben = [] }) {
  const norm = (s) => String(s || '').trim().toLowerCase();

  let lernpaket = null;
  if (befund.ziel_id) {
    lernpaket = lernpakete.find((p) => p.id === befund.ziel_id) || null;
  }
  if (!lernpaket && befund.lernpaket_titel) {
    lernpaket = lernpakete.find((p) => norm(p.titel_des_pakets) === norm(befund.lernpaket_titel)) || null;
  }
  if (!lernpaket && befund.ziel_typ === 'lernpaket' && befund.ref_titel) {
    lernpaket = lernpakete.find((p) => norm(p.titel_des_pakets) === norm(befund.ref_titel)) || null;
  }

  let aufgabe = null;
  if (befund.ziel_typ === 'allgemeine_aufgabe') {
    if (befund.ziel_id) aufgabe = aufgaben.find((a) => a.id === befund.ziel_id) || null;
    if (!aufgabe && befund.ref_titel) {
      aufgabe = aufgaben.find((a) => norm(a.titel) === norm(befund.ref_titel)) || null;
    }
  }

  return {
    ...befund,
    ziel_id: aufgabe?.id || lernpaket?.id || befund.ziel_id || befund.mbk_id,
    ziel_titel: befund.ref_titel || aufgabe?.titel || lernpaket?.titel_des_pakets || 'Von der MBK gemeldete Stelle',
    lernpaket_id: lernpaket?.id || '',
    lernpaket_titel: lernpaket?.titel_des_pakets || befund.lernpaket_titel || '',
  };
}