// Zuordnung (2026-10-17): Jede Variantenphase zeigt auf die Phase(n) des Grundgerüsts im Stundenmodell (Index in STUNDEN_MODELLE[].phasen).
// Damit ergibt sich die Markierung der Variantenphasen automatisch aus der Einordnung der Methode. null = keine Entsprechung.
export const VARIANTEN_PHASEN_ZUORDNUNG = {
  induktiv: { offen: [0, 1, 2, 3, 4, 5, 6], gelenkt: [0, 1, [2, 3], 4, 5], gestuft: [0, 1, [2, 3], 4, 5], kompakt: [[0, 1], 4, 5] },
  deduktiv: { darbietend: [1, 2, 2, 3, 4], loesungsbeispiel: [1, 2, 3, 4], material: [[1, 2], 2, 2, [3, 4]], kompakt: [1, 2, [3, 4]] },
  vertieft: { problemloesend: [0, 1, 2, 4, 5], gestaltend: [0, 2, 3, 4, 5], erkundend: [0, 2, 3, 4, 5], perspektivisch: [0, 2, 3, 4, 5] },
  wiederholung: { kurz: [0, 0, [1, 2], 4], umfassend: [0, 1, 2, 4, 3] },
  urteil: { positionierend: [0, 1, 2, 3, 4], abwaegend: [0, 2, 2, [2, 3], [3, 4]], streitend: [0, 1, 2, 3, 4], entscheidend: [0, 1, 2, 3, 4] },
  erschliessung: { textdeutend: [0, 1, 2, 3, 4], quellenkritisch: [0, 1, 3, 3, 4], werkerschliessend: [[0, 1], 3, 2, 3, 4], vergleichend: [0, 3, 1, 3, 4], produktiv: [0, 2, 2, 3, 4] },
  gestaltung: { schreibend: [0, 1, 2, 3, [3, 4]], bildnerisch: [0, 1, 2, 3, [2, 4]], darstellend: [0, 1, 2, 3, 4], medial: [0, 1, 2, 3, 4] },
  einstieg: { problemorientiert: [0, 1, 1, 3, 4], vorwissen: [0, 1, 1, 1, 4], ueberblick: [0, 2, 3, 1, 4], mitplanend: [0, 1, 3, 3, 4] },
  praesentation: { vortragend: [0, 1, 2, 3, 4], ausstellend: [1, 1, 2, 3, 3], austauschend: [0, 1, 1, 3, 3], bewertend: [0, 1, 1, 2, [2, 4]] },
};

const RANG = { kern: 3, teil: 2, bedingt: 1 };

/** Beitrag einer Variantenphase = stärkster Beitrag der zugeordneten Grundphasen. */
export function variantenBeitraege(modell, varianteKey, phasenAnzahl, eintrag) {
  const z = VARIANTEN_PHASEN_ZUORDNUNG[modell.key]?.[varianteKey] || [];
  return Array.from({ length: phasenAnzahl }, (_, i) => {
    const idx = [z[i]].flat().filter((x) => x != null);
    return idx.map((j) => eintrag.phasen?.[modell.phasen[j]]).filter(Boolean).sort((a, b) => RANG[b] - RANG[a])[0];
  });
}