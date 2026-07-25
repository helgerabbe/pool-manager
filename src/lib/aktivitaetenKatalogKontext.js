import { base44 } from '@/api/base44Client';

/**
 * Lädt die AKTIVEN Einträge des Aktivitäten-Katalogs (Aufgabengalerie) und
 * formatiert sie als Prompt-Block für die KI-Assistenten (Aufgaben-Assistent,
 * Integrations-Assistent). So empfiehlt die KI nur real existierende
 * Ebene-1-Formate — inklusive der schuleigenen pädagogischen Beschreibungen.
 */
export async function holeAktivitaetenKatalogKontext() {
  const eintraege = await base44.entities.AktivitaetenKatalog.filter({ is_active: true });
  if (!eintraege || eintraege.length === 0) {
    return '(Kein Aktivitäten-Katalog verfügbar — nutze allgemeines Wissen über kurze Übungsformate.)';
  }

  const reihenfolge = ['Input', 'Übung', 'Abschluss'];
  const sortiert = [...eintraege].sort(
    (a, b) => reihenfolge.indexOf(a.phase) - reihenfolge.indexOf(b.phase) || (a.name || '').localeCompare(b.name || '')
  );

  return sortiert
    .map((e) => `- "${e.name}" (Phase: ${e.phase})${e.beschreibung ? `: ${e.beschreibung}` : ''}`)
    .join('\n');
}