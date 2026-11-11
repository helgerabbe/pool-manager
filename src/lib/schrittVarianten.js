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

export function setzeVarianteWerte(schritt, index, fieldValues) {
  if (index === 0) return { ...schritt, field_values: fieldValues };
  const varianten = [...(schritt.varianten || [])];
  varianten[index - 1] = { ...varianten[index - 1], field_values: fieldValues };
  return { ...schritt, varianten };
}

export function varianteHinzufuegen(schritt) {
  const varianten = [...(schritt.varianten || []), { id: neueSchrittId(), field_values: {} }];
  return { ...schritt, varianten, _variante: varianten.length };
}

export function varianteEntfernen(schritt, index) {
  const [erste, ...rest] = variantenListe(schritt).filter((_, i) => i !== index);
  return { ...schritt, field_values: erste.field_values, varianten: rest, _variante: Math.max(0, index - 1) };
}

/**
 * Ersetzt bei jedem Element mit Varianten den Inhalt durch genau eine
 * Variante: im Editor die gerade bearbeitete, sonst eine zufällig gezogene.
 * Die Ziehung bleibt für die Dauer der Browser-Sitzung stabil.
 */
export function variantenZiehen(schritte = [], aufgabeId = '') {
  return schritte.map((s) => {
    const liste = variantenListe(s);
    if (liste.length < 2) return s;
    if (Number.isInteger(s._variante)) return { ...s, field_values: (liste[s._variante] || liste[0]).field_values };
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