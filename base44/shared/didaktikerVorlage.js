/**
 * shared/didaktikerVorlage.js
 *
 * DIE STANDARD-BELEGUNG eines Lernpakets, wie der Didaktiker sie vorschlägt.
 *
 * Warum eine feste Vorlage und nicht jedes Mal freie KI-Wahl: Ein Basispaket
 * soll wiedererkennbar sein. Schüler finden in jedem Lernpaket dieselbe
 * Dramaturgie — erst ein Foliensatz, der die Sache erklärt, dann ein Video,
 * dann das Kompaktwissen zum Nachschlagen, dann Übungen, am Ende ein Test.
 * Freie Wahl würde jedes Paket anders aussehen lassen, und die Lehrkraft
 * müsste bei jedem Paket neu entscheiden, was hineingehört.
 *
 * Jede Zeile ist EINZELN abwählbar (`standard_an`): Zu manchen Themen gibt es
 * kein brauchbares Video, manchmal braucht es keine Folien. Deshalb ist die
 * Vorlage ein Vorschlag, keine Pflicht.
 *
 * Die Aufgabenarten werden über ihren NAMEN im Aktivitätenkatalog gefunden,
 * nicht über hart notierte IDs — der Katalog ist ein pflegbarer Bestand.
 *
 * Reine Daten + reine Funktionen, keine I/O.
 */

/** Die feste Reihenfolge der Bausteine eines Lernpakets. */
export const VORLAGE = [
  {
    schluessel: 'slideshow',
    katalog_name: 'Slideshow',
    phase: 'Input',
    label: 'Erklär-Foliensatz',
    zweck: 'Erklärt das Thema Folie für Folie, ausformuliert und ohne Lehrkraft daneben verständlich.',
    standard_an: true,
  },
  {
    schluessel: 'video',
    katalog_name: 'Video / Audio',
    phase: 'Input',
    label: 'Lernvideo',
    zweck: 'Ein recherchiertes Video (bevorzugt Studyflix) als zweiter Zugang zum selben Inhalt.',
    standard_an: true,
  },
  {
    schluessel: 'kompaktwissen',
    katalog_name: 'Kompaktwissen',
    phase: 'Input',
    label: 'Kompaktwissen',
    zweck: 'Das Wichtigste auf einer Seite — zum Nachschlagen während der Übungen.',
    standard_an: true,
  },
  {
    schluessel: 'uebung_1',
    uebung: true,
    phase: 'Übung',
    label: 'Übung 1 — Operation ausführen',
    zweck: 'Die Schülerin führt die zentrale gedankliche Operation des Lernziels selbst aus.',
    absicht: 'Die zentrale Denkoperation des Lernziels handelnd am Bildschirm ausführen.',
    standard_an: true,
  },
  {
    schluessel: 'uebung_2',
    uebung: true,
    phase: 'Übung',
    label: 'Übung 2 — Übertragen und sichern',
    zweck: 'Dieselbe Operation in einem anderen Zusammenhang, mit Blick auf den Stolperstein.',
    absicht: 'Die Operation auf einen anderen Fall übertragen und den typischen Stolperstein aufdecken.',
    standard_an: true,
  },
  {
    schluessel: 'test',
    katalog_name: 'Test',
    phase: 'Abschluss',
    label: 'Abschluss-Test',
    zweck: 'Prüft am Ende, ob die Lernziele des Pakets erreicht sind.',
    standard_an: true,
  },
];

/**
 * Der REGELFALL für Übungen: die eigens gebaute offene Aufgabe.
 * Begründung siehe shared/didaktikerOffeneAufgabe.js.
 */
export const OFFENE_AUFGABE_NAME = 'Offene Aufgabe';

/**
 * AUSNAHME-Formate (Entscheidung 2026-09-13): Standardformate sind nur zulässig,
 * wenn das Format die gedankliche Operation SELBST ist — Sortieren, wenn die
 * Reihenfolge die Denkleistung ist; Zuordnen, wenn das Herstellen der Beziehung
 * die Denkleistung ist. Lückentext und Miniquiz stehen bewusst NICHT hier: Sie
 * fragen den Inhalt auf einer Meta-Ebene ab, statt ihn bearbeiten zu lassen.
 */
export const UEBUNGS_ARTEN = [
  'Begriffe zuordnen',
  'Reihenfolge / Sortierung',
  'Zuordnungstraining',
  'Bildbeschriftung',
];

/**
 * Sucht einen Katalog-Eintrag nach Name + Phase.
 * @param {Array} katalog Liste der AktivitaetenKatalog-Einträge
 */
export function findeKatalog(katalog, name, phase) {
  const liste = (katalog || []).filter((k) => k && k.is_active !== false);
  const treffer = liste.filter((k) => String(k.name || '').toLowerCase() === String(name).toLowerCase());
  return treffer.find((k) => k.phase === phase) || treffer[0] || null;
}

/**
 * Baut die Vorlage in konkrete Zeilen mit aufgelösten Katalog-IDs um.
 * Bausteine, deren Aufgabenart es im Katalog nicht (mehr) gibt, fallen weg —
 * ein Vorschlag auf eine nicht existierende Aufgabenart wäre nicht baubar.
 */
export function baueVorlagenZeilen(katalog) {
  return VORLAGE.map((v) => {
    if (v.uebung) return { ...v, katalog_id: '', aufgabenart: '' };
    const k = findeKatalog(katalog, v.katalog_name, v.phase);
    if (!k) return null;
    return { ...v, katalog_id: k.id, aufgabenart: k.name };
  }).filter(Boolean);
}

/** Die als AUSNAHME erlaubten Standardformate (Phase „Übung"). */
export function verfuegbareUebungsArten(katalog) {
  return UEBUNGS_ARTEN.map((name) => findeKatalog(katalog, name, 'Übung'))
    .filter(Boolean)
    .map((k) => ({ katalog_id: k.id, name: k.name, beschreibung: k.beschreibung || '' }));
}

/** Der Katalog-Eintrag der offenen Aufgabe in der Übungsphase (Regelfall). */
export function findeOffeneAufgabe(katalog) {
  return findeKatalog(katalog, OFFENE_AUFGABE_NAME, 'Übung');
}