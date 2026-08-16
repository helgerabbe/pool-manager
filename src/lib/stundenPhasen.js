/**
 * Gemeinsame Meta-Infos der Stunden-Phasen (MUG Paket 2).
 */
export const PHASEN_TYP_META = {
  // Farblogik: analog = gelb/amber, digital = blau (durchgängig).
  analog_input: { label: 'Analoger Input', badge: 'bg-amber-100 text-amber-900 border-amber-200', rand: 'border-l-4 border-l-amber-400' },
  digital_input: { label: 'Digitaler Input', badge: 'bg-blue-100 text-blue-900 border-blue-200', rand: 'border-l-4 border-l-blue-500' },
  analog_aufgabe: { label: 'Analoge Aufgabe', badge: 'bg-amber-100 text-amber-900 border-amber-200', rand: 'border-l-4 border-l-amber-400' },
  digital_aufgabe: { label: 'Digitale Aufgabe', badge: 'bg-blue-100 text-blue-900 border-blue-200', rand: 'border-l-4 border-l-blue-500' },
  // Brian-Aufgabe: offene Aufgabe mit KI-Tutor – eigene Farbe (violett).
  brian_aufgabe: { label: 'Brian-Aufgabe (KI-Tutor)', badge: 'bg-violet-100 text-violet-900 border-violet-200', rand: 'border-l-4 border-l-violet-500' },
  analog_sicherung: { label: 'Analoge Sicherung', badge: 'bg-amber-100 text-amber-900 border-amber-200', rand: 'border-l-4 border-l-amber-400' },
  digital_sicherung: { label: 'Digitale Sicherung', badge: 'bg-blue-100 text-blue-900 border-blue-200', rand: 'border-l-4 border-l-blue-500' },
};

/** Alt-Werte (vor 2026-08-16) auf die neuen Phasen-Arten abbilden. */
const LEGACY_TYP_MAP = {
  lehrer_input: 'analog_input',
  schueler_aktivitaet: 'digital_aufgabe',
  analog: 'analog_aufgabe',
  sicherung: 'analog_sicherung',
};

export function normalisierterTyp(typ) {
  if (PHASEN_TYP_META[typ]) return typ;
  return LEGACY_TYP_MAP[typ] || 'analog_input';
}

export function phasenTypMeta(typ) {
  return PHASEN_TYP_META[normalisierterTyp(typ)];
}

/**
 * Standard-Anweisung für Schüler:innen je Phasen-Art. Wird als Vorbelegung
 * eingesetzt, damit die Lehrkraft den immer gleichen Satz nicht tippen muss.
 */
export const STANDARD_SCHUELER_ANWEISUNG = {
  analog_input: 'Achtung: Du erhältst jetzt Informationen von deiner Lehrkraft. Hör gut zu und sei aufmerksam.',
  digital_input: 'Schau dir jetzt den folgenden Input in Ruhe an und mach dir Notizen.',
  analog_aufgabe: 'Du erhältst jetzt eine Aufgabe von deiner Lehrkraft. Was du zu tun hast, erklärt sie dir – bitte bearbeite die Aufgabe.',
  digital_aufgabe: 'Bearbeite jetzt die folgende Aufgabe. Los geht\u2019s!',
  brian_aufgabe: 'Bearbeite jetzt die folgende Aufgabe im Gespräch mit Brian. Er begleitet dich dabei – arbeite so lange mit ihm, bis er die Aufgabe als abgeschlossen bestätigt.\n\nAufgabenstellung:\n',
  analog_sicherung: 'Deine Lehrkraft fasst jetzt die wesentlichen Aspekte zusammen. Hör gut zu und ergänze deine Notizen.',
  digital_sicherung: 'Sichere jetzt dein Ergebnis mit der folgenden Aufgabe.',
};

export function standardSchuelerAnweisung(typ) {
  return STANDARD_SCHUELER_ANWEISUNG[normalisierterTyp(typ)] || '';
}

/** true, wenn der Text leer ist oder noch einer der Standard-Sätze ist. */
export function istStandardSchuelerAnweisung(text) {
  const t = (text || '').trim();
  if (!t) return true;
  return Object.values(STANDARD_SCHUELER_ANWEISUNG).includes(t);
}

/** Digitale Phasen ziehen eine Aktivität aus dem Pool-Manager hinzu. */
export function istDigitalerTyp(typ) {
  return normalisierterTyp(typ).startsWith('digital_');
}

/** Brian-Aufgabe: offene Aufgabe, die die Schüler im KI-Tutor-Dialog bearbeiten. */
export function istBrianTyp(typ) {
  return normalisierterTyp(typ) === 'brian_aufgabe';
}

/** Sind die vier Brian-Übergabefelder ausgefüllt? */
export function istBrianVollstaendig(brian) {
  const b = brian || {};
  return !!(b.learner_instruction?.trim() && b.system_instruction?.trim());
}

/** Input-Phasen: keine Differenzierung, da die Lehrkraft vorträgt. */
export function istInputTyp(typ) {
  return normalisierterTyp(typ).endsWith('_input');
}

/** Dreistelliger Freischalt-Code (100-999). */
export function dreistelligerCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

/** Erzeugt pro Phase eindeutige Codes innerhalb einer Stunde. */
export function eindeutigeCodes(anzahl, belegt = []) {
  const set = new Set(belegt.filter(Boolean));
  const codes = [];
  while (codes.length < anzahl) {
    const code = dreistelligerCode();
    if (set.has(code)) continue;
    set.add(code);
    codes.push(code);
  }
  return codes;
}