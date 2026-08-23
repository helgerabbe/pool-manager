/**
 * docsSuche.js
 *
 * Leichtgewichtige, lokale Kapitel-Suche für den Doku-Assistenten.
 *
 * Warum keine Vektor-Suche / kein zweiter KI-Aufruf?
 * Die Dokumentation ist überschaubar (rund 20 Kapitel) und die Fragen der
 * Lehrkräfte enthalten fast immer die Fachbegriffe der App („Lernpaket",
 * „Freigabe", „Export"). Eine einfache Begriffs-Gewichtung findet damit
 * zuverlässig die richtigen Kapitel — ohne Zusatzkosten und ohne Wartezeit.
 * Die so gefundenen Kapitel werden dem KI-Assistenten im VOLLTEXT übergeben,
 * damit er präzise antworten kann statt zu raten.
 */

import { DOC_GROUPS, DOC_NAV, getDocContent } from '@/lib/docsContent';

// Häufige Füllwörter, die für die Kapitel-Auswahl keinen Wert haben.
const STOPWORTE = new Set([
  'und', 'oder', 'aber', 'wie', 'was', 'wo', 'wer', 'wann', 'warum', 'wieso',
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem',
  'ich', 'du', 'wir', 'sie', 'man', 'mir', 'mich', 'es', 'im', 'in', 'am',
  'an', 'auf', 'für', 'mit', 'von', 'zu', 'zum', 'zur', 'bei', 'nach', 'aus',
  'ist', 'sind', 'kann', 'muss', 'soll', 'will', 'habe', 'hat', 'noch',
  'mal', 'nochmal', 'denn', 'dann', 'auch', 'nicht', 'mehr', 'schon', 'sich',
  'geht', 'gibt', 'machen', 'mache', 'bitte', 'wenn', 'dass', 'als', 'so',
]);

/** Zerlegt einen Text in gewichtbare Begriffe (kleingeschrieben, ohne Stoppwörter). */
function begriffe(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORTE.has(w));
}

/** Alle Kapitel als {slug, label, gruppe, inhalt}. */
function alleKapitel() {
  const gruppeBySlug = new Map();
  DOC_GROUPS.forEach((g) => g.items.forEach((i) => gruppeBySlug.set(i.slug, g.label)));
  return DOC_NAV.map((item) => ({
    slug: item.slug,
    label: item.label,
    gruppe: gruppeBySlug.get(item.slug) || '',
    inhalt: getDocContent(item.slug),
  }));
}

/**
 * Kompaktes Inhaltsverzeichnis für den Prompt — damit der Assistent auch
 * Kapitel benennen kann, deren Volltext nicht mitgeschickt wurde.
 */
export function inhaltsverzeichnisText() {
  return DOC_GROUPS.map(
    (g) => `${g.label}:\n${g.items.map((i) => `  - ${i.label} (slug: ${i.slug})`).join('\n')}`
  ).join('\n');
}

/**
 * Findet die inhaltlich passendsten Kapitel zu einer Frage.
 * Titel-Treffer wiegen deutlich schwerer als Fundstellen im Text.
 */
export function findeRelevanteKapitel(frage, anzahl = 4) {
  const suchbegriffe = [...new Set(begriffe(frage))];
  const kapitel = alleKapitel();
  if (suchbegriffe.length === 0) return kapitel.slice(0, anzahl);

  const bewertet = kapitel.map((k) => {
    const titel = `${k.label} ${k.gruppe}`.toLowerCase();
    const inhalt = k.inhalt.toLowerCase();
    let score = 0;
    for (const begriff of suchbegriffe) {
      if (titel.includes(begriff)) score += 10;
      // Treffer im Text zählen, aber gedeckelt — ein langes Kapitel soll
      // nicht allein durch seine Länge gewinnen.
      const treffer = inhalt.split(begriff).length - 1;
      score += Math.min(treffer, 8);
    }
    return { ...k, score };
  });

  const passend = bewertet.filter((k) => k.score > 0).sort((a, b) => b.score - a.score);
  // Nichts gefunden? Dann liefern wir die Grundlagen-Kapitel als Einstieg.
  return (passend.length > 0 ? passend : kapitel).slice(0, anzahl);
}