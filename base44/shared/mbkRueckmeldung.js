/**
 * shared/mbkRueckmeldung.js
 *
 * Liest und normalisiert die Rückmeldungen des Baus (MBK) zu einem Kurs.
 *
 * Ablageort im Repository:
 *   kurse/<slug>/rueckmeldung/<YYYY-MM-DD>.json
 * Es gilt immer die JÜNGSTE .json-Datei je Kurs (Dateiname sortiert = Datum).
 *
 * Gelesen wird das Format, das die MBK bereits schreibt (`format:
 * "rueckmeldung-1"`, siehe src/docs/mbk-rueckmeldung-format.md). Zusätzlich
 * werden ein paar gleichbedeutende Feldnamen akzeptiert, damit eine spätere
 * Umbenennung auf der Bau-Seite nichts zerreißt.
 *
 * Drei Sorten Angaben, bewusst getrennt behandelt:
 *   · befunde           → Stellen in der Einheit    → Pruefbefund (quelle='mbk')
 *   · checkliste_extern → Arbeiten in Moodle o. Ä.  → MbkAdminTodo
 *   · brian_auftraege   → wird NICHT übernommen: dafür gibt es im Prüfbereich
 *                         schon den eigenen Brian-Check (BrianCheckCard), der
 *                         dieselbe Frage aus erster Hand beantwortet.
 *
 * Robustheit ist Absicht: fehlende oder unbekannte Werte führen nie zum
 * Abbruch, sondern zu einem konservativen Standardwert (Kategorie 7 = „ohne
 * Kategorie", Schwere 'hinweis').
 */

export const RUECKMELDUNG_FORMAT_VERSION = 1;

const SCHWEREN = ['blockiert', 'stoert', 'hinweis'];

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

function text(wert, max = 900) {
  if (wert === null || wert === undefined) return '';
  return String(wert).trim().slice(0, max);
}

/** 'stört' und 'stoert' meinen dasselbe — der Bau schreibt die Umlaut-Variante. */
function normalisiereSchwere(wert) {
  const s = String(wert || '').toLowerCase().trim();
  if (s === 'stört' || s === 'stoert') return 'stoert';
  return SCHWEREN.includes(s) ? s : 'hinweis';
}

/** Kurzer, stabiler Hash — für Punkte, die keine eigene id mitbringen. */
function kurzHash(eingabe) {
  const s = String(eingabe || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

/**
 * Normalisiert den Inhalt einer Rückmeldungs-Datei.
 * @returns {{meta: object, befunde: Array, externe: Array, warnungen: string[], uebersprungen: number}}
 */
export function parseRueckmeldung(rohText, quelldatei = '') {
  const warnungen = [];
  let daten;
  try {
    daten = JSON.parse(rohText);
  } catch (_e) {
    throw new Error(`Die Rückmeldung ${quelldatei} ist kein gültiges JSON.`);
  }

  const format = text(daten?.format, 40);
  if (format && format !== 'rueckmeldung-1') {
    warnungen.push(`Unbekanntes Format „${format}" — es wird so gut wie möglich gelesen.`);
  }

  const gemeldetAm = text(daten?.gebaut_am, 40) || text(daten?.erzeugt_am, 40) || text(daten?.export_vom, 40) || null;

  const rohBefunde = Array.isArray(daten?.befunde) ? daten.befunde : [];
  const befunde = [];
  let uebersprungen = 0;

  rohBefunde.forEach((b, index) => {
    const befundText = text(b?.befund, 900);
    if (!befundText) {
      warnungen.push(`Befund ${index + 1} ohne Text — übersprungen.`);
      return;
    }
    // Punkte, die der Bau selbst als geklärt kennzeichnet, gehören nicht in die
    // Taskliste: 'bewusst_exportiert' stammt aus unserer eigenen Begründung, die
    // im Payload mitgereist ist, 'erledigt' ist ohnehin vom Tisch.
    if (b?.bewusst_exportiert === true || String(b?.status || '').toLowerCase() === 'erledigt') {
      uebersprungen += 1;
      return;
    }

    // Die MBK nennt die Stelle flach (aktivitaet_id/aktivitaet); die
    // Spezifikation erlaubt zusätzlich ein verschachteltes `stelle`-Objekt.
    const stelle = b?.stelle && typeof b.stelle === 'object' ? b.stelle : {};
    const kategorieRoh = Number(b?.kategorie);
    const kategorie = [1, 2, 3, 4, 5, 6].includes(kategorieRoh) ? kategorieRoh : 7;

    befunde.push({
      mbk_id: text(b?.id, 120) || `${quelldatei}#${index + 1}`,
      kategorie,
      schwere: normalisiereSchwere(b?.schwere ?? stelle.schwere),
      // Kandidat für die Auflösung: kann eine Aktivität, ein Lernpaket, eine
      // allgemeine Aufgabe oder ein Themenfeld sein — das entscheidet sich erst
      // beim Abgleich mit den Daten der Einheit (ordneBefundZu).
      ziel_id_kandidat: text(b?.aktivitaet_id, 120) || text(stelle.ziel_id, 120),
      ref_titel: text(b?.aktivitaet, 200) || text(stelle.ref_titel, 200),
      themenfeld_id: text(b?.themenfeld_id, 120) || text(stelle.themenfeld_id, 120),
      themenfeld_titel: text(b?.themenfeld, 200) || text(stelle.themenfeld_titel, 200),
      lernpaket_titel: text(b?.lernpaket, 200) || text(stelle.lernpaket_titel, 200),
      befund: befundText,
      vorschlag: text(b?.vorschlag, 600),
      gemeldet_am: gemeldetAm,
    });
  });

  // Externe Checkliste: der Bau schreibt {text, aktivitaet_id} ohne eigene id.
  // Der Fingerprint entsteht daher aus Stelle + Text — sonst gäbe es bei jedem
  // Abholen neue Einträge.
  const rohExterne = Array.isArray(daten?.checkliste_extern)
    ? daten.checkliste_extern
    : Array.isArray(daten?.externe_punkte)
      ? daten.externe_punkte
      : [];
  const externe = [];
  rohExterne.forEach((p, index) => {
    const inhalt = text(p?.text, 900) || text(p?.beschreibung, 900);
    const titel = text(p?.titel, 200) || inhalt.slice(0, 120);
    if (!titel) {
      warnungen.push(`Externer Punkt ${index + 1} ohne Text — übersprungen.`);
      return;
    }
    const bezug = text(p?.aktivitaet_id, 120);
    const anzahl = Number(p?.anzahl);
    externe.push({
      mbk_id: text(p?.id, 120) || `extern:${bezug || 'ohne'}:${kurzHash(inhalt)}`,
      titel,
      beschreibung: inhalt,
      // Der Bau schickt keine Art mit — sie wird aus dem Text erkannt, weil die
      // Gruppierung in der Admin-Ansicht sonst wertlos wäre.
      art: /moodle/i.test(inhalt) ? 'moodle' : /prompt|brian|ki\b/i.test(inhalt) ? 'ki_prompt' : 'sonstiges',
      anzahl: Number.isFinite(anzahl) && anzahl > 0 ? Math.floor(anzahl) : null,
      gemeldet_am: gemeldetAm,
    });
  });

  return {
    meta: {
      format: format || null,
      schema_version: text(daten?.schema_version, 40) || null,
      erzeugt_am: gemeldetAm,
      export_vom: text(daten?.export_vom, 40) || null,
      einheit_id: text(daten?.einheit_id, 120) || null,
      kurs_slug: text(daten?.kurs, 120) || text(daten?.kurs_slug, 120),
      quelldatei,
    },
    befunde,
    externe,
    warnungen,
    uebersprungen,
  };
}

/** Stabiler Fingerprint eines MBK-Befunds — kollidiert nie mit internen Befunden. */
export function buildMbkFingerprint(mbkId) {
  return `mbk:${mbkId}`;
}

/**
 * Löst die von der MBK genannte Stelle gegen die Daten der Einheit auf.
 *
 * Der Bau schickt eine ID, sagt aber nicht, was sie ist — dieselbe Angabe kann
 * eine Aktivität, ein Lernpaket, eine allgemeine Aufgabe oder ein Themenfeld
 * bezeichnen. Ohne diese Auflösung könnte die Taskliste nicht an die Stelle
 * verlinken, und genau daran entscheidet sich, ob die Liste benutzt wird.
 */
export function ordneBefundZu(befund, { lernpakete = [], aufgaben = [], aktivitaeten = [], themenfelder = [] }) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const id = befund.ziel_id_kandidat || '';

  const aufgabe = id ? aufgaben.find((a) => a.id === id) : null;
  const lernpaketDirekt = id ? lernpakete.find((p) => p.id === id) : null;
  const aktivitaet = id ? aktivitaeten.find((a) => a.id === id) : null;
  const themenfeld = (befund.themenfeld_id ? themenfelder.find((t) => t.id === befund.themenfeld_id) : null)
    || (id ? themenfelder.find((t) => t.id === id) : null);

  let zielTyp = 'lernpaket';
  let zielId = id;
  let lernpaket = lernpaketDirekt;

  if (aufgabe) {
    zielTyp = 'allgemeine_aufgabe';
    zielId = aufgabe.id;
  } else if (aktivitaet) {
    zielTyp = 'aktivitaet';
    zielId = aktivitaet.id;
    lernpaket = lernpakete.find((p) => p.id === aktivitaet.lernpaket_id) || null;
  } else if (lernpaketDirekt) {
    zielTyp = 'lernpaket';
    zielId = lernpaketDirekt.id;
  }

  // Letzte Chance über den Titel — der Bau nennt ihn immer mit.
  if (!lernpaket && befund.lernpaket_titel) {
    lernpaket = lernpakete.find((p) => norm(p.titel_des_pakets) === norm(befund.lernpaket_titel)) || null;
  }

  const themenfeldTitel = befund.themenfeld_titel || themenfeld?.titel || '';

  return {
    mbk_id: befund.mbk_id,
    kategorie: befund.kategorie,
    schwere: befund.schwere,
    befund: befund.befund,
    vorschlag: befund.vorschlag,
    gemeldet_am: befund.gemeldet_am,
    ziel_typ: zielTyp,
    // Ohne auflösbare Stelle steht die MBK-Kennung im Feld: kein Link, aber
    // auch keine falsche Zuordnung.
    ziel_id: zielId || befund.mbk_id,
    ziel_titel: befund.ref_titel
      || aufgabe?.titel
      || lernpaket?.titel_des_pakets
      || themenfeldTitel
      || 'Von der MBK gemeldete Stelle',
    lernpaket_id: lernpaket?.id || '',
    lernpaket_titel: lernpaket?.titel_des_pakets || befund.lernpaket_titel || '',
    themenfeld_id: themenfeld?.id || befund.themenfeld_id || '',
    themenfeld_titel: themenfeldTitel,
  };
}