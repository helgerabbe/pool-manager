/**
 * grafikVariante.js
 *
 * Grafik-Assistent (2026-09-15): Eine fertig gebaute Aufgabe darf NACHTRÄGLICH
 * grafisch aufbereitet werden. Das Ergebnis liegt IMMER zusätzlich neben dem
 * funktionalen Original — nie darüber:
 *
 *   Offene Aufgabe (Schritt typ='offen'):
 *     offen.fragment            → das funktionale Original (unantastbar)
 *     offen.fragment_polished   → die grafisch aufbereitete Fassung
 *     offen.design_variante     → 'funktional' | 'grafisch'
 *     offen.design_meta         → { richtung, erzeugt_am, bilder: [...] }
 *
 *   Slideshow (field_values):
 *     slides                    → Inhalte, Vorlagen, Einblendlogik (unantastbar)
 *     design_polished           → das Design-Objekt (Farben, Schrift, Bilder)
 *     design_variante           → 'funktional' | 'grafisch'
 *
 * Warum getrennt: Das Original ist die funktionale Wahrheit, die die Lehrkraft
 * in der Vorschau geprüft hat. Ein grafischer Durchlauf darf sie nie verlieren —
 * ein Umschalter genügt, um zurückzukehren.
 */

export const VARIANTE_FUNKTIONAL = 'funktional';
export const VARIANTE_GRAFISCH = 'grafisch';

/** Die wählbaren Designrichtungen — dezent und professionell, nicht kinderbunt. */
export const GRAFIK_RICHTUNGEN = [
  {
    key: 'light',
    label: 'Hell & klar',
    beschreibung: 'Weiße Flächen, ruhige Blautöne, klare Typografie, weiche Schatten.',
  },
  {
    key: 'dark',
    label: 'Dunkel & fokussiert',
    beschreibung: 'Dunkler Grund, heller Text, ein warmer Akzent — ruhig und konzentriert.',
  },
  {
    key: 'bildwelt',
    label: 'Bildwelt',
    beschreibung: 'Zusätzlich thematisch passende, dezente Hintergrundbilder aus der KI.',
  },
];

export function getRichtung(key) {
  return GRAFIK_RICHTUNGEN.find((r) => r.key === key) || GRAFIK_RICHTUNGEN[0];
}

/* ── Offene Aufgabe ───────────────────────────────────────────────────────── */

/** Gibt es für diesen offenen Schritt eine aufbereitete Fassung? */
export function hatGrafikVariante(offen) {
  return !!String(offen?.fragment_polished || '').trim();
}

/** Ist die aufbereitete Fassung aktiv? */
export function grafikAktiv(offen) {
  return hatGrafikVariante(offen) && offen?.design_variante === VARIANTE_GRAFISCH;
}

/** Das Fragment, das Schüler und Vorschau sehen sollen. */
export function aktivesFragment(offen) {
  return grafikAktiv(offen) ? offen.fragment_polished : (offen?.fragment || '');
}

/* ── Slideshow ────────────────────────────────────────────────────────────── */

/** Gibt es für diesen Foliensatz ein aufbereitetes Design? */
export function hatSlideDesign(fieldValues) {
  const d = fieldValues?.design_polished;
  return !!(d && typeof d === 'object' && Object.keys(d).length > 0);
}

/** Ist das aufbereitete Design aktiv? */
export function slideDesignAktiv(fieldValues) {
  return hatSlideDesign(fieldValues) && fieldValues?.design_variante === VARIANTE_GRAFISCH;
}

/** Das Design, mit dem gerendert werden soll (null = Original-Look der Folien). */
export function aktivesSlideDesign(fieldValues) {
  return slideDesignAktiv(fieldValues) ? fieldValues.design_polished : null;
}