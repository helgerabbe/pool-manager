import DOMPurify from 'dompurify';

/**
 * Bereinigt potenziell gefährlichen HTML-Code und lässt nur sichere Tags zu.
 * Verhindert XSS-Angriffe (Cross-Site Scripting).
 * 
 * Erlaubte Tags: Textformatierungen, Listen, Links für Schulaufgaben
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml) return '';

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'span', 'div', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style', 'rel', 'title'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
  });
}

/**
 * Sichere Variante für striktere Kontexte (z.B. User-Input im Kommentar-Feld)
 * Erlaubt nur minimal notwendige Tags
 */
export function sanitizeHtmlStrict(dirtyHtml) {
  if (!dirtyHtml) return '';

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
  });
}