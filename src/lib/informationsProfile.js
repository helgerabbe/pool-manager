// INFORMATIONSPROFILE (2026-11-04): Was braucht der Stundenentwurfs-Assistent je Stundenform?
// Drei Stufen: mindest = erster brauchbarer Entwurf; gut = passgenauer Ablauf und sichere Methodenwahl;
// vertieft = Feinzuschnitt auf Lerngruppe und Absicht.
// "erkennen" = woran der Assistent die Variante erkennt (Grundlage für die Empfehlung).
// "spaeter" = gehört NICHT in den Entwurf, sondern erst zu Folien/Übungen (z. B. der konkrete Impuls).
// Gemeinsam für alle Formen gilt BASIS; die Formen ergänzen nur, was sie zusätzlich brauchen.

export const STUFEN = { mindest: 'Mindestgrundlage', gut: 'Gute Planungsgrundlage', vertieft: 'Vertiefte Grundlage' };

// Herkunft: wo die App die Information schon haben kann (fundament, stunde, lerngruppe, einheit, tagebuch, fachinhalt, lehrkraft).
export const BASIS = {
  mindest: [
    { feld: 'thema', frage: 'Worum geht es in der Stunde?', quelle: 'fundament' },
    { feld: 'ziel', frage: 'Was sollen die Schüler am Ende können oder wissen?', quelle: 'fundament' },
    { feld: 'dauer', frage: 'Einzel- oder Doppelstunde?', quelle: 'stunde' },
    { feld: 'jahrgang', frage: 'Welcher Jahrgang, welches Fach?', quelle: 'stunde' },
  ],
  gut: [
    { feld: 'lerngruppe', frage: 'Wie arbeitet die Gruppe (Tempo, Selbstständigkeit, Leistung)?', quelle: 'lerngruppe' },
    { feld: 'einordnung', frage: 'Wo steht die Stunde in der Einheit, was kam vorher?', quelle: 'tagebuch' },
    { feld: 'geraete', frage: 'Arbeiten die Schüler mit Tablets oder analog?', quelle: 'lehrkraft' },
  ],
  vertieft: [
    { feld: 'heterogenitaet', frage: 'Gibt es Schüler, die besonders gefördert oder gefordert werden müssen?', quelle: 'lehrkraft' },
    { feld: 'fachinhalt', frage: 'Welche fachlichen Schwerpunkte sind gesetzt?', quelle: 'fachinhalt' },
    { feld: 'material', frage: 'Gibt es Material, das sicher eingesetzt werden soll (Buchseite, Arbeitsblatt)?', quelle: 'fundament' },
  ],
};

export const INFORMATIONS_PROFILE = {
  einstieg: {
    name: 'Einstiegsstunde',
    mindest: [
      { feld: 'einheit_thema', frage: 'Welche Einheit beginnt hier?', quelle: 'einheit' },
      { feld: 'vorwissen_grob', frage: 'Ist das Thema für die Schüler neu oder kennen sie schon etwas?', quelle: 'lehrkraft' },
    ],
    gut: [
      { feld: 'absicht', frage: 'Was ist dir am Anfang am wichtigsten: Neugier wecken, Vorwissen sammeln, Überblick geben oder mitplanen lassen?', quelle: 'lehrkraft' },
      { feld: 'einheit_verlauf', frage: 'Wie lang ist die Einheit, was sind ihre großen Schritte?', quelle: 'einheit' },
    ],
    vertieft: [
      { feld: 'spielraum', frage: 'Dürfen die Schüler bei Schwerpunkten oder Arbeitsweise mitentscheiden?', quelle: 'lehrkraft' },
      { feld: 'phaenomen', frage: 'Gibt es ein überraschendes Phänomen oder einen starken Fall zum Thema?', quelle: 'fachinhalt' },
    ],
    erkennen: {
      problemorientiert: 'Das Thema hat ein überraschendes Phänomen oder einen starken Fall, der von selbst Fragen auslöst.',
      vorwissen: 'Die Schüler wissen schon einiges, aber ungeordnet oder unterschiedlich viel.',
      ueberblick: 'Die Einheit ist lang oder komplex, die Schüler brauchen Orientierung.',
      mitplanend: 'Es gibt Spielraum, und die Gruppe ist selbstständig genug.',
    },
    spaeter: ['der konkrete Impuls (Bild, These, Fall)', 'Fragen und Karten der Sammlung', 'Folien zum Überblick'],
  },

  erarbeitung: {
    name: 'Erarbeitungsstunde',
    // Erste Entscheidung: induktiv (entdecken) oder deduktiv (Regel vorgeben), dann die Variante.
    mindest: [
      { feld: 'neues', frage: 'Was ist das Neue, das erarbeitet wird (Regel, Begriff, Zusammenhang, Verfahren)?', quelle: 'fundament' },
      { feld: 'weg', frage: 'Sollen die Schüler es selbst entdecken oder führst du es ein?', quelle: 'lehrkraft' },
    ],
    gut: [
      { feld: 'vorwissen', frage: 'Welches Vorwissen ist sicher vorhanden?', quelle: 'tagebuch' },
      { feld: 'entdeckbar', frage: 'Lässt sich das Neue an Beispielen oder Material selbst finden?', quelle: 'fachinhalt' },
      { feld: 'sicherung', frage: 'Wie soll das Ergebnis am Ende festgehalten werden?', quelle: 'lehrkraft' },
    ],
    vertieft: [
      { feld: 'fehlvorstellungen', frage: 'Welche typischen Fehlvorstellungen oder Stolpersteine gibt es?', quelle: 'fachinhalt' },
      { feld: 'erfahrung', frage: 'Hat die Gruppe schon Erfahrung mit entdeckendem Arbeiten?', quelle: 'lehrkraft' },
      { feld: 'transfer', frage: 'Soll es schon in dieser Stunde einen Transfer geben?', quelle: 'lehrkraft' },
    ],
    erkennen: {
      'induktiv.offen': 'Selbstständige Gruppe mit Erfahrung, das Neue ist gut entdeckbar, genug Zeit.',
      'induktiv.gelenkt': 'Entdeckbar, aber die Gruppe braucht Leitfragen oder gezielt ausgewählte Beispiele.',
      'induktiv.gestuft': 'Schwächere oder unsichere Gruppe; Entdecken nur mit gestuften Hilfen.',
      'induktiv.kompakt': 'Wenig Zeit; ein kurzer Entdeckungsschritt reicht.',
      'deduktiv.darbietend': 'Das Neue ist nicht sinnvoll entdeckbar oder muss schnell und klar stehen.',
      'deduktiv.loesungsbeispiel': 'Verfahren, das sich am durchgerechneten Beispiel gut zeigen lässt.',
      'deduktiv.material': 'Die Regel steht im Material (Buch, Text) und wird daraus erschlossen.',
      'deduktiv.kompakt': 'Kurze Einführung, danach geht es schnell ins Anwenden.',
    },
    spaeter: ['konkrete Beispiele und Material', 'Leitfragen und Hilfekarten', 'Merksatz und Tafelbild'],
  },

  uebung: {
    name: 'Übungsstunde',
    mindest: [
      { feld: 'inhalt', frage: 'Was wird geübt?', quelle: 'fundament' },
      { feld: 'zeit', frage: 'Wie viel Zeit steht zum Üben zur Verfügung (Teil der Stunde, ganze Stunde, mehrere Stunden)?', quelle: 'lehrkraft' },
    ],
    gut: [
      { feld: 'kontrolle', frage: 'Wer kontrolliert: gemeinsam im Plenum, über bereitgestellte Lösungen oder als Selbstkontrolle?', quelle: 'lehrkraft' },
      { feld: 'sicherheit', frage: 'Wie sicher sitzt der Inhalt schon?', quelle: 'tagebuch' },
      { feld: 'differenzierung', frage: 'Sollen die Schüler Niveau oder Aufgaben wählen dürfen?', quelle: 'lehrkraft' },
    ],
    vertieft: [
      { feld: 'ziel_der_uebung', frage: 'Geht es um Automatisieren, Anwenden oder Vorbereitung auf einen Test?', quelle: 'lehrkraft' },
      { feld: 'nachweis', frage: 'Soll am Ende etwas abgegeben oder ausgewertet werden?', quelle: 'lehrkraft' },
    ],
    erkennen: {
      kurz: 'Direkt nach der Erarbeitung, wenig Zeit, die Lehrkraft will schnell sehen, ob es sitzt.',
      mittel: 'Die Schüler können allein arbeiten, brauchen aber eine verlässliche Kontrolle.',
      lang: 'Selbstständige Gruppe, viel Zeit, unterschiedliches Tempo oder Niveau.',
    },
    spaeter: ['die konkreten Übungsaufgaben', 'Lösungen und Hilfen', 'Arbeitsplan bei langen Übungen'],
  },
};

/** Welche Stufe ist erreicht? werte = { feld: wert }; liefert erreichte Stufe und was für die nächste fehlt. */
export function profilStand(form, werte = {}) {
  const p = INFORMATIONS_PROFILE[form];
  if (!p) return null;
  const fehlt = (stufe) => [...BASIS[stufe], ...p[stufe]].filter((i) => !werte[i.feld]);
  const erreicht = ['mindest', 'gut', 'vertieft'].reduce((acc, s) => (acc.weiter && !fehlt(s).length ? { stufe: s, weiter: true } : { ...acc, weiter: false }), { stufe: null, weiter: true }).stufe;
  const naechste = { null: 'mindest', mindest: 'gut', gut: 'vertieft' }[erreicht];
  return { erreicht, naechste: naechste || null, fehlt: naechste ? fehlt(naechste) : [] };
}