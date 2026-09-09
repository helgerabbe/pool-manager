/**
 * shared/brianUrlRueckmeldung.js
 *
 * Rückweg für die Brian-Adressen: Der Bau (MBK) legt die Aufgaben selbst in
 * Brian.study an und kennt deshalb als Erster die Adresse jedes Dialogs. Damit
 * der Pool-Manager sie ebenfalls kennt (Schüleransicht, Vorschau, Kontrolle),
 * schreibt die MBK sie in den Austauschordner:
 *
 *   kurse/<slug>/brian/<YYYY-MM-DD>.json     (format: "brian-urls-1")
 *
 * Es gilt immer die JÜNGSTE Datei je Kurs — genau wie bei den Rückmeldungen.
 * Format: src/docs/mbk-brian-urls-format.md
 *
 * Robust gegen Namensvarianten: `url`/`brian_url`, `aufgabe_id`/`id`,
 * `schritt_id`/`sequenz_schritt_id`, Liste unter `dialoge`/`aufgaben`/`urls`.
 */

export const BRIAN_URL_FORMAT = 'brian-urls-1';

export function getBrianUrlOrdner(slug) {
  return `kurse/${slug}/brian`;
}

function text(wert, max = 400) {
  if (wert === null || wert === undefined) return '';
  return String(wert).trim().slice(0, max);
}

/**
 * Normalisiert die Datei zu einer Liste { aufgabe_id, schritt_id, dialog_id, url, titel }.
 * Einträge ohne URL werden verworfen — sie tragen keine Information.
 */
export function parseBrianUrls(rohText, quelldatei = '') {
  const warnungen = [];
  let daten;
  try {
    daten = JSON.parse(rohText);
  } catch (_e) {
    throw new Error(`Die Brian-Datei ${quelldatei} ist kein gültiges JSON.`);
  }

  const format = text(daten?.format, 40);
  if (format && format !== BRIAN_URL_FORMAT) {
    warnungen.push(`Unbekanntes Format „${format}" — es wird so gut wie möglich gelesen.`);
  }

  const rohListe = Array.isArray(daten?.dialoge)
    ? daten.dialoge
    : Array.isArray(daten?.aufgaben)
      ? daten.aufgaben
      : Array.isArray(daten?.urls)
        ? daten.urls
        : [];

  const eintraege = [];
  rohListe.forEach((e, index) => {
    const url = text(e?.url, 600) || text(e?.brian_url, 600);
    if (!url) {
      warnungen.push(`Eintrag ${index + 1} ohne Adresse — übersprungen.`);
      return;
    }
    eintraege.push({
      aufgabe_id: text(e?.aufgabe_id, 120) || text(e?.id, 120),
      schritt_id: text(e?.schritt_id, 120) || text(e?.sequenz_schritt_id, 120),
      dialog_id: text(e?.dialog_id, 120) || text(e?.brian_dialog_id, 120),
      titel: text(e?.titel, 200) || text(e?.aufgabe, 200) || text(e?.dialog_name, 200),
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
 * Ordnet einen Eintrag einer Aufgabe zu — über die ID, sonst über den Titel
 * bzw. den in Brian vergebenen Dialognamen. Ohne diese Auflösung könnte die
 * Adresse nirgends landen.
 */
export function findeAufgabe(eintrag, aufgaben = []) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  if (eintrag.aufgabe_id) {
    const treffer = aufgaben.find((a) => a.id === eintrag.aufgabe_id);
    if (treffer) return treffer;
  }
  if (eintrag.titel) {
    return (
      aufgaben.find((a) => norm(a.titel) === norm(eintrag.titel)) ||
      aufgaben.find((a) => norm(a.brian_dialog_name) === norm(eintrag.titel)) ||
      null
    );
  }
  return null;
}

/**
 * Trägt die Adresse in die Aufgabe ein und gibt das Update-Objekt zurück
 * (null = alles schon aktuell, dann wird nicht geschrieben).
 *
 * Bei Aufgabensequenzen sitzt die Adresse AM SCHRITT: Brian legt pro Dialog
 * eine eigene Aufgabe an, und eine Sequenz kann mehrere Gespräche enthalten.
 */
export function baueAufgabenUpdate(eintrag, aufgabe, jetzt) {
  if (eintrag.schritt_id) {
    const schritte = Array.isArray(aufgabe.sequenz_schritte) ? aufgabe.sequenz_schritte : [];
    const index = schritte.findIndex((s) => s?.id === eintrag.schritt_id);
    if (index < 0) return null;
    const schritt = schritte[index];
    const brian = schritt.brian || {};
    if (brian.url === eintrag.url) return null;
    const neu = [...schritte];
    neu[index] = {
      ...schritt,
      brian: {
        ...brian,
        url: eintrag.url,
        dialog_id: eintrag.dialog_id || brian.dialog_id || '',
        sync_status: 'synced',
        synced_at: jetzt,
      },
    };
    return { id: aufgabe.id, sequenz_schritte: neu };
  }

  if (aufgabe.brian_url === eintrag.url) return null;
  return {
    id: aufgabe.id,
    brian_url: eintrag.url,
    brian_dialog_id: eintrag.dialog_id || aufgabe.brian_dialog_id || '',
    brian_sync_status: 'synced',
    brian_synced_at: jetzt,
  };
}