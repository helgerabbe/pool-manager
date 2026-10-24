// Skizzen-Beispiel für „Reihenfolge sortieren“ (richtige Reihenfolge).
export const SCHRITTE = [
  'Der Samen liegt in der feuchten Erde.',
  'Der Samen keimt, eine kleine Wurzel wächst.',
  'Der Keimling wächst nach oben ans Licht.',
  'Die Pflanze bildet Blätter.',
  'Die Pflanze blüht.',
];
export const GEMISCHT = [3, 0, 4, 1, 2];
export const tauschen = (liste, i, j) => {
  if (j < 0 || j >= liste.length) return liste;
  const n = [...liste];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};