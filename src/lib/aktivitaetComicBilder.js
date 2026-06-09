/**
 * Zentrale Sammlung der schülergerechten Comic-„Idiome" pro Aktivitätsart.
 *
 * Diese kleinen, immer wiederkehrenden KI-Comicbilder helfen schwächeren
 * Schülern, eine Aktivität auf einen Blick wiederzuerkennen (z. B. „lesen",
 * „Webseite öffnen"). Die Zuordnung erfolgt über ein Schlüsselwort im
 * Katalog-Namen der Aktivität. Neue Idiome hier einfach ergänzen.
 */
const COMIC_BILDER = {
  text_lesen: 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/5dbee1f65_generated_image.png',
  link_url: 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/51d0dddb5_generated_image.png',
};

/**
 * Liefert die Comic-Bild-URL für einen Aktivitäts-Katalognamen (oder null).
 */
export function getAktivitaetComicBild(katalogName) {
  const n = (katalogName || '').toLowerCase();
  if (n.includes('text lesen')) return COMIC_BILDER.text_lesen;
  if (n.includes('link') || n.includes('url')) return COMIC_BILDER.link_url;
  return null;
}

export default COMIC_BILDER;