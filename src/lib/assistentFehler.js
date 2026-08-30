/**
 * lib/assistentFehler.js
 *
 * Übersetzt technische Fehler des Assistenten in Sätze, mit denen eine
 * Lehrkraft etwas anfangen kann.
 *
 * „Der Generator antwortet nicht (HTTP 404)" sagt niemandem, was zu tun ist.
 * Schlimmer: Es klingt nach einem Fehler, den man selbst gemacht hat. Jede
 * Meldung hier nennt deshalb die Ursache in Alltagssprache und, wo möglich,
 * den nächsten Schritt.
 */

/**
 * @param {number} status   HTTP-Status der Antwort
 * @param {string} detail   Klartext vom Server, falls vorhanden
 * @returns {string}
 */
export function fehlerText(status, detail = '') {
  // Der Server schickt bei fachlichen Fehlern selbst eine verständliche
  // Meldung mit (z. B. „Anthropic-Zugang ist nicht aktiv"). Die ist immer
  // besser als alles, was wir hier raten könnten.
  if (detail && detail.trim()) return detail.trim();

  switch (true) {
    case status === 404:
      return 'Der Assistent ist gerade nicht erreichbar. Das passiert meist, während die App im Hintergrund aktualisiert wird — versuchen Sie es in ein bis zwei Minuten noch einmal. Ihr Text bleibt erhalten.';
    case status === 401 || status === 403:
      return 'Ihre Anmeldung ist abgelaufen. Laden Sie die Seite neu und melden Sie sich erneut an — danach können Sie weiterarbeiten.';
    case status === 429:
      return 'Gerade sind zu viele Anfragen unterwegs. Warten Sie einen Moment und schicken Sie es dann noch einmal ab.';
    case status === 408 || status === 504:
      return 'Die Antwort hat zu lange gedauert. Versuchen Sie es noch einmal — bei sehr langen Aufgaben hilft es, den Wunsch in zwei Schritte zu teilen.';
    case status >= 500:
      return 'Beim Assistenten ist etwas schiefgegangen. Versuchen Sie es noch einmal. Bleibt es dabei, liegt es nicht an Ihnen — dann wenden Sie sich an die Administration.';
    case status > 0:
      return `Der Assistent konnte die Anfrage nicht annehmen (Code ${status}). Versuchen Sie es noch einmal.`;
    default:
      return 'Die Verbindung zum Assistenten ist abgebrochen. Versuchen Sie es noch einmal — Ihr Text bleibt erhalten.';
  }
}

/** Netzwerk-/Abbruchfehler ohne HTTP-Status. */
export function verbindungsFehlerText(err) {
  if (err?.name === 'AbortError') return '';
  return fehlerText(0, '');
}
