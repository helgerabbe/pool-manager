import { base44 } from '@/api/base44Client';

/**
 * Baut den Aufgabenformat-Kontext für die KI-Assistenten (Aufgaben-Assistent,
 * Integrations-Assistent) aus ZWEI Quellen:
 *
 * 1. Aktivitäten-Katalog: die Standard-Formate der App (Miniquiz, Begriffe
 *    zuordnen, Lückentext, ...).
 * 2. Aufgabengalerie: externe, kreative Formate aus dem GitHub-Manifest
 *    (z. B. Wortnetz, Mindmap), die über die Aktivität „Aktivitätengalerie"
 *    in ein Lernpaket eingebunden werden.
 *
 * So empfiehlt die KI nur real existierende Formate — inklusive der
 * schuleigenen pädagogischen Beschreibungen.
 */

async function ladeKatalogListe() {
  const eintraege = await base44.entities.AktivitaetenKatalog.filter({ is_active: true });
  if (!eintraege || eintraege.length === 0) {
    return '(Kein Aktivitäten-Katalog verfügbar.)';
  }
  const reihenfolge = ['Input', 'Übung', 'Abschluss'];
  const sortiert = [...eintraege].sort(
    (a, b) => reihenfolge.indexOf(a.phase) - reihenfolge.indexOf(b.phase) || (a.name || '').localeCompare(b.name || '')
  );
  return sortiert
    .map((e) => `- "${e.name}" (Phase: ${e.phase})${e.beschreibung ? `: ${e.beschreibung}` : ''}`)
    .join('\n');
}

async function ladeGalerieListe() {
  // Boundary zu externem System (GitHub-Manifest): Wenn der Connector nicht
  // konfiguriert oder das Repo nicht erreichbar ist, darf der Assistent
  // trotzdem funktionieren — dann nur mit den Standard-Formaten.
  try {
    const res = await base44.functions.invoke('getAktivitaetenGalerie', { mode: 'list' });
    const alle = res?.data?.aktivitaeten;
    if (!Array.isArray(alle)) return null;
    const sichtbar = alle.filter((a) => a.galerie_sichtbar === true);
    if (sichtbar.length === 0) return null;
    return sichtbar
      .map((a) => `- "${a.name}"${a.kategorie ? ` (Kategorie: ${a.kategorie})` : ''}${a.kurzbeschreibung ? `: ${a.kurzbeschreibung}` : ''}`)
      .join('\n');
  } catch {
    return null;
  }
}

export async function holeAktivitaetenKatalogKontext() {
  const [katalogListe, galerieListe] = await Promise.all([ladeKatalogListe(), ladeGalerieListe()]);

  let kontext = `STANDARD-FORMATE (Aktivitäten-Katalog der App):\n${katalogListe}`;
  if (galerieListe) {
    kontext += `\n\nZUSÄTZLICHE FORMATE AUS DER AUFGABENGALERIE (externe, kreative Aktivitäten — ebenfalls frei wählbar; sie werden über die Aktivität „Aktivitätengalerie" in ein Lernpaket eingebunden):\n${galerieListe}`;
  }
  return kontext;
}