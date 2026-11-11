/**
 * eNiveauPlan.js (2026-11-10, erweitert 2026-11-11)
 *
 * Je Niveau gibt es EINEN gemeinsamen Arbeitsplan:
 *
 * E-Niveau: Ehrgeizig und Passioniert. Bearbeitet wird nur `ehrgeizig`;
 * `passioniert` ist eine Kopie. Der Projektbereich am Ende ist erst nach
 * Rückgabe der schriftlichen Arbeit offen (Freischaltung 'nach_freigabe').
 *
 * G-Niveau: Minimalist und Pragmatiker. Bearbeitet wird nur `pragmatiker`;
 * `minimalist` ist dieselbe Sektorfolge OHNE das, was nur der Pragmatiker
 * hat: die Kompetenzkarte im Einstieg und den Abschlusstest (Online-Test)
 * am Ende.
 *
 * Die Kopien werden bei jeder Änderung mitgeschrieben (spiegelEPlan), damit
 * Schüleransicht, Export und Fortschritt unverändert lauffähig bleiben.
 */

export const istEPlan = (lt) => lt === 'ehrgeizig' || lt === 'passioniert';
export const istGPlan = (lt) => lt === 'minimalist' || lt === 'pragmatiker';

/** Reiter, unter dem ein Lerntyp bearbeitet wird. */
export const planVon = (lt) => (lt === 'passioniert' ? 'ehrgeizig' : lt === 'minimalist' ? 'pragmatiker' : lt);

/** Lerntyp, der die Kopie des Plans bekommt (oder null). */
export const partnerVon = (lt) => (lt === 'ehrgeizig' ? 'passioniert' : lt === 'pragmatiker' ? 'minimalist' : null);

/** Sektor im G-Plan, den nur der Pragmatiker bekommt (Abschlusstest). */
export const istNurPragmatiker = (sektor) => sektor?.sektor_typ === 'abschlusstest';

/** Minimalist-Plan aus dem Pragmatiker-Plan: ohne Abschlusstest und ohne Kompetenzkarte. */
export function minimalistAus(pragmatiker) {
  const out = [];
  for (const s of Array.isArray(pragmatiker) ? pragmatiker : []) {
    if (istNurPragmatiker(s)) continue;
    const items = Array.isArray(s?.items) ? s.items : [];
    const ohne = items.filter((i) => i?.ref_id !== 'sys_kompetenzkarte');
    if (ohne.length === items.length) out.push(s);
    else if (ohne.length > 0) out.push({ ...s, items: ohne });
  }
  // Hängt ein Sektor an einem, den der Minimalist nicht hat, ist er sofort offen.
  const ids = new Set(out.map((s) => s.sektor_id));
  return out.map((s) => {
    const vor = s.freischalt_bedingung?.voraussetzung_sektor_id;
    if (!vor || ids.has(vor)) return s;
    return { ...s, freischalt_bedingung: { modus: 'sofort', voraussetzung_sektor_id: null } };
  });
}

/** Schreibt die gemeinsamen Pläne in die jeweils zweite Intensitätsstufe. */
export function spiegelEPlan(konfig) {
  if (!konfig) return konfig;
  let next = konfig;
  if (Array.isArray(konfig.ehrgeizig)) next = { ...next, passioniert: konfig.ehrgeizig };
  if (Array.isArray(konfig.pragmatiker)) next = { ...next, minimalist: minimalistAus(konfig.pragmatiker) };
  return next;
}

/** Niveau-Kennung für Reiter und Kompetenzkarte. */
export const NIVEAU = {
  pragmatiker: { kurz: 'G-Niveau', lang: 'grundlegendes Niveau' },
  ehrgeizig: { kurz: 'E-Niveau', lang: 'E-Niveau' },
};

/**
 * Erklärung der gemeinsamen Pläne: EINE Quelle für den Tooltip am Reiter,
 * die Direkthilfe und den Hinweis über dem Plan.
 */
export const PLAN_INFO = {
  pragmatiker: {
    titel: 'Minimalist & Pragmatiker',
    gemeinsam:
      'Gemeinsamer Arbeitsplan auf G-Niveau. Beide Intensitätsstufen bearbeiten dieselben Sektoren mit denselben Lernpaketen und Aufgaben.',
    stufen: [
      { name: 'Minimalist', text: 'Konzentriert sich auf das Wesentliche. Arbeitet den Plan durch, ohne Kompetenzkarte und ohne Abschlusstest.' },
      { name: 'Pragmatiker', text: 'Sieht zum Einstieg die Kompetenzkarte und weiß damit, was er am Ende können muss. Schließt die Einheit mit dem Online-Test ab, der immer am Ende des Plans steht.' },
    ],
  },
  ehrgeizig: {
    titel: 'Ehrgeizig & Passioniert',
    gemeinsam:
      'Gemeinsamer Arbeitsplan auf E-Niveau. Beide Intensitätsstufen arbeiten bis zur schriftlichen Arbeit mit demselben Plan. Danach folgt der Projektbereich, der bis zur Rückgabe der Arbeit gesperrt bleibt.',
    stufen: [
      { name: 'Ehrgeizig', text: 'Will viel erreichen. Bereitet sich strukturiert auf die schriftliche Arbeit vor und deckt alle Lernziele ab.' },
      { name: 'Passioniert', text: 'Arbeitet mit großer Freiheit und Projektfokus. Nutzt den Projektbereich für eigenständige, vertiefende Arbeit.' },
    ],
  },
};

/** Lerntyp, unter dem die Kompetenzkarte gespeichert ist ('pragmatiker' oder 'ehrgeizig'). */
export const kartenLerntyp = (lt) => (istEPlan(lt) ? 'ehrgeizig' : 'pragmatiker');