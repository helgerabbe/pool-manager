/**
 * Zentrale, wiederverwendbare Comic-Idiome (Illustrationen) für Aktivitätstypen
 * in der Schüleransicht. Jeder Aktivitätstyp bekommt ein einprägsames Bild,
 * damit leseschwache Schüler die Aufgabe schon an der Illustration wiedererkennen.
 *
 * Die Bilder sind als feste URLs hinterlegt (KI-generiert, einmalig). Über den
 * Aktivitäts-Namen aus dem Katalog wird das passende Idiom ausgewählt.
 */

const COMIC_BILDER = {
  text_lesen:
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/comic_text_lesen.png',
  link_url:
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/comic_link_url.png',
  reihenfolge:
    'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/82ed8841d_generated_image.png',
};

/**
 * Liefert die Comic-Bild-URL für einen Aktivitäts-Namen, oder null wenn keine
 * passende Illustration existiert.
 * @param {string} [name] Name der Aktivität aus dem AktivitaetenKatalog
 * @returns {string|null}
 */
export function getAktivitaetComicBild(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('text lesen')) return COMIC_BILDER.text_lesen;
  if (n.includes('link') || n.includes('url')) return COMIC_BILDER.link_url;
  if (n.includes('reihenfolge') || n.includes('sortier')) return COMIC_BILDER.reihenfolge;
  return null;
}