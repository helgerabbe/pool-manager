// Funktionstafel für Arbeitsphasen (2026-10-24, digital).
// WERKZEUGE = dauerhafte Anzeigen, im Menü oben links an/aus. AKTIONEN = einmalige Knöpfe oben rechts.
// "fuer" = Sozialformen, in denen es angeboten wird; "start" = beim Öffnen der Folie an.
const ALLE = ['EA', 'PA', 'GA'];
const TEAM = ['PA', 'GA'];

export const WERKZEUGE = [
  { key: 'timer', name: 'Timer', fuer: ALLE, start: true, analog: true },
  { key: 'fortschritt', name: 'Fortschritt (wer ist fertig?)', fuer: ALLE, start: true },
  { key: 'warteschlange', name: 'Hilfe-Warteschlange', fuer: ALLE },
  { key: 'laermampel', name: 'Lärmampel', fuer: ALLE, analog: true },
  { key: 'rueckmeldung', name: 'Sterne & Hinweise an Teams', fuer: TEAM },
  { key: 'experten', name: 'Experten zeigen („kann helfen“)', fuer: TEAM },
  { key: 'klassenziel', name: 'Klassenziel (Sterne sammeln)', fuer: TEAM, analog: true },
  { key: 'stimmung', name: 'Stimmungsbarometer', fuer: ALLE },
];

// analog = auch ohne Schülergeräte sinnvoll (Lehrkraft bedient allein).
export const AKTIONEN = [
  { key: 'herschauen', name: 'Alle herschauen', fuer: ALLE, analog: true },
  { key: 'zwischenstopp', name: 'Zwischenstopp', fuer: ALLE, analog: true },
  { key: 'zeit_plus', name: '+2 Min.', fuer: ALLE, analog: true },
  { key: 'endspurt', name: 'Endspurt', fuer: ALLE, analog: true },
  { key: 'tipp', name: 'Tipp freigeben', fuer: ALLE, analog: true },
  { key: 'zufall', name: 'Zufallsauswahl', fuer: TEAM },
];

const passt = (sf, analog) => (x) => x.fuer.includes(sf) && (!analog || x.analog);
export const werkzeugeFuer = (sf, analog) => WERKZEUGE.filter(passt(sf, analog));
export const aktionenFuer = (sf, analog) => AKTIONEN.filter(passt(sf, analog));
export const startWerkzeuge = (sf, analog) => Object.fromEntries(werkzeugeFuer(sf, analog).map((w) => [w.key, true]));