/**
 * Gemeinsame Meta-Infos der Stunden-Phasen (MUG Paket 2).
 */
export const PHASEN_TYP_META = {
  lehrer_input: { label: 'Lehrer-Input', badge: 'bg-slate-100 text-slate-800 border-slate-200' },
  schueler_aktivitaet: { label: 'Digitale Aktivität', badge: 'bg-blue-100 text-blue-900 border-blue-200' },
  analog: { label: 'Analog', badge: 'bg-amber-100 text-amber-900 border-amber-200' },
  sicherung: { label: 'Sicherung', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
};

export function phasenTypMeta(typ) {
  return PHASEN_TYP_META[typ] || PHASEN_TYP_META.lehrer_input;
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