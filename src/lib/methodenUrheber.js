// "Ehre, wem Ehre gebührt" (2026-10-14): nur Methoden mit gesicherter Urheberschaft.
// e = entwickelt von, b = bekannt gemacht / geprägt durch
const E = (wer, jahr) => ({ art: 'e', wer, jahr });
const B = (wer, jahr) => ({ art: 'b', wer, jahr });

export const URHEBER = {
  'Think-Pair-Share': E('Frank Lyman', 1981),
  'Gruppenpuzzle (Jigsaw)': E('Elliot Aronson', 1971),
  'Peer Instruction': E('Eric Mazur', 1991),
  'Reziprokes Lesen': E('Annemarie Palincsar und Ann Brown', 1984),
  'Lerntempoduett': E('Diethelm Wahl'),
  'Sandwich-Methode': E('Diethelm Wahl'),
  'Innerer Monolog / Leerstellen füllen': B('Gerhard Haas und Kaspar H. Spinner'),
  'Antizipierendes Lesen': B('Gerhard Haas'),
  'Rollenbiografie / Figurensteckbrief': B('Ingo Scheller'),
  'Umschreiben und Weiterschreiben': B('Günter Waldmann'),
  'Literarisches Unterrichtsgespräch': E('Gerhard Härle und Marcus Steinbrenner'),
  'Concept Mapping': E('Joseph D. Novak', 1972),
  'Brainstorming / Mindmap': B('Alex F. Osborn (Brainstorming) und Tony Buzan (Mindmap)'),
  'Denkhüte (Sechs Hüte)': E('Edward de Bono', 1985),
  'Walt-Disney-Methode': E('Robert Dilts', 1994),
  'Zukunftswerkstatt': E('Robert Jungk'),
  'Cornell-Methode': E('Walter Pauk'),
  'Pecha Kucha': E('Astrid Klein und Mark Dytham', 2003),
  'Total Physical Response (TPR)': E('James J. Asher'),
  'Polya-Schema': E('George Pólya', 1945),
  'Fermi-Aufgaben': B('Enrico Fermi'),
  'Sokratisches Gespräch': E('Leonard Nelson, nach Sokrates'),
  'Dilemma-Diskussion': E('Moshe Blatt und Lawrence Kohlberg'),
  'PQ4R / SQ3R': E('Francis P. Robinson (SQ3R)', 1946),
  'Flipped Classroom': B('Jonathan Bergmann und Aaron Sams', 2007),
  'WebQuest': E('Bernie Dodge', 1995),
  'Concept Cartoons': E('Stuart Naylor und Brenda Keogh'),
  'Storyline': E('Steve Bell und Fred Rendell'),
  'Brainwriting': E('Bernd Rohrbach (6-3-5)', 1968),
  'KAWA': E('Vera F. Birkenbihl'),
  'ABC-Methode': E('Vera F. Birkenbihl'),
  'Strukturlegetechnik': E('Norbert Groeben und Brigitte Scheele'),
  'World Café': E('Juanita Brown und David Isaacs', 1995),
  'Insert-Methode': E('Joseph Vaughan und Thomas Estes', 1986),
  'Mystery / Rätsel': B('David Leat'),
  'Cluster': E('Gabriele L. Rico', 1983),
  'Lotus-Diagramm': E('Yasuo Matsumura'),
  'Rotierende Schreibkonferenz': B('Gudrun Spitta'),
  'Projektarbeit': B('John Dewey und William H. Kilpatrick'),
  'Freiarbeit': B('Maria Montessori'),
  'Nummerierte Köpfe': E('Spencer Kagan'),
  'Fünfsatztechnik': E('Hellmut Geißner'),
  'Szenisches Lesen / Standbild': B('Ingo Scheller'),
};

export function urheberText(name) {
  const u = URHEBER[name];
  if (!u) return null;
  return `${u.art === 'e' ? 'Entwickelt von' : 'Bekannt gemacht durch'} ${u.wer}${u.jahr ? ` (${u.jahr})` : ''}`;
}