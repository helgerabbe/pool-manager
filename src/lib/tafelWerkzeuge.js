// Funktionstafel für Arbeitsphasen (2026-10-24, digital).
// WERKZEUGE = dauerhafte Anzeigen, im Menü oben links an/aus. AKTIONEN = einmalige Knöpfe oben rechts.
// "fuer" = Sozialformen, in denen es angeboten wird; "start" = beim Öffnen der Folie an.
const ALLE = ['EA', 'PA', 'GA'];
const TEAM = ['PA', 'GA'];

export const WERKZEUGE = [
  { key: 'timer', name: 'Timer', fuer: ALLE, start: true },
  { key: 'fortschritt', name: 'Fortschritt (wer ist fertig?)', fuer: ALLE, start: true },
  { key: 'warteschlange', name: 'Hilfe-Warteschlange', fuer: ALLE },
  { key: 'laermampel', name: 'Lärmampel', fuer: ALLE },
  { key: 'rueckmeldung', name: 'Sterne & Hinweise an Teams', fuer: TEAM },
  { key: 'experten', name: 'Experten zeigen („kann helfen“)', fuer: TEAM },
  { key: 'klassenziel', name: 'Klassenziel (Sterne sammeln)', fuer: TEAM },
  { key: 'stimmung', name: 'Stimmungsbarometer', fuer: ALLE },
];

export const AKTIONEN = [
  { key: 'herschauen', name: 'Alle herschauen', fuer: ALLE },
  { key: 'zwischenstopp', name: 'Zwischenstopp', fuer: ALLE },
  { key: 'zeit_plus', name: '+2 Min.', fuer: ALLE },
  { key: 'endspurt', name: 'Endspurt', fuer: ALLE },
  { key: 'tipp', name: 'Tipp freigeben', fuer: ALLE },
  { key: 'zufall', name: 'Zufallsauswahl', fuer: TEAM },
];

export const werkzeugeFuer = (sf) => WERKZEUGE.filter((w) => w.fuer.includes(sf));
export const aktionenFuer = (sf) => AKTIONEN.filter((a) => a.fuer.includes(sf));
export const startWerkzeuge = (sf) => Object.fromEntries(werkzeugeFuer(sf).map((w) => [w.key, !!w.start]));