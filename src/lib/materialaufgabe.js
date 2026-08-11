/**
 * lib/materialaufgabe.js
 *
 * Gemeinsame Logik der Aktivität „Materialaufgabe": ein Material
 * (Text/Bild/Audio/Video/PDF/Link) und dazu ein Satz eindeutig auswertbarer
 * Fragen. Wird von Editor, Schülerseite und Vollständigkeitsprüfung genutzt.
 */

export const ANTWORT_FORMATE = [
  { value: 'auswahl', label: 'Auswahl (eine richtige Antwort)' },
  { value: 'mehrfach', label: 'Mehrfachauswahl (mehrere richtige)' },
  { value: 'wahr_falsch', label: 'Richtig / Falsch' },
  { value: 'kurzantwort', label: 'Kurzantwort (genaues Wort)' },
];

export const MATERIAL_TYPEN = [
  { value: 'text', label: 'Text' },
  { value: 'bild', label: 'Bild' },
  { value: 'audio', label: 'Audio / Tondatei' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link' },
];

/** Maximale Dateigröße pro Material-Typ (in MB). */
export const MAX_UPLOAD_MB = {
  bild: 10,
  pdf: 20,
  audio: 25,
  video: 100,
  text: 20,
};

export const EMPTY_MATERIAL = {
  material_typ: 'text',
  beschreibung: '',
  inhalt: '',
  url: '',
  datei_url: '',
  transkript: '',
};

export function leereFrage() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    frage: '',
    format: 'auswahl',
    optionen: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
    korrekt_bool: true,
    loesungen: '',
    gross_klein_ignorieren: true,
    rueckmeldung: '',
  };
}

/** Ist das Material inhaltlich befüllt? */
export function istMaterialBefuellt(material = {}) {
  const typ = material.material_typ || 'text';
  if (typ === 'text') return String(material.inhalt || '').trim() !== '' || !!material.datei_url;
  if (typ === 'link') return String(material.url || '').trim() !== '';
  return !!material.datei_url || String(material.url || '').trim() !== '';
}

/** Ist eine einzelne Frage vollständig auswertbar? */
export function istFrageVollstaendig(frage = {}) {
  if (String(frage.frage || '').trim() === '') return false;
  if (frage.format === 'wahr_falsch') return typeof frage.korrekt_bool === 'boolean';
  if (frage.format === 'kurzantwort') return String(frage.loesungen || '').trim() !== '';
  const optionen = (frage.optionen || []).filter((o) => String(o?.text || '').trim() !== '');
  return optionen.length >= 2 && optionen.some((o) => o.isCorrect === true);
}

/** Erlaubte Schreibweisen einer Kurzantwort (durch ; getrennt). */
export function loesungsVarianten(frage = {}) {
  return String(frage.loesungen || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Prüft eine Schülerantwort deterministisch.
 * @param {object} frage
 * @param {any} antwort  kurzantwort: string · auswahl: number · mehrfach: number[] · wahr_falsch: boolean
 */
export function pruefeAntwort(frage = {}, antwort) {
  if (frage.format === 'wahr_falsch') {
    return typeof antwort === 'boolean' && antwort === frage.korrekt_bool;
  }
  if (frage.format === 'kurzantwort') {
    const eingabe = String(antwort || '').trim();
    if (eingabe === '') return false;
    return loesungsVarianten(frage).some((l) =>
      frage.gross_klein_ignorieren === false
        ? l === eingabe
        : l.toLowerCase() === eingabe.toLowerCase()
    );
  }
  const optionen = frage.optionen || [];
  const richtigeIdx = optionen.map((o, i) => (o?.isCorrect ? i : -1)).filter((i) => i >= 0);
  if (frage.format === 'mehrfach') {
    const gewaehlt = Array.isArray(antwort) ? [...antwort].sort() : [];
    const soll = [...richtigeIdx].sort();
    return gewaehlt.length === soll.length && gewaehlt.every((v, i) => v === soll[i]);
  }
  return typeof antwort === 'number' && richtigeIdx.includes(antwort);
}

/** Lesbare Lösung – für die Anzeige nach dem Prüfen. */
export function loesungsText(frage = {}) {
  if (frage.format === 'wahr_falsch') return frage.korrekt_bool ? 'Richtig' : 'Falsch';
  if (frage.format === 'kurzantwort') return loesungsVarianten(frage).join(' / ');
  return (frage.optionen || [])
    .filter((o) => o?.isCorrect && String(o.text || '').trim() !== '')
    .map((o) => o.text)
    .join(' · ');
}