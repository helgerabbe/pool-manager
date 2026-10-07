// Methodenraster (2026-10-07): sechs Komplexitätsstufen. Ein Schritt beginnt dort,
// wo sich Auftrag oder Sozialform ändern. Eingeordnet wird mit der üblichen Auswertung.
export const STUFEN = {
  1: { name: 'Mikro-Methode', frage: 'Kommt zusätzlich dazu, ohne den Ablauf zu unterbrechen.', cls: 'bg-sky-100 text-sky-900' },
  2: { name: 'Baustein', frage: 'Ein Auftrag, danach folgt in derselben Phase noch etwas.', cls: 'bg-teal-100 text-teal-900' },
  3: { name: 'Einschrittige Phase', frage: 'Ein klarer Auftrag, der eine Phase vollständig füllt.', cls: 'bg-green-100 text-green-900' },
  4: { name: 'Mehrschrittige Phase', frage: 'Mehrere Schritte, die zusammen eine Phase füllen.', cls: 'bg-yellow-100 text-yellow-900' },
  5: { name: 'Stundenmethode', frage: 'Trägt den Verlauf einer ganzen (Doppel-)Stunde.', cls: 'bg-orange-100 text-orange-900' },
  6: { name: 'Mehrstündige Großmethode', frage: 'Braucht eigene Stunden für Vorbereitung, Durchführung und Reflexion.', cls: 'bg-red-100 text-red-900' },
};