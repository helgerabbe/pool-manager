/**
 * videoEinbettung.js
 *
 * Entscheidet, WIE eine Video-URL angezeigt werden kann.
 *
 * Warum nötig (2026-09-14): Studyflix-Links wurden bisher in ein <video>-Tag
 * gesteckt — dabei ist eine Studyflix-Seite kein Videodatei-Link, also blieb im
 * Kurs ein schwarzer, nicht startbarer Player stehen. Einbetten ist bei
 * Studyflix ebenfalls nicht möglich (die Seite erlaubt per
 * X-Frame-Options: SAMEORIGIN kein Fremd-Einbetten). Solche Videos werden
 * deshalb bewusst als Link angeboten, statt einen kaputten Player zu zeigen.
 *
 * Rückgabe: { art: 'iframe' | 'datei' | 'link', src, anbieter }
 */

const DATEI_ENDUNGEN = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

/**
 * Studyflix stellt Schulen mit Vertrag einen Einbett-Code zur Verfügung:
 *   <iframe src="https://studyflix.de/embed?id=3760&embed_key=…" …></iframe>
 * Solche Codes dürfen Lehrkräfte direkt einfügen — hier wird die Adresse
 * daraus gezogen. Eine normale Studyflix-Seite (ohne embed_key) lässt sich
 * dagegen nicht einbetten und wird als Link angeboten.
 */
function srcAusEinbettCode(text) {
  const m = text.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

export function videoEinbettung(url = '') {
  const u = (srcAusEinbettCode(String(url)) || String(url)).trim();
  if (!u) return null;

  if (/studyflix\.de\/embed\?/i.test(u)) return { art: 'iframe', src: u, anbieter: 'Studyflix' };

  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { art: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}`, anbieter: 'YouTube' };

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { art: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}`, anbieter: 'Vimeo' };

  if (DATEI_ENDUNGEN.test(u)) return { art: 'datei', src: u, anbieter: '' };

  if (/studyflix\.de/i.test(u)) return { art: 'link', src: u, anbieter: 'Studyflix' };

  return { art: 'link', src: u, anbieter: '' };
}