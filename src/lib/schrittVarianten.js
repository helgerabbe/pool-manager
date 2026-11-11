/**
 * Varianten eines Elements (2026-11-11): Ein Element mit variantenfähigem
 * Format (Miniquiz, Lückentext …) kann mehrere gleichwertige Varianten haben.
 * Jeder Schüler bekommt zufällig genau eine davon.
 *
 * Speicherform: Variante 1 liegt wie bisher in `schritt.field_values`, alle
 * weiteren in `schritt.varianten` als [{ id, field_values }]. Elemente ohne
 * Varianten bleiben dadurch unverändert.
 *
 * `_variante` ist nur der Zeiger des Editors auf die gerade bearbeitete
 * Variante und wird beim Übernehmen entfernt.
 */
import { neueSchrittId } from '@/lib/schrittTypen';

/** Alle Varianten eines Elements, Variante 1 zuerst. */
export function variantenListe(schritt) {
  return [
    { id: schritt?.id, field_values: schritt?.field_values || {} },
    ...(Array.isArray(schritt?.varianten) ? schritt.varianten : []),
  ];
}

const hatInhalt = (v) => Object.keys(v?.field_values || {}).length > 0;

/**
 * Die freigegebenen Varianten: nur sie zählen für "vollständig", für die
 * Schüler und für den Export. Eine neu angelegte Variante ist ein Entwurf
 * (`entwurf: true`), bis die Lehrkraft sie freigibt. Variante 1 und
 * Varianten ohne Kennzeichen (Altbestand) gelten als freigegeben.
 */
export function freigegebeneVarianten(schritt) {
  return variantenListe(schritt).filter((v) => !v.entwurf && hatInhalt(v));
}

/** Das Element so, wie es Schüler und Export sehen: ohne Entwürfe und leere Varianten. */
export function nurFreigegebene(schritt) {
  const [erste, ...rest] = freigegebeneVarianten(schritt);
  if (!erste) return { ...schritt, varianten: [] };
  return { ...schritt, field_values: erste.field_values, varianten: rest };
}

export function varianteFreigeben(schritt, index) {
  const varianten = (schritt.varianten || []).map((v, i) => {
    if (i !== index - 1) return v;
    const { entwurf, ...rest } = v;
    return rest;
  });
  return { ...schritt, varianten };
}

export function setzeVarianteWerte(schritt, index, fieldValues) {
  if (index === 0) return { ...schritt, field_values: fieldValues };
  const varianten = [...(schritt.varianten || [])];
  varianten[index - 1] = { ...varianten[index - 1], field_values: fieldValues };
  return { ...schritt, varianten };
}

export function varianteHinzufuegen(schritt) {
  const varianten = [...(schritt.varianten || []), { id: neueSchrittId(), field_values: {}, entwurf: true }];
  return { ...schritt, varianten, _variante: varianten.length };
}

export function varianteEntfernen(schritt, index) {
  // Rückt eine Variante auf Platz 1 nach, dann eine freigegebene – Platz 1 ist nie ein Entwurf.
  const uebrig = variantenListe(schritt).filter((_, i) => i !== index);
  const [erste, ...rest] = [...uebrig.filter((v) => !v.entwurf), ...uebrig.filter((v) => v.entwurf)];
  return { ...schritt, field_values: erste.field_values, varianten: rest, _variante: Math.max(0, index - 1) };
}

/**
 * Ersetzt bei jedem Element mit Varianten den Inhalt durch genau eine
 * Variante: im Editor die gerade bearbeitete, sonst eine zufällig gezogene.
 * Die Ziehung bleibt für die Dauer der Browser-Sitzung stabil.
 */
export function variantenZiehen(schritte = [], aufgabeId = '') {
  return schritte.map((s) => {
    const alle = variantenListe(s);
    if (alle.length < 2) return s;
    if (Number.isInteger(s._variante)) return { ...s, field_values: (alle[s._variante] || alle[0]).field_values };
    const liste = freigegebeneVarianten(s);
    if (liste.length === 0) return s;
    if (liste.length === 1) return { ...s, field_values: liste[0].field_values };
    const key = `variante:${aufgabeId}:${s.id}`;
    const gemerkt = sessionStorage.getItem(key);
    let variante = liste.find((v) => v.id === gemerkt);
    if (!variante) {
      variante = liste[Math.floor(Math.random() * liste.length)];
      sessionStorage.setItem(key, variante.id);
    }
    return { ...s, field_values: variante.field_values };
  });
}