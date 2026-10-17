/** Formen der Urteilsstunde (2026-10-17): unterschieden nach dem Weg zum begründeten Urteil. */
export const URTEIL_VARIANTEN = [
  { key: 'positionierend', name: 'Positionierend', kurz: 'Die Schüler finden zu einer Streitfrage eine eigene Position und begründen sie. Typisch: Vier Ecken, Positionslinie, Free Writing.',
    phasen: ['Streitfrage aufwerfen', 'Erste Position beziehen', 'Argumente sammeln', 'Position begründen', 'Positionen abgleichen & reflektieren'] },
  { key: 'abwaegend', name: 'Abwägend', kurz: 'Die Schüler sammeln Argumente beider Seiten, ordnen und gewichten sie und kommen zu einem abgewogenen Urteil. Typisch: Argumentationskette, Placemat, Pro-Contra-Tabelle.',
    phasen: ['Frage klären', 'Argumente beider Seiten sammeln', 'Ordnen & gewichten', 'Abwägen', 'Urteil formulieren & reflektieren'] },
  { key: 'streitend', name: 'Streitend', kurz: 'Die Schüler vertreten zugewiesene Rollen und setzen sich direkt auseinander. Am Ende steht ein eigenes Urteil, losgelöst von der Rolle. Typisch: Fishbowl, Pro-Contra-Debatte, Talkshow.',
    phasen: ['Streitfrage & Rollen klären', 'Positionen vorbereiten', 'Streitgespräch führen', 'Rollen verlassen & eigenes Urteil', 'Debatte reflektieren'] },
  { key: 'entscheidend', name: 'Entscheidend', kurz: 'Die Schüler treffen in einem konkreten Fall oder Dilemma eine Entscheidung, obwohl jede Lösung Nachteile hat. Typisch: Dilemmadiskussion, Entscheidungsmatrix, Fallanalyse.',
    phasen: ['Fall kennenlernen', 'Handlungsoptionen sammeln', 'Folgen abschätzen', 'Entscheidung treffen & begründen', 'Entscheidungen vergleichen & reflektieren'] },
];

export const urteilVariante = (key) => URTEIL_VARIANTEN.find((v) => v.key === key);