// Themenblöcke der Didaktischen Konzeption (2026-10-16): Stundenmodelle nach ihrer Art gegliedert.
export const KONZEPTION_BLOECKE = [
  { titel: 'Erarbeitung', modelle: ['induktiv', 'deduktiv'],
    einleitung: 'In Erarbeitungsstunden lernen die Schüler etwas Neues. Entweder entdecken sie eine Regel selbst (induktiv) oder sie bekommen die Regel erklärt und wenden sie an (deduktiv).' },
  { titel: 'Übung', modelle: ['uebung_kurz', 'uebung_mittel', 'uebung_lang'],
    einleitung: 'In individuellen Übungsstunden wird gerade Gelerntes gefestigt. Sie sind kooperationsoffen, jeder gibt aber ein Einzelergebnis ab. Unterschieden wird danach, wer steuert und kontrolliert: kurz = gemeinsam kontrolliert, mittel = über bereitgestellte Lösungen, lang = Selbstkontrolle.' },
  { titel: 'Vertiefte Übung', modelle: ['vertieft'],
    einleitung: 'In der vertieften Übung wenden die Schüler ihr Vorwissen auf eine anspruchsvolle Aufgabe an und erstellen im Team ein gemeinsames Ergebnis.',
    erklaerung: 'Die vertiefte Übung ist Teamarbeit. Das unterscheidet sie grundlegend von der individuellen Übung: Dort festigt jeder für sich und gibt ein eigenes Ergebnis ab. Hier beschäftigt sich eine Gruppe lange und intensiv mit einer Sache. Sie erschließt ein Problem, entwickelt gemeinsam Lösungen und erstellt ein gemeinsames Produkt. Am Ende werden die Teamergebnisse verglichen und es wird reflektiert. Ziel ist nicht mehr das sichere Beherrschen, sondern das Anwenden und Vertiefen in einem größeren Zusammenhang.' },
  { titel: 'Wiederholung', modelle: ['wiederholung'],
    einleitung: 'Geübt wird Neues, wiederholt wird bereits Gelerntes. Die kurze Form reaktiviert Vorwissen vor neuem Inhalt, die umfassende ordnet und vernetzt eine ganze Einheit. Die Selbsteinschätzung dort ist ein Wegweiser für die Schüler, keine Diagnose für die Lehrkraft.' },
  { titel: 'Diagnose', modelle: ['diagnose_kurz', 'diagnose_mittel', 'diagnose_lang'],
    einleitung: 'Diagnosen unterscheiden sich darin, wer mit dem Ergebnis weiterarbeitet: kurz = die Lehrkraft steuert damit die nächste Stunde, mittel = jeder Schüler erhält Rückmeldung und nächste Schritte, lang = die Lehrkraft plant damit Förderung, Gruppen oder den weiteren Verlauf.' },
];