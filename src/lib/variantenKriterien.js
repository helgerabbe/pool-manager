/** Entscheidungskriterien für die Wahl der induktiven/deduktiven Variante (2026-10-16), nach Gewicht sortiert. */
export const KRITERIEN = [
  { titel: 'Vorwissen und Selbstständigkeit der Lerngruppe', text: 'Wichtigstes Kriterium. Neulinge brauchen mehr Lenkung, Fortgeschrittene weniger (Expertise-Umkehr-Effekt). Offenes Entdecken überfordert ohne tragfähiges Vorwissen.' },
  { titel: 'Komplexität des Inhalts', text: 'Liegt die Regel an der Oberfläche, kann offen entdeckt werden. Mehrschrittige oder wenig intuitive Regeln brauchen Lenkung oder ein deduktives Vorgehen.' },
  { titel: 'Stundenziel', text: 'Regel verstehen und begründen → induktiv. Regel sicher anwenden → deduktiv (lösungsbeispiel-gestützt oder kompakt). Entdecken selbst als Ziel → offen.' },
  { titel: 'Verfügbare Zeit', text: 'Offenes Entdecken braucht viel Zeit. Bei knapper Zeit oder Wiederholung passen die Kompaktvarianten.' },
  { titel: 'Fach und Thema', text: 'Wirkt indirekt: Konventionen (z. B. Rechtschreibregeln, Zitierweise) lassen sich kaum entdecken und werden besser deduktiv vermittelt.' },
];

export const FAUSTREGELN = {
  induktiv: [
    'Offen: starke Gruppe mit Vorwissen, gut erkennbares Muster, viel Zeit – oder Entdecken ist das Ziel.',
    'Gelenkt: der Normalfall bei durchschnittlicher Gruppe und neuem, aber erschließbarem Inhalt.',
    'Schrittweise gestützt: schwächere oder heterogene Gruppe, mehrteilige Regel.',
    'Kompakt: wenig Zeit oder einfache Regel, schnell in die Übung.',
  ],
  deduktiv: [
    'Lösungsbeispiel-gestützt: echte Neulinge, mehrschrittige Verfahren (stark belegt).',
    'Klassisch darbietend: abstrakte Regel oder Konvention, gleiches Verständnis für alle sichern.',
    'Material-gestützt: lesestarke, selbstständige Gruppe und gutes Material vorhanden.',
    'Kompakt: Regel bekannt oder einfach, Schwerpunkt Üben.',
  ],
  tiefe: 'Erkenntnistiefe entsteht durch aktive Verarbeitung (erklären, vergleichen, begründen), nicht automatisch durch offenes Entdecken. Kurzes eigenes Probieren vor der Erklärung kann helfen, wenn danach klar instruiert wird.',
};

/** Text für KI-Prompts. */
export const kriterienPrompt = () => `Entscheide die Variante nach diesen Kriterien (nach Gewicht):
${KRITERIEN.map((k, i) => `${i + 1}. ${k.titel}: ${k.text}`).join('\n')}
Faustregeln induktiv:\n${FAUSTREGELN.induktiv.map((f) => `- ${f}`).join('\n')}
Faustregeln deduktiv:\n${FAUSTREGELN.deduktiv.map((f) => `- ${f}`).join('\n')}
${FAUSTREGELN.tiefe}
Nenne in der Begründung das ausschlaggebende Kriterium.`;