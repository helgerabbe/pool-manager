/**
 * shared/pruefungBefunde.js
 *
 * Speicher-Logik der Export-Vorprüfung: Befund-Kandidaten eines Prüfschritts
 * mit den bereits vorhandenen Befunden derselben Stelle abgleichen.
 *
 * Wiedererkennung über den Fingerprint (Stelle + Kategorie):
 *   · neu                          → anlegen (offen)
 *   · vorhanden und offen          → aktualisieren, Entscheidung bleibt
 *   · vorhanden und behoben        → zurück auf offen, `erneut_gefunden`
 *   · vorhanden und bewusst        → nur Zeitstempel, bleibt bewusst
 * Nicht mehr gefundene Befunde werden NICHT hier, sondern beim Abschluss des
 * Prüflaufs aufgeräumt (siehe pruefungAbschliessen).
 */

import { buildBefundFingerprint } from './pruefungAccess.js';

/**
 * @param {object} base44
 * @param {object} args
 * @param {string} args.einheitId
 * @param {string} args.prueflaufId
 * @param {object} args.ziel       { ziel_typ, ziel_id, ziel_titel, lernpaket_id, lernpaket_titel, themenfeld_id, themenfeld_titel }
 * @param {Array}  args.kandidaten [{ kategorie, schwere, befund, vorschlag }]
 * @param {Array}  args.vorhandene Bereits gespeicherte Pruefbefund-Records dieser Einheit
 * @param {string} args.quelle     'regel' | 'ki' | 'mbk'
 * @param {string} args.jetzt      ISO-Zeitstempel
 * @returns {Promise<{angelegt: number, aktualisiert: number, erneut: number, fingerprints: string[]}>}
 */
export async function speichereBefunde(base44, {
  einheitId,
  prueflaufId,
  ziel,
  kandidaten = [],
  vorhandene = [],
  quelle = 'regel',
  jetzt = new Date().toISOString(),
}) {
  const vorhandenMap = new Map(vorhandene.map((b) => [b.fingerprint, b]));
  const neueRecords = [];
  const updates = [];
  const fingerprints = [];
  let erneut = 0;

  // Mehrere Kandidaten derselben Kategorie zu einem Befund zusammenfassen —
  // der Fingerprint ist bewusst grob (eine Meldung je Stelle und Kategorie).
  const gebuendelt = new Map();
  for (const k of kandidaten) {
    const key = k.kategorie;
    if (!gebuendelt.has(key)) {
      gebuendelt.set(key, { ...k, befunde: [k.befund], vorschlaege: [k.vorschlag] });
    } else {
      const g = gebuendelt.get(key);
      g.befunde.push(k.befund);
      if (k.vorschlag && !g.vorschlaege.includes(k.vorschlag)) g.vorschlaege.push(k.vorschlag);
      // Strengste Schwere gewinnt.
      const rang = { blockiert: 0, stoert: 1, hinweis: 2 };
      if (rang[k.schwere] < rang[g.schwere]) g.schwere = k.schwere;
    }
  }

  for (const [kategorie, g] of gebuendelt) {
    const fingerprint = buildBefundFingerprint(ziel.ziel_typ, ziel.ziel_id, kategorie);
    fingerprints.push(fingerprint);
    const daten = {
      einheit_id: einheitId,
      prueflauf_id: prueflaufId,
      fingerprint,
      ziel_typ: ziel.ziel_typ,
      ziel_id: ziel.ziel_id,
      ziel_titel: ziel.ziel_titel || '',
      lernpaket_id: ziel.lernpaket_id || '',
      lernpaket_titel: ziel.lernpaket_titel || '',
      themenfeld_id: ziel.themenfeld_id || '',
      themenfeld_titel: ziel.themenfeld_titel || '',
      kategorie,
      schwere: g.schwere,
      befund: g.befunde.join(' '),
      vorschlag: g.vorschlaege.filter(Boolean).join(' '),
      quelle,
      zuletzt_gefunden_am: jetzt,
    };

    const alt = vorhandenMap.get(fingerprint);
    if (!alt) {
      neueRecords.push({ ...daten, entscheidung: 'offen', erneut_gefunden: false });
      continue;
    }
    if (alt.entscheidung === 'bewusst') {
      updates.push({ id: alt.id, zuletzt_gefunden_am: jetzt, prueflauf_id: prueflaufId });
      continue;
    }
    if (alt.entscheidung === 'behoben') {
      erneut += 1;
      updates.push({
        ...daten,
        id: alt.id,
        entscheidung: 'offen',
        erneut_gefunden: true,
        bestaetigt_behoben_am: null,
      });
      continue;
    }
    updates.push({ ...daten, id: alt.id });
  }

  if (neueRecords.length > 0) {
    await base44.asServiceRole.entities.Pruefbefund.bulkCreate(neueRecords);
  }
  if (updates.length > 0) {
    await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(updates);
  }

  return {
    angelegt: neueRecords.length,
    aktualisiert: updates.length,
    erneut,
    fingerprints,
  };
}

/** Lädt alle Befunde einer Einheit (Taskliste bleibt klein genug für einen Zug). */
export async function ladeBefunde(base44, einheitId) {
  return base44.asServiceRole.entities.Pruefbefund.filter({ einheit_id: einheitId });
}