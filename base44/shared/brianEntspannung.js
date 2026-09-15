/**
 * brianEntspannung.js
 *
 * Gemeinsames Regelwerk fuer das ENTSPANNEN der Brian-KI-Dialoge
 * (Entscheidung 2026-09-15).
 *
 * WARUM: Die Abschlussregeln (completion_rule) forderten bisher fast alle
 * "erst wenn vollstaendig bearbeitet". Dadurch hielt Brian Schueler im
 * Gespraech fest, obwohl sie die Aufgabe in den Grundzuegen geloest hatten.
 * Neu: Das Gespraech darf schon bei ungefaehrer Richtigkeit enden, mit dem
 * Angebot, vertiefend weiterzusprechen.
 *
 * WAS BEWUSST NICHT ANGETASTET WIRD:
 * - Die aufgabenspezifischen Anteile der Regel ("drei Deutungsansaetze",
 *   "Aufgaben 5, 6 und 7") bleiben woertlich stehen — sie sind die fachliche
 *   Messlatte der Lehrkraft, nicht die Strenge.
 * - Der SCHLUESSELCODE-Anhang bleibt unveraendert. An einer verfremdeten Zahl
 *   scheitert der ganze Abschluss-Nachweis in der Lernplattform.
 *
 * IDEMPOTENZ: Erkennungsmerkmal ist ENTSPANNT_MARKER. Ein zweiter Lauf
 * veraendert eine bereits entspannte Regel nicht noch einmal.
 *
 * Diese Datei wird von der Migrationsfunktion UND vom Brian-Generator
 * genutzt — deshalb liegt sie in base44/shared/.
 */

/** Zielwert des Betreuungsstils fuer alle Brian-Dialoge. */
export const PERSONA_ZIEL = 'unterstuetzend';

/** Wortmarke, an der ein bereits entspannter Text erkannt wird. */
export const ENTSPANNT_MARKER = 'in den Grundzügen';

/** Satz, der die entspannte Abschluss-Haltung ausdrueckt. */
export const ENTSPANNT_ZUSATZ =
  'Es genügt, wenn das in den Grundzügen richtig gelungen ist — nicht jeder Aspekt muss vollkommen sein. ' +
  'Biete dem Schüler danach locker an, gemeinsam noch tiefer in die Details zu gehen, falls er möchte.';

/** Beginn des Schluesselcode-Anhangs (siehe generateBrianSegments). */
export const SCHLUESSEL_TRENNER = 'Der Dialog endet erst, wenn einer der beiden Schlüsselcodes';

/** Entspannte Standard-Abschlussregel des Generators (ohne Formate). */
export const COMPLETION_STANDARD =
  'Beende das Gespräch, sobald erkennbar ist, dass der Schüler die Aufgabenstellung in den Grundzügen ' +
  'richtig bearbeitet und die wesentlichen Lernziele erreicht hat. ' +
  ENTSPANNT_ZUSATZ;

/** Entspannte Abschlussregel des Generators mit geforderten Abgabeformaten. */
export function completionMitFormaten(formate) {
  return (
    `Beende das Gespräch, sobald erkennbar ist, dass der Schüler die wesentlichen inhaltlichen Aspekte ` +
    `für die geforderten Formate (${formate}) in den Grundzügen erarbeitet hat. ` +
    ENTSPANNT_ZUSATZ
  );
}

/**
 * Strenge Gespraechs-Eroeffner → entspannte Fassung.
 * Nur der EINLEITENDE Strenge-Teil wird ersetzt; der Rest des Satzes
 * (die aufgabenspezifische Bedingung) bleibt woertlich stehen.
 */
const OEFFNER = [
  [/^\s*Beende das Gespräch erst,\s*wenn\b/i, 'Beende das Gespräch, sobald erkennbar ist, dass'],
  [/^\s*Das Gespräch ist erst beendet,\s*wenn\b/i, 'Das Gespräch ist beendet, sobald erkennbar ist, dass'],
  [/^\s*Das Gespräch ist erst dann beendet,\s*wenn\b/i, 'Das Gespräch ist beendet, sobald erkennbar ist, dass'],
  [/^\s*Das Gespräch ist beendet,\s*sobald\b/i, 'Das Gespräch ist beendet, sobald erkennbar ist, dass'],
  [/^\s*Das Gespräch ist beendet,\s*wenn\b/i, 'Das Gespräch ist beendet, sobald erkennbar ist, dass'],
  [/^\s*Das Gespräch gilt als abgeschlossen,\s*wenn\b/i, 'Das Gespräch gilt als abgeschlossen, sobald erkennbar ist, dass'],
  [/^\s*Der Dialog ist erst beendet,\s*wenn\b/i, 'Der Dialog ist beendet, sobald erkennbar ist, dass'],
  [/^\s*Der Dialog ist beendet,\s*wenn\b/i, 'Der Dialog ist beendet, sobald erkennbar ist, dass'],
  [/^\s*Der Dialog endet erst,\s*wenn\b/i, 'Der Dialog endet, sobald erkennbar ist, dass'],
  [/^\s*Der Dialog endet,\s*wenn\b/i, 'Der Dialog endet, sobald erkennbar ist, dass'],
];

/** Generische Vollstaendigkeits-Forderungen entspannen (nur diese Wendungen). */
const WENDUNGEN = [
  [/vollständig beantwortet hat/gi, 'in den Grundzügen beantwortet hat'],
  [/vollständig bearbeitet hat/gi, 'in den Grundzügen bearbeitet hat'],
  [/vollständig erarbeitet hat/gi, 'in den Grundzügen erarbeitet hat'],
];

/**
 * Entspannt EINE Abschlussregel.
 * @returns {{ text: string, geaendert: boolean, oeffnerErsetzt: boolean,
 *             wendungenErsetzt: number, schluesselErhalten: boolean }}
 */
export function entspanneCompletionRule(original) {
  const roh = typeof original === 'string' ? original : '';
  if (!roh.trim()) {
    return { text: roh, geaendert: false, oeffnerErsetzt: false, wendungenErsetzt: 0, schluesselErhalten: false };
  }

  // Schluesselcode-Anhang abtrennen — er bleibt woertlich erhalten.
  const trennIndex = roh.indexOf(SCHLUESSEL_TRENNER);
  const hatSchluessel = trennIndex >= 0;
  const kern = hatSchluessel ? roh.slice(0, trennIndex) : roh;
  const anhang = hatSchluessel ? roh.slice(trennIndex) : '';

  // Bereits entspannt? Dann nichts anfassen (Idempotenz).
  if (kern.includes(ENTSPANNT_MARKER)) {
    return { text: roh, geaendert: false, oeffnerErsetzt: false, wendungenErsetzt: 0, schluesselErhalten: hatSchluessel };
  }

  let neu = kern.trimEnd();
  let oeffnerErsetzt = false;
  for (const [muster, ersatz] of OEFFNER) {
    if (muster.test(neu)) {
      neu = neu.replace(muster, ersatz);
      oeffnerErsetzt = true;
      break;
    }
  }

  let wendungenErsetzt = 0;
  for (const [muster, ersatz] of WENDUNGEN) {
    const treffer = neu.match(muster);
    if (treffer) {
      wendungenErsetzt += treffer.length;
      neu = neu.replace(muster, ersatz);
    }
  }

  // Entspannte Haltung ergaenzen, damit sie auch dort steht, wo kein
  // bekannter Oeffner gegriffen hat.
  neu = `${neu.trimEnd()}\n\n${ENTSPANNT_ZUSATZ}`;

  const text = hatSchluessel ? `${neu}\n\n${anhang.trim()}` : neu;
  return {
    text,
    geaendert: text !== roh,
    oeffnerErsetzt,
    wendungenErsetzt,
    schluesselErhalten: hatSchluessel && text.includes(anhang.trim()),
  };
}

/**
 * Globale MBK-Prompts: entspannter Zusatz, idempotent per Marke.
 */
export const GLOBAL_PROMPT_MARKE = '<!-- brian-locker-2026-09-15 -->';

export const GLOBAL_PROMPT_ZUSAETZE = {
  guardrail_feedback:
    `${GLOBAL_PROMPT_MARKE}\n\n**Abschluss von Gesprächen (locker):**\n` +
    `- Beende ein Gespräch schon, sobald die Aufgabe in den Grundzügen richtig bearbeitet ist — verlange keine vollkommene Vollständigkeit.\n` +
    `- Biete danach an, gemeinsam noch tiefer in die Details zu gehen, falls der Schüler möchte.\n` +
    `- Halte niemanden im Gespräch fest, weil ein Randaspekt noch fehlt.`,
  global_persona:
    `${GLOBAL_PROMPT_MARKE}\n\n**Tonalität (locker):** Antworte locker und entspannt statt streng oder prüfend. ` +
    `Kurze, freundliche Sätze; Fehler sind selbstverständlich. Erkennbare Grundrichtigkeit genügt — ` +
    `Vertiefung ist ein Angebot, keine Bedingung.`,
};