/**
 * eNiveauPlan.js (2026-11-10)
 *
 * Ehrgeizig und Passioniert arbeiten mit EINEM gemeinsamen Arbeitsplan auf
 * E-Niveau. Bearbeitet wird nur `ehrgeizig`; `passioniert` ist eine Kopie,
 * die bei jeder Änderung mitgeschrieben wird (Schüleransicht, Export und
 * Fortschritt bleiben dadurch unverändert lauffähig).
 * Der Projektbereich am Ende ist erst nach Rückgabe der schriftlichen Arbeit
 * offen (Freischaltung 'nach_freigabe', siehe sektorFreischaltung.js).
 */

export const istEPlan = (lt) => lt === 'ehrgeizig' || lt === 'passioniert';

/** Reiter, unter dem ein Lerntyp bearbeitet wird. */
export const planVon = (lt) => (lt === 'passioniert' ? 'ehrgeizig' : lt);

/** Schreibt den E-Plan in beide Lerntypen. */
export function spiegelEPlan(konfig) {
  if (!konfig || !Array.isArray(konfig.ehrgeizig)) return konfig;
  return { ...konfig, passioniert: konfig.ehrgeizig };
}

/** Niveau-Kennung für Reiter und Kompetenzkarte. */
export const NIVEAU = {
  pragmatiker: { kurz: 'G-Niveau', lang: 'grundlegendes Niveau' },
  ehrgeizig: { kurz: 'E-Niveau', lang: 'E-Niveau' },
};

/** Lerntyp, unter dem die Kompetenzkarte gespeichert ist ('pragmatiker' oder 'ehrgeizig'). */
export const kartenLerntyp = (lt) => (istEPlan(lt) ? 'ehrgeizig' : 'pragmatiker');