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

/**
 * Entfernt ein angebrochenes schließendes Tag am Ende eines live gestreamten
 * Antwort-Textes („…gebaut.</antw"). Ohne das stand der Tag-Rest sichtbar im
 * Gespräch, sobald die Verbindung genau dort abriss.
 */
export function ohneAngebrochenesTag(text) {
  const s = String(text);
  const m = s.match(/<\/?[a-z]*$/i);
  return m ? s.slice(0, m.index) : s;
}

/**
 * Herzschlag während der stillen Bauphase.
 *
 * Nach dem <antwort>-Text schreibt das Modell minutenlang Code, von dem NICHTS
 * an den Browser geht — für jeden Zwischenproxy sieht die Verbindung dann tot
 * aus und wird gekappt („Die Verbindung ist mitten in der Antwort
 * abgerissen"). Deshalb geht alle zwei Sekunden ein kleines
 * `fortschritt`-Ereignis raus (Zeichen bisher, Sekunden bisher). Das hält die
 * Leitung offen und zeigt der Lehrkraft, dass gebaut wird.
 *
 * @returns {() => void} stoppt den Herzschlag
 */
export function starteHerzschlag(controller, enc, status, intervallMs = 2000) {
  const start = Date.now();
  const timer = setInterval(() => {
    try {
      controller.enqueue(enc.encode(sseEvent('fortschritt', {
        zeichen: status(),
        sekunden: Math.round((Date.now() - start) / 1000),
      })));
    } catch (_e) { /* Strom bereits geschlossen */ }
  }, intervallMs);
  return () => clearInterval(timer);
}

/**
 * Zeitbudget eines Generator-Aufrufs. Backend-Funktionen werden nach fünf
 * Minuten hart beendet — dann käme gar kein Ergebnis mehr, nicht einmal eine
 * Fehlermeldung. Wir hören deshalb rechtzeitig vorher auf und melden es
 * sauber. Der Rest ist Reserve für Anlauf, Auswertung und Übertragung.
 */
export const ZEITBUDGET_MS = 4 * 60 * 1000 + 20 * 1000;

export const ZEITBUDGET_WARNUNG = 'Der Bau hat zu lange gedauert und wurde abgebrochen, bevor er fertig war. Bitten Sie um eine kompaktere Fassung (weniger Elemente, weniger Erklärtext) oder teilen Sie die Aufgabe in zwei Schritte.';