// Kompetenzkarte (2026-11-10): Gewichtungen, Stufen, Sortierung und Textfassung für die KI.
import { base44 } from '@/api/base44Client';

export const STUFEN = ['nicht zutreffend', 'teilweise zutreffend', 'überwiegend zutreffend', 'zutreffend'];

export const GEWICHTE = [
  { key: 'zentral', label: 'Zentral', zeile: 'border-l-accent bg-accent/10', chip: 'bg-accent text-accent-foreground border-accent' },
  { key: 'wichtig', label: 'Wichtig', zeile: 'border-l-primary bg-primary/5', chip: 'bg-primary text-primary-foreground border-primary' },
  { key: 'ergaenzend', label: 'Ergänzend', zeile: 'border-l-muted-foreground/40 bg-card', chip: 'bg-muted-foreground text-background border-muted-foreground' },
];

export const gewichtVon = (key) => GEWICHTE.find((g) => g.key === key) || GEWICHTE[1];
const rang = (k) => GEWICHTE.indexOf(gewichtVon(k.gewicht));

/** Von zentral zu ergänzend, innerhalb einer Gruppe in der gespeicherten Reihenfolge. */
export const sortiert = (ks = []) =>
  ks.map((k, i) => ({ k, i })).sort((a, b) => rang(a.k) - rang(b.k) || a.i - b.i).map((x) => x.k);

export const neueId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export async function ladeKompetenzkarte(einheitId) {
  return (await base44.entities.Kompetenzkarte.filter({ einheit_id: einheitId, lerntyp: 'pragmatiker' }))[0] || null;
}

/** Kompetenzkarte als Text für Test-Assistent und korrigierende KI. */
export function kompetenzkarteText(karte) {
  if (!karte?.bereiche?.length) return '';
  return karte.bereiche
    .map((b) => `Bereich „${b.titel}“ – Du kannst …\n${sortiert(b.kompetenzen).map((k) => `  - [${k.id}] (${gewichtVon(k.gewicht).label}) ${k.text}`).join('\n')}`)
    .join('\n');
}