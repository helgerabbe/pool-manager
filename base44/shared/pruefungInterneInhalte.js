/**
 * shared/pruefungInterneInhalte.js
 *
 * Export-Vorprüfung, Sonderfall „interne KI-Inhalte" (2026-09-03).
 *
 * Manche Seiten des Lernpfads werden nicht von der Lehrkraft getippt, sondern
 * VOR dem Export im Export-Center einmalig per KI erzeugt und als
 * SchuelerInhaltSnapshot abgelegt (z. B. die Einführung in ein Themenfeld).
 * Fehlt dieser Inhalt, ist die Stelle im Kurs leer — derselbe Fehler wie eine
 * leere Aufgabe (MBK-Kategorie 1).
 *
 * Diese Befunde werden bewusst MIT aufgenommen, obwohl sie nicht in einem
 * Aufgaben-Reiter behoben werden: Ihr Arbeitsort ist die Karte „Interne Inhalte
 * erzeugen", die seit 2026-09-03 oben in der Vollständigkeitsprüfung (Reiter 8)
 * sitzt — nicht mehr im Export-Center.
 *
 * Die Liste MUSS mit KI_BAUSTEINE in
 * base44/functions/generateInterneInhalte/entry.ts übereinstimmen (Spiegel von
 * src/lib/interneInhalteBausteine.js) — sonst würde die Prüfung Inhalte
 * verlangen, für die es keinen Generator gibt.
 */

const VORAB_ERZEUGBARE_BAUSTEINE = ['sys_themenfeld_intro'];
const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

/**
 * Die vier festen Onboarding-Elemente der Einheit (Orientierungsphase).
 * Sie liegen NICHT als Snapshot, sondern in Einheiten.onboarding_konfiguration
 * und werden im Reiter „Arbeitspläne" über die jeweilige Vorschau erzeugt und
 * gespeichert. Fehlt eines, bleibt die Stelle im Kurs leer — es sei denn, die
 * Lehrkraft überlässt sie bewusst der MBK.
 */
const ONBOARDING_ELEMENTE = [
  { key: 'einfuehrung', titel: 'Kurze Einführung in die Einheit' },
  { key: 'fragenblock', titel: 'Freiwilliger Fragenblock (Selbsteinschätzung)' },
  { key: 'einstiegsdiagnose', titel: 'Einstiegsdiagnose (Wissensquiz)' },
  { key: 'lerntyp_diagnose', titel: 'KI-Intensitätsstufen-Diagnose' },
];

function leeresObjekt(inhalt) {
  return !inhalt || typeof inhalt !== 'object' || Object.keys(inhalt).length === 0;
}

/**
 * Sucht alle Lernpfad-Stellen einer Einheit, an denen ein vorab erzeugbarer
 * KI-Inhalt fehlt.
 *
 * @returns {Array<{ziel_id, ziel_titel, lerntyp, baustein_id, themenfeld_id, themenfeld_titel, kandidat}>}
 */
export function findeFehlendeInterneInhalte({ einheit, snapshots = [], systemBausteine = [], themenfelder = [] }) {
  const bausteinById = new Map((systemBausteine || []).map((b) => [b.baustein_id, b]));
  const themenfeldById = new Map((themenfelder || []).map((tf) => [tf.id, tf]));
  const vorhanden = new Set(
    (snapshots || [])
      .filter((s) => !leeresObjekt(s.inhalt))
      .map((s) => `${s.lerntyp || ''}::${s.instance_id || ''}`)
  );

  const treffer = [];
  for (const lerntyp of LERNTYPEN) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lerntyp] || [];
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        if (item?.type !== 'system' || !item?.ref_id || !item?.instance_id) continue;
        if (!VORAB_ERZEUGBARE_BAUSTEINE.includes(item.ref_id)) continue;
        if (vorhanden.has(`${lerntyp}::${item.instance_id}`)) continue;

        const bausteinTitel = bausteinById.get(item.ref_id)?.titel || item.ref_id;
        const themenfeldTitel = sektor?.themenfeld_id
          ? (themenfeldById.get(sektor.themenfeld_id)?.titel || '')
          : '';
        treffer.push({
          ziel_id: `${lerntyp}::${item.instance_id}`,
          ziel_titel: themenfeldTitel
            ? `${bausteinTitel} – ${themenfeldTitel} (${lerntyp})`
            : `${bausteinTitel} (${lerntyp})`,
          themenfeld_id: sektor?.themenfeld_id || '',
          themenfeld_titel: themenfeldTitel,
          kandidat: {
            kategorie: 1,
            schwere: 'blockiert',
            befund: 'Der KI-Inhalt dieser Seite ist noch nicht erzeugt – im Kurs bliebe die Seite leer.',
            vorschlag: 'Hier „Jetzt erzeugen" anklicken – oder bewusst so lassen, dann baut die MBK die Seite.',
          },
        });
      }
    }
  }
  return treffer;
}

/**
 * Prüft die vier festen Onboarding-Elemente der Einheit.
 * @returns {Array<{ziel_id, ziel_titel, themenfeld_id, themenfeld_titel, kandidat}>}
 */
export function findeFehlendeOnboardingInhalte({ einheit }) {
  const konfig = einheit?.onboarding_konfiguration || {};
  const treffer = [];
  for (const el of ONBOARDING_ELEMENTE) {
    if (!leeresObjekt(konfig[el.key])) continue;
    treffer.push({
      ziel_id: `onboarding::${el.key}`,
      ziel_titel: `Orientierung: ${el.titel}`,
      themenfeld_id: '',
      themenfeld_titel: '',
      kandidat: {
        kategorie: 1,
        schwere: 'stoert',
        befund: 'Dieses Orientierungs-Element ist noch nicht erzeugt und gespeichert – im Kurs bliebe die Stelle leer.',
        vorschlag: 'Im Reiter „Arbeitspläne" unter „Orientierung & Onboarding" über die Vorschau erzeugen und speichern – oder bewusst der MBK überlassen.',
      },
    });
  }
  return treffer;
}