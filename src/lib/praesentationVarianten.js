/** Formen der Präsentationsstunde (2026-10-17): Schüler stellen Ergebnisse vor und bekommen Rückmeldung. Unterschieden nach der Form des Vorstellens. */
export const PRAESENTATION_VARIANTEN = [
  { key: 'vortragend', name: 'Vortragend', kurz: 'Gruppen oder Einzelne präsentieren nacheinander vor der Klasse. Typisch: Kurzvortrag, Beobachtungsbogen, Feedback-Regeln.',
    phasen: ['Ablauf & Feedback-Kriterien', 'Präsentationen', 'Rückmeldung je Präsentation', 'Ergebnisse bündeln', 'Reflexion'] },
  { key: 'ausstellend', name: 'Ausstellend', kurz: 'Ergebnisse hängen oder liegen aus, die Schüler gehen herum und geben schriftlich Rückmeldung. Typisch: Galeriegang, Museumsrundgang, Marktplatz.',
    phasen: ['Ergebnisse ausstellen', 'Rundgang mit Auftrag', 'Schriftliches Feedback', 'Gemeinsame Auswertung', 'Ergebnisse sichern'] },
  { key: 'austauschend', name: 'Austauschend', kurz: 'Ergebnisse werden in wechselnden Kleingruppen vorgestellt, alle präsentieren gleichzeitig. Typisch: Gruppenpuzzle (Rückkehr), Kugellager, Stationenwechsel.',
    phasen: ['Austauschrunden vorbereiten', 'Präsentieren in Kleingruppen', 'Wechseln & erneut präsentieren', 'Gemeinsamkeiten & Unterschiede', 'Ergebnisse sichern'] },
  { key: 'bewertend', name: 'Bewertend', kurz: 'Präsentationen werden anhand eines Kriterienrasters bewertet, z. B. als Leistungsnachweis. Typisch: Bewertungsbogen, Peer-Bewertung, Kolloquium.',
    phasen: ['Kriterien klären', 'Präsentationen', 'Nachfragen & Kolloquium', 'Bewertung nach Kriterien', 'Rückmeldung & Reflexion'] },
];

export const praesentationVariante = (key) => PRAESENTATION_VARIANTEN.find((v) => v.key === key);