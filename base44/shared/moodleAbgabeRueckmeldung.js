/**
 * shared/moodleAbgabeRueckmeldung.js
 *
 * Rückweg für die Moodle-Abgabe-Adressen — das Gegenstück zu
 * brianUrlRueckmeldung.js. Die Abgaben entstehen in Moodle beim Kursbau, der
 * Pool-Manager erfährt die Adresse also erst hierüber:
 *
 *   kurse/<slug>/moodle/<YYYY-MM-DD>.json     (format: "moodle-abgaben-1")
 *
 * Es gilt immer die JÜNGSTE Datei je Kurs — wie bei Brian und den Rückmeldungen.
 *
 * WOHIN DIE ADRESSE GEHÖRT (mit der MBK am 23.09.2026 verbindlich vereinbart):
 *   - `schritt_id` gefüllt  → sequenz_schritte[i].abgabe.moodle_abgabe_url
 *   - `schritt_id: null`    → moodle_abgabe_url an der Aufgabe selbst
 *
 * Robust gegen Namensvarianten, weil die Datei von einem anderen System kommt:
 * `url`/`moodle_url`, `aufgabe_id`/`id`, `schritt_id`/`sequenz_schritt_id`,
 * Liste unter `abgaben`/`aufgaben`/`urls`.
 */

export const MOODLE_ABGABE_FORMAT = 'moodle-abgaben-1';

export function getMoodleAbgabeOrdner(slug) {
  return `kurse/${slug}/moodle`;
}

function text(wert, max = 400) {
  if (wert === null || wert === undefined) return '';
  return String(wert).trim().slice(0, max);
}

/**
 * Normalisiert die Datei zu einer Liste { aufgabe_id, schritt_id, url, titel }.
 * Einträge ohne Adresse werden verworfen — sie tragen keine Information.
 */
export function parseMoodleAbgaben(rohText, quelldatei = '') {
  const warnungen = [];
  let daten;
  try {
    daten = JSON.parse(rohText);
  } catch (_e) {
    throw new Error(`Die Moodle-Datei ${quelldatei} ist kein gültiges JSON.`);
  }

  const format = text(daten?.format, 40);
  if (format && format !== MOODLE_ABGABE_FORMAT) {
    warnungen.push(`Unbekanntes Format „${format}" — es wird so gut wie möglich gelesen.`);
  }

  const rohListe = Array.isArray(daten?.abgaben)
    ? daten.abgaben
    : Array.isArray(daten?.aufgaben)
      ? daten.aufgaben
      : Array.isArray(daten?.urls)
        ? daten.urls
        : [];

  const eintraege = [];
  rohListe.forEach((e, index) => {
    const url = text(e?.url, 600) || text(e?.moodle_url, 600) || text(e?.moodle_abgabe_url, 600);
    if (!url) {
      warnungen.push(`Eintrag ${index + 1} ohne Adresse — übersprungen.`);
      return;
    }
    eintraege.push({
      aufgabe_id: text(e?.aufgabe_id, 120) || text(e?.id, 120),
      schritt_id: text(e?.schritt_id, 120) || text(e?.sequenz_schritt_id, 120),
      titel: text(e?.titel, 200) || text(e?.aufgabe, 200),
      url,
    });
  });

  return {
    meta: {
      format: format || null,
      erzeugt_am: text(daten?.erzeugt_am, 40) || text(daten?.gebaut_am, 40) || null,
      kurs_slug: text(daten?.kurs, 120) || text(daten?.kurs_slug, 120),
      quelldatei,
    },
    eintraege,
    warnungen,
  };
}

/**
 * Ordnet einen Eintrag einer Aufgabe zu — über die ID, sonst über den Titel.
 * Ohne diese Auflösung könnte die Adresse nirgends landen.
 */
export function findeAufgabe(eintrag, aufgaben = []) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  if (eintrag.aufgabe_id) {
    const treffer = aufgaben.find((a) => a.id === eintrag.aufgabe_id);
    if (treffer) return treffer;
  }
  if (eintrag.titel) {
    return aufgaben.find((a) => norm(a.titel) === norm(eintrag.titel)) || null;
  }
  return null;
}

/**
 * Baut das Update-Objekt für eine Aufgabe (null = Adresse steht schon so drin,
 * dann wird nicht geschrieben).
 *
 * Bei einem Abgabe-SCHRITT sitzt die Adresse am Schritt: Eine Aufgabenfolge kann
 * mehrere Abgaben enthalten, und die Adresse gehört zu genau einer davon.
 */
export function baueAufgabenUpdate(eintrag, aufgabe, jetzt) {
  if (eintrag.schritt_id) {
    const schritte = Array.isArray(aufgabe.sequenz_schritte) ? aufgabe.sequenz_schritte : [];
    const index = schritte.findIndex((s) => s?.id === eintrag.schritt_id);
    if (index < 0) return null;
    const schritt = schritte[index];
    const abgabe = schritt.abgabe || {};
    if (abgabe.moodle_abgabe_url === eintrag.url) return null;
    const neu = [...schritte];
    neu[index] = {
      ...schritt,
      abgabe: { ...abgabe, moodle_abgabe_url: eintrag.url, moodle_abgabe_synced_at: jetzt },
    };
    return { id: aufgabe.id, sequenz_schritte: neu };
  }

  if (aufgabe.moodle_abgabe_url === eintrag.url) return null;
  return {
    id: aufgabe.id,
    moodle_abgabe_url: eintrag.url,
    moodle_abgabe_synced_at: jetzt,
  };
}