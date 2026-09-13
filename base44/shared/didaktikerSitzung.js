/**
 * shared/didaktikerSitzung.js
 *
 * Gemeinsame Grundlage aller Didaktiker-Funktionen: Zugang zur Sitzung,
 * Kontext für die Modell-Aufrufe und — das Wichtigste — der EINE Weg, auf dem
 * der Assistent etwas in den Datenbestand schreibt.
 *
 * DER WEG DURCH DAS TOR: Der Didaktiker schreibt nie selbst in Entities. Jede
 * Änderung wird als Auftrag gestellt (pruefeImportAuftrag), geprüft und nur bei
 * `ausfuehrbar` durchgeführt (fuehreImportAuftragAus). Damit gilt für den
 * Assistenten dieselbe Messlatte wie für jeden Auftrag von außen: Eine Aufgabe,
 * die die Prüfung als unvollständig erkennt, kommt nicht in den Bestand — auch
 * dann nicht, wenn eine KI sie erzeugt hat.
 *
 * Die Lehrkraft muss die Aufträge dabei NICHT einzeln im Posteingang freigeben:
 * Sie hat im Assistenten bereits Schritt für Schritt zugestimmt. Die Aufträge
 * bleiben aber im Posteingang stehen und tragen ihr Protokoll — der Nachvollzug
 * bleibt vollständig.
 */

import { hatImportCenterZugang, ZUGANG_FEHLER } from './importAuftragAccess.js';

export { hatImportCenterZugang, ZUGANG_FEHLER };

/**
 * Lädt die Sitzung und prüft, dass sie der aufrufenden Person gehört.
 * @returns {{ ok: boolean, sitzung?: object, antwort?: Response }}
 */
export async function ladeSitzung(base44, user, sitzungId) {
  if (!sitzungId) {
    return { ok: false, antwort: Response.json({ error: 'sitzung_id fehlt' }, { status: 400 }) };
  }
  const sitzung = await base44.asServiceRole.entities.DidaktikerSitzung.get(sitzungId).catch(() => null);
  if (!sitzung) {
    return { ok: false, antwort: Response.json({ error: 'Sitzung nicht gefunden' }, { status: 404 }) };
  }
  if (sitzung.besitzer_email !== user.email && user.role !== 'admin') {
    return {
      ok: false,
      antwort: Response.json({ error: 'Diese Sitzung gehört einer anderen Lehrkraft.' }, { status: 403 }),
    };
  }
  return { ok: true, sitzung };
}

/** Vereinheitlicht die Antwort eines internen Funktionsaufrufs. */
function daten(res) {
  return res?.data ?? res ?? {};
}

/**
 * Stellt einen Auftrag, prüft ihn und führt ihn bei Vollständigkeit aus.
 *
 * @returns {{ ok: boolean, protokoll: Array, pruefergebnis: Array, auftrag_id: string }}
 */
export async function fuehreAuftragAus(base44, auftrag) {
  const gestellt = daten(await base44.functions.invoke('pruefeImportAuftrag', auftrag));
  const auftragId = gestellt?.auftrag?.id || '';

  if (!gestellt?.ausfuehrbar) {
    return {
      ok: false,
      auftrag_id: auftragId,
      protokoll: [],
      pruefergebnis: Array.isArray(gestellt?.pruefergebnis) ? gestellt.pruefergebnis : [],
    };
  }

  const ausgefuehrt = daten(
    await base44.functions.invoke('fuehreImportAuftragAus', {
      auftrag_id: auftragId,
      begruendung: 'Vom Didaktiker im geführten Aufbau bestätigt.',
    })
  );

  return {
    ok: true,
    auftrag_id: auftragId,
    protokoll: Array.isArray(ausgefuehrt?.protokoll) ? ausgefuehrt.protokoll : [],
    pruefergebnis: [],
  };
}

/** Die von einem ausgeführten Auftrag angelegte Datensatz-ID. */
export function neueId(ergebnis) {
  return ergebnis?.protokoll?.[0]?.record_id || '';
}

/**
 * Der fachliche Rahmen für jeden Modell-Aufruf des Didaktikers. Bewusst als
 * Objekt: Es wandert als JSON in den Prompt, damit das Modell die Angaben
 * nicht aus Prosa herauslesen muss.
 */
export function baueKontext(sitzung, extra = {}) {
  const fundament = sitzung.fundament || {};
  return {
    fach: sitzung.fach || '',
    jahrgangsstufe: sitzung.jahrgangsstufe || '',
    thema: sitzung.thema || '',
    vorgaben_der_lehrkraft: sitzung.vorgaben || '',
    didaktische_leitidee: fundament.leitidee || '',
    reihenfolge_der_zugaenge: fundament.zugaenge || [],
    stolpersteine: fundament.stolpersteine || [],
    kernbegriffe: fundament.kernbegriffe || [],
    ...extra,
  };
}

/** Die Dateien des Lehrwerks als file_urls für die Modell-Aufrufe. */
export function buchDateien(sitzung) {
  return (Array.isArray(sitzung.buch_dateien) ? sitzung.buch_dateien : [])
    .map((d) => String(d?.url || ''))
    .filter((u) => u.startsWith('http'))
    .slice(0, 10);
}