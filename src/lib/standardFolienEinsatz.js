// Einsatz je Standardfolie (2026-10-24): digital = nur mit Schülergeräten, analog = ohne Geräte, beide = für beide Varianten.
export const EINSATZ = {
  digital: { name: 'Nur digital', kurz: 'D', text: 'Nur für den Einsatz mit Schülergeräten (Tablets).', klasse: 'bg-sky-100 text-sky-800' },
  analog: { name: 'Nur analog', kurz: 'A', text: 'Nur für den Unterricht ohne Schülergeräte.', klasse: 'bg-amber-100 text-amber-800' },
  beide: { name: 'Analog und digital', kurz: 'A/D', text: 'Für beide Varianten nutzbar, mit und ohne Schülergeräte.', klasse: 'bg-emerald-100 text-emerald-800' },
};

export const FOLIEN_EINSATZ = {
  begruessung: 'beide', start: 'beide', ankuendigung: 'beide', zuhoeren: 'digital', aufgabenerklaerung: 'beide',
  partner: 'digital', partner_analog: 'analog', partnerphase: 'digital', gruppenphase: 'digital',
  einzelphase: 'digital', arbeitsphase_analog: 'analog', sammlung: 'beide', abstimmung: 'digital', lernort: 'digital', reflexion: 'digital',
  notizen: 'beide', satzanfaenge: 'beide',
};