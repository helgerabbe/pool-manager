/**
 * shared/assistentProtokoll.js
 *
 * Gemeinsame Bausteine aller streamenden Assistenz-Funktionen
 * (aufgabeGeneratorChat, slideshowGeneratorChat …):
 * Zugangsprüfung, Lesen der Protokoll-Tags, Codefence-Bereinigung und das
 * SSE-Format. Eine Quelle — sonst driften Protokoll und Rechteprüfung
 * zwischen den Generatoren auseinander.
 */

const ALLOWED_ROLES = new Set(['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft']);

/** Darf diese Person einen Generator benutzen? (Admin oder aktive Lehrkraft) */
export async function hatAssistentZugriff(base44, user) {
  if (user?.role === 'admin' || user?.role === 'Administrator') return true;
  const profile = await base44.asServiceRole.entities.Benutzer
    .filter({ user_id: user?.email })
    .catch(() => []);
  const p = profile?.[0];
  return !!p?.ist_aktiv && ALLOWED_ROLES.has(p?.rolle);
}

/** Alle Protokoll-Tags, an denen ein unvollständiger Block endet. */
const PROTOKOLL_TAGS = /<(?:antwort|neu|edit|schritte|folien)>/i;

/**
 * Inhalt eines Tags. Fehlt das schließende Tag (abgeschnittene Antwort oder
 * das Modell hat es vergessen), wird bis zum nächsten Protokoll-Tag bzw. zum
 * Ende gelesen — sonst ginge die ganze Antwort verloren und die Lehrkraft sähe
 * nur ein nichtssagendes „Fertig.".
 */
export function tagInhalt(text, tag) {
  const s = String(text);
  const zu = s.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  if (zu) return zu[1].trim();
  const offen = s.match(new RegExp(`<${tag}>([\\s\\S]*)$`, 'i'));
  if (!offen) return null;
  const rest = offen[1].split(PROTOKOLL_TAGS)[0];
  return rest.trim() || null;
}

/** Entfernt versehentliche Codefences um einen Block herum. */
export function saeubereBlock(code) {
  let s = String(code || '').trim();
  const fence = s.match(/^```(?:html|json)?\s*([\s\S]*?)```$/i);
  if (fence) s = fence[1].trim();
  return s;
}

/** Ein Ereignis im SSE-Format. */
export function sseEvent(name, daten) {
  return `event: ${name}\ndata: ${JSON.stringify(daten)}\n\n`;
}