/** Formen der Einstiegsstunde (2026-10-17): Auftakt einer neuen Unterrichtseinheit. Unterschieden nach dem Zugang zum Thema. */
export const EINSTIEG_VARIANTEN = [
  { key: 'problemorientiert', name: 'Problemorientiert', kurz: 'Ein irritierendes Phänomen, ein Fall oder eine Frage weckt Neugier und führt zu den Leitfragen der Einheit. Typisch: stummer Impuls, Fallbeispiel, Fragenspeicher.',
    phasen: ['Irritierender Impuls', 'Erste Vermutungen', 'Fragen sammeln & ordnen', 'Leitfrage der Einheit', 'Ausblick auf den Weg'] },
  { key: 'vorwissen', name: 'Vorwissen aktivierend', kurz: 'Die Schüler holen hervor, was sie schon wissen, können und glauben. Typisch: Brainstorming, Mindmap, Placemat, Kartenabfrage.',
    phasen: ['Thema ankündigen', 'Vorwissen sammeln', 'Vorwissen ordnen', 'Wissenslücken & Fragen', 'Ausblick auf die Einheit'] },
  { key: 'ueberblick', name: 'Überblick gebend', kurz: 'Die Einheit wird als Ganzes vorgestellt, damit die Schüler wissen, wohin es geht. Typisch: Advance Organizer, Lernlandkarte, Kompetenzraster.',
    phasen: ['Einstimmung', 'Überblick über die Einheit', 'Ziele & Erwartungen klären', 'Selbsteinschätzung', 'Erste Schritte planen'] },
  { key: 'mitplanend', name: 'Mitplanend', kurz: 'Die Schüler gestalten den Weg durch die Einheit mit: Was interessiert uns, wie wollen wir arbeiten? Typisch: Interessenabfrage, Themenbörse, gemeinsamer Plan.',
    phasen: ['Thema vorstellen', 'Interessen & Fragen sammeln', 'Schwerpunkte auswählen', 'Arbeitsweise vereinbaren', 'Plan festhalten'] },
];

export const einstiegVariante = (key) => EINSTIEG_VARIANTEN.find((v) => v.key === key);