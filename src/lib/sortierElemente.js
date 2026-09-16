/**
 * Elemente der Aktivität „Reihenfolge / Sortierung".
 *
 * Ein Element war ursprünglich ein reiner Text (String). Damit auch
 * Bildausschnitte sortiert werden können, darf ein Element jetzt zusätzlich
 * ein Bild tragen und liegt dann als { text, bild } vor. Bestandsaufgaben
 * bleiben unverändert gültig — deshalb lesen alle Stellen über diese Helfer,
 * statt eine Form vorauszusetzen.
 */

export const elementText = (el) => (typeof el === 'string' ? el : (el?.text || ''));
export const elementBild = (el) => (typeof el === 'string' ? '' : (el?.bild || ''));

/** Setzt den Text und behält ein vorhandenes Bild. Ohne Bild bleibt es ein String. */
export const mitText = (el, text) => {
  const bild = elementBild(el);
  return bild ? { text, bild } : text;
};

/** Setzt/entfernt das Bild. Ohne Bild fällt das Element auf den reinen Text zurück. */
export const mitBild = (el, bild) => {
  const text = elementText(el);
  return bild ? { text, bild } : text;
};

/** Ein Element gilt als befüllt, wenn es Text ODER ein Bild hat. */
export const elementBefuellt = (el) => !!(elementText(el).trim() || elementBild(el));