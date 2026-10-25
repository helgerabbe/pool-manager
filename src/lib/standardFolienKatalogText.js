// Katalog der vorhandenen Standardfolien und Aufgabenformate als Text für die KI-Prompts (2026-10-25).
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { UEBUNGSFORMATE } from '@/lib/uebungsformate';

const kurz = (t) => String(t || '').split(/(?<=\.)\s/)[0];

export function standardFolienKatalogText() {
  const folien = STANDARD_FOLIEN.map((s) => `- ${s.name}: ${kurz(s.lehrer)}`).join('\n');
  const formate = UEBUNGSFORMATE.map((f) => f.name).join(', ');
  return `STANDARDFOLIEN:\n${folien}\nAUFGABENFORMATE (füllen Aufgabenfolien): ${formate}`;
}

export const STANDARD_REGEL_GROB = 'Greife, wann immer es passt, auf eine vorhandene Standardfolie zurück. Schreibe je Folie: "Folie N: Name [Standardfolie: <genauer Name aus dem Katalog>] – Beschreibung". Gibt es keine passende Standardfolie, schreibe "[Noch keine Standardfolie – neu erstellen]". Erfinde keine Standardfolien, die nicht im Katalog stehen.';