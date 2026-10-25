// Einsatz je Standardfolie (2026-10-24): digital = nur mit Schülergeräten, analog = ohne Geräte, beide = für beide Varianten.
export const EINSATZ = {
  digital: { name: 'Nur digital', kurz: 'D', text: 'Nur für den Einsatz mit Schülergeräten (Tablets).', klasse: 'bg-sky-100 text-sky-800' },
  analog: { name: 'Nur analog', kurz: 'A', text: 'Nur für den Unterricht ohne Schülergeräte.', klasse: 'bg-amber-100 text-amber-800' },
  beide: { name: 'Analog und digital', kurz: 'A/D', text: 'Für beide Varianten nutzbar, mit und ohne Schülergeräte.', klasse: 'bg-emerald-100 text-emerald-800' },
};

export const FOLIEN_EINSATZ = {
  begruessung: 'beide', start: 'beide', ankuendigung: 'beide', aufgabenerklaerung: 'beide',
  partner: 'digital', partner_analog: 'analog', partnerphase: 'digital', gruppenphase: 'digital',
  einzelphase: 'digital', arbeitsphase_analog: 'analog', klassenmodus: 'analog', lueckentext: 'beide', sammlung: 'beide', kartenabfrage: 'digital', abstimmung: 'digital', lernort: 'digital', positionierung: 'beide', sammlung_procontra: 'beide', einschub: 'beide', irritieren: 'beide', impuls: 'beide', reflexion: 'digital',
  notizen: 'beide', satzanfaenge: 'beide',
};

// Scrollbarkeit (2026-10-25): darf die Folie nach unten über den Bildschirm hinaus wachsen? Nicht aufgeführt = nicht scrollbar.
export const FOLIEN_SCROLLBAR = ['partner', 'sammlung', 'kartenabfrage', 'sammlung_procontra', 'abstimmung', 'reflexion', 'lernort', 'lueckentext', 'notizen', 'satzanfaenge'];
export const istScrollbar = (key) => FOLIEN_SCROLLBAR.includes(key);
// Hängt vom gezeigten Inhalt ab (z. B. Aufgabenart).
export const FOLIEN_SCROLL_ABHAENGIG = { aufgabenerklaerung: 'scrollbar je nach Aufgabenart', klassenmodus: 'scrollbar je nach Aufgabenformat' };
export const scrollText = (key) => FOLIEN_SCROLL_ABHAENGIG[key] || istScrollbar(key) ? 'scrollbar' : 'nicht scrollbar';