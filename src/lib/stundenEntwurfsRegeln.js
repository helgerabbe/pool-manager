// Entwurfsregeln des Stundenplaners (2026-10-16). Alles sind Warnungen – die Lehrkraft kann immer überstimmen.
import { EINORDNUNG_PROBE } from '@/lib/stundenModelle';

// Kern jedes Stundenmodells: diese Phasen dürfen nicht ersatzlos entfallen.
export const KERNPHASEN = {
  induktiv: ['Beobachten & erkunden', 'Vermutungen prüfen'],
  deduktiv: ['Regel einführen', 'Angeleitetes Anwenden'],
  uebung_kurz: ['Individuell üben'],
  uebung_mittel: ['Individuelle Arbeitsphase'],
  uebung_lang: ['Längere Übungszeit'],
  wiederholung: ['Wiederholen & üben'],
  vertieft: ['Produkt erstellen'],
  diagnose_kurz: ['Lernstand erheben'],
  diagnose_mittel: ['Lernstand erheben'],
  diagnose_lang: ['Nachweise sammeln'],
};

const MIN_PHASE = 4;

/** Deutliche Warnungen zum Entwurf (Kern, unrealistische Zeit, Methode passt nicht). */
export function entwurfsWarnungen({ entwurf, modellKey, gruppe }) {
  const w = [];
  const vorhanden = new Set(entwurf.phasen.flatMap((p) => [p.name, ...(p.deckt || [])]));
  const kernFehlt = (KERNPHASEN[modellKey] || []).filter((k) => !vorhanden.has(k));
  if (kernFehlt.length) w.push(`Kern des Stundenmodells fehlt: ${kernFehlt.join(', ')}. Ohne diese Phase ist es kein echter Stundentyp mehr.`);
  const kurz = entwurf.phasen.filter((p) => (Number(p.minuten) || 0) < MIN_PHASE);
  if (kurz.length) w.push(`Unrealistische Planung: ${kurz.length} Phase(n) dauern unter ${MIN_PHASE} Minuten. Besser Phasen zusammenfassen oder ein kürzeres Modell wählen.`);
  const m = entwurf.methode;
  if (m) {
    const schwach = gruppe.fit <= 2 || gruppe.stark <= 2;
    if (m.stufe >= 4 && schwach) w.push(`„${m.name}“ ist eine komplexe Methode (Stufe ${m.stufe}), deine Lerngruppe arbeitet aber eher langsam oder braucht viel Anleitung.`);
    const passung = EINORDNUNG_PROBE[m.name]?.[modellKey]?.passung;
    if (passung >= 4) w.push(`„${m.name}“ passt laut Einordnung eher nicht zu diesem Stundentyp.`);
  }
  return w;
}

/** Baut eine Fassung um eine gewählte Methode: Methode in ihre Kernphasen bzw. die Kernphase des Modells. */
export function fassungMitMethode(basis, methode, modellKey) {
  const einordnung = EINORDNUNG_PROBE[methode.name]?.[modellKey]?.phasen || {};
  const ziele = Object.keys(einordnung).length ? Object.keys(einordnung) : (KERNPHASEN[modellKey] || []);
  const phasen = basis.phasen.map((p) => (ziele.includes(p.name)
    ? { ...p, aktivitaet: `${methode.name}: ${methode.kurzbeschreibung || 'Methode aus der Galerie'}`, geaendert: true }
    : { ...p }));
  return { ...basis, phasen, name: `Mit ${methode.name}`, vorlage: 'methode', kurz: `Stunde rund um die Methode „${methode.name}“.`, methode, aufwand: Math.min(3, Math.max(1, Math.ceil((methode.stufe || 2) / 2))) };
}