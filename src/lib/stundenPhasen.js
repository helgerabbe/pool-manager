/**
 * Gemeinsame Meta-Infos der Stunden-Phasen (MUG Paket 2).
 */
export const PHASEN_TYP_META = {
  analog_input: { label: 'Analoger Input', badge: 'bg-slate-100 text-slate-800 border-slate-200' },
  digital_input: { label: 'Digitaler Input', badge: 'bg-blue-100 text-blue-900 border-blue-200' },
  analog_aufgabe: { label: 'Analoge Aufgabe', badge: 'bg-amber-100 text-amber-900 border-amber-200' },
  digital_aufgabe: { label: 'Digitale Aufgabe', badge: 'bg-blue-100 text-blue-900 border-blue-200' },
  analog_sicherung: { label: 'Analoge Sicherung', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  digital_sicherung: { label: 'Digitale Sicherung', badge: 'bg-teal-100 text-teal-900 border-teal-200' },
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

/** Digitale Phasen ziehen eine Aktivität aus dem Pool-Manager hinzu. */
export function istDigitalerTyp(typ) {
  return normalisierterTyp(typ).startsWith('digital_');
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