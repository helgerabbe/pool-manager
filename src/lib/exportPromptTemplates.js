/**
 * exportPromptTemplates.js
 *
 * Deterministische Template-Engine für die Moodle-Builder-KI (MBK).
 * Reine Funktionen — keine InvokeLLM-Aufrufe, keine Credits.
 *
 * Es gibt vier Prompt-Typen, die im Tab 9 ("Moodle-Export") generiert werden:
 *   - nucleus           → Kontext-Anker einer Einheit (1× pro Einheit)
 *   - persona           → Tonalität & Lerntypen (1× pro Einheit)
 *   - sektor_anweisung  → Sektor-Reihenfolge pro Lerntyp (4× pro Einheit)
 *   - erstellungspaket  → 1× pro Lernpaket UND 1× pro AllgemeineAufgabe (Ebene 2/3)
 *
 * Halluzinations-Fallback (siehe Logbuch zur MBK-Spec):
 *   Wenn weder Aufgabenstellung noch Bild noch Materialien vorliegen,
 *   weisen wir die KI explizit an, NICHTS zu erfinden, sondern
 *   "Aufgabe noch nicht ausgearbeitet" als Platzhalter zu setzen.
 */

import { getSektorTypLabel } from '@/lib/sektorTypen';

// ── Helpers ──────────────────────────────────────────────────────────────────

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

const LERNTYP_BESCHREIBUNGEN = {
  minimalist: 'fokussiert auf das Wesentliche, kompakt, ohne Schnörkel',
  pragmatiker: 'effizient und lösungsorientiert, mit klaren Anwendungen',
  ehrgeizig: 'fordernd, mit zusätzlichen Vertiefungen und Challenges',
  passioniert: 'tiefgehend, mit Projektfokus und Forschungsanteilen',
};

function blockHeading(title) {
  return `## ${title}\n`;
}

function bulletList(items) {
  return items.filter(Boolean).map((it) => `- ${it}`).join('\n');
}

function trimMultiline(s) {
  return (s || '').toString().trim();
}

function safeText(s, fallback = '—') {
  const t = trimMultiline(s);
  return t.length > 0 ? t : fallback;
}

// ── 1. Nukleus ───────────────────────────────────────────────────────────────

/**
 * Nukleus-Prompt: Kontext-Anker für die Einheit.
 * Enthält Schul-Stammdaten + Einheit-Metadaten + Gesamtziele + Lernlandkarte.
 *
 * @param {object} args
 * @param {object} args.einheit           — Einheit-Datensatz
 * @param {object} args.stammdaten        — { land, bundesland, schulform }
 * @param {Array}  args.themenfelder      — alle Themenfelder dieser Einheit
 * @param {Array}  args.lernpakete        — alle Lernpakete dieser Einheit
 * @param {Array}  args.lernziele         — alle Lernziele zu diesen Lernpaketen
 */
export function buildNucleusPrompt({ einheit, stammdaten, themenfelder = [], lernpakete = [], lernziele = [] }) {
  const land = safeText(stammdaten?.land, '(Land nicht gesetzt)');
  const bundesland = safeText(stammdaten?.bundesland, '(Bundesland nicht gesetzt)');
  const schulform = safeText(stammdaten?.schulform, '(Schulform nicht gesetzt)');

  const fach = safeText(einheit?.fach);
  const jahrgang = safeText(einheit?.jahrgangsstufe);
  const titel = safeText(einheit?.titel_der_einheit);
  const gesamtziele = Array.isArray(einheit?.gesamtziele) ? einheit.gesamtziele : [];

  // Lernlandkarte = Themenfelder → Lernpakete → Lernziele (kompakt).
  const paketeByThemenfeld = new Map();
  for (const tf of themenfelder) paketeByThemenfeld.set(tf.id, []);
  const orphanPakete = [];
  for (const lp of lernpakete) {
    if (lp.themenfeld_id && paketeByThemenfeld.has(lp.themenfeld_id)) {
      paketeByThemenfeld.get(lp.themenfeld_id).push(lp);
    } else {
      orphanPakete.push(lp);
    }
  }
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }

  const renderPaketBlock = (lp) => {
    const ziele = (zieleByPaket.get(lp.id) || []).map((z) => `    • ${safeText(z.formulierung_fachsprache)}`);
    return [
      `  - Lernpaket: ${safeText(lp.titel_des_pakets)}`,
      ziele.length > 0 ? ziele.join('\n') : '    • (noch keine Lernziele)',
    ].join('\n');
  };

  const themenfeldBloecke = themenfelder
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
    .map((tf) => {
      const pakete = (paketeByThemenfeld.get(tf.id) || []).sort(
        (a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)
      );
      const paketLines = pakete.length > 0
        ? pakete.map(renderPaketBlock).join('\n')
        : '  - (noch keine Lernpakete)';
      return `### Themenfeld: ${safeText(tf.titel)}\n${paketLines}`;
    });

  const orphanBlock = orphanPakete.length > 0
    ? `### Lernpakete ohne Themenfeld\n${orphanPakete.map(renderPaketBlock).join('\n')}`
    : '';

  return [
    blockHeading('Kontext-Anker (Nukleus)'),
    'Du bist die Moodle-Builder-KI. Erstelle den Moodle-Kurs für folgende Unterrichtseinheit.',
    '',
    blockHeading('Schul-Stammdaten'),
    `- Land: ${land}`,
    `- Bundesland: ${bundesland}`,
    `- Schulform: ${schulform}`,
    '',
    blockHeading('Einheit'),
    `- Fach: ${fach}`,
    `- Jahrgangsstufe: ${jahrgang}`,
    `- Titel: ${titel}`,
    '',
    blockHeading('Gesamtziele'),
    gesamtziele.length > 0 ? bulletList(gesamtziele) : '- (noch keine Gesamtziele formuliert)',
    '',
    blockHeading('Lernlandkarte'),
    [...themenfeldBloecke, orphanBlock].filter(Boolean).join('\n\n') || '(noch keine Themenfelder/Lernpakete)',
  ].join('\n');
}

// ── 2. Persona ───────────────────────────────────────────────────────────────

export function buildPersonaPrompt({ einheit }) {
  const fach = safeText(einheit?.fach);
  const jahrgang = safeText(einheit?.jahrgangsstufe);

  const lerntypen = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']
    .map((k) => `- **${LERNTYP_LABELS[k]}**: ${LERNTYP_BESCHREIBUNGEN[k]}`)
    .join('\n');

  return [
    blockHeading('Persona & Tonalität'),
    `Sprich die Schülerinnen und Schüler der Jahrgangsstufe ${jahrgang} im Fach ${fach} altersgerecht an.`,
    'Verwende eine klare, freundliche und ermutigende Sprache. Keine Fachjargon-Floskeln.',
    'Erkläre Fachbegriffe beim ersten Auftreten kurz in eigenen Worten.',
    '',
    blockHeading('Lerntypen'),
    'Die Einheit existiert in vier Varianten — je nach Lerntyp anders gewichtet:',
    lerntypen,
    '',
    'Passe Tonalität, Anzahl der Aufgaben und Tiefe der Erklärungen an den jeweiligen Lerntyp an,',
    'wenn du in den Sektor-Anweisungen den entsprechenden Pfad bekommst.',
  ].join('\n');
}

// ── 3. Sektor-Anweisungen pro Lerntyp ────────────────────────────────────────

/**
 * Sektor-Anweisungen für einen Lerntyp.
 * Reihenfolge und semantischer Typ stammen aus einheit.lernpfade_konfiguration[lerntyp].
 *
 * @param {object} args
 * @param {object} args.einheit
 * @param {string} args.lerntyp           — 'minimalist'|'pragmatiker'|'ehrgeizig'|'passioniert'
 * @param {Array}  args.themenfelder      — für Arbeitsphase-Titel-Auflösung
 */
export function buildSektorPrompt({ einheit, lerntyp, themenfelder = [] }) {
  const label = LERNTYP_LABELS[lerntyp] || lerntyp;
  const beschreibung = LERNTYP_BESCHREIBUNGEN[lerntyp] || '';
  const sektoren = einheit?.lernpfade_konfiguration?.[lerntyp] || [];

  const tfTitel = new Map(themenfelder.map((tf) => [tf.id, tf.titel]));

  const sektorLines = sektoren.map((s, idx) => {
    const typLabel = getSektorTypLabel(s.sektor_typ);
    let titel = s.titel || typLabel;
    if (s.sektor_typ === 'arbeitsphase_themenfeld') {
      const tf = s.titel_snapshot || tfTitel.get(s.themenfeld_id) || s.titel;
      titel = `Arbeitsphase · ${tf || '(Themenfeld unbenannt)'}`;
    }
    const itemCount = Array.isArray(s.items) ? s.items.length : 0;
    return `${idx + 1}. **${titel}** _(Typ: ${typLabel}, ${itemCount} Element${itemCount === 1 ? '' : 'e'})_`;
  });

  return [
    blockHeading(`Sektor-Anweisungen für Lerntyp „${label}"`),
    `Tonalität: ${beschreibung}.`,
    '',
    blockHeading('Reihenfolge der Sektoren'),
    sektorLines.length > 0 ? sektorLines.join('\n') : '(noch keine Sektoren konfiguriert)',
    '',
    'Erstelle die Moodle-Kursstruktur in genau dieser Reihenfolge.',
    'Detaillierte Inhalte zu den einzelnen Lernpaketen und Aufgaben folgen separat als „Erstellungspakete".',
  ].join('\n');
}

// ── 4. Erstellungspakete (pro Lernpaket / pro AllgemeineAufgabe) ────────────

/**
 * Sammelt alle URLs aus aufgaben_bild_url + materialien[*].url.
 * book_ref ohne URL wird als textueller Hinweis erfasst (separate Liste).
 */
function collectAufgabeMaterials(aufgabe) {
  const urls = [];
  const textHinweise = [];
  if (aufgabe?.aufgaben_bild_url) urls.push({ url: aufgabe.aufgaben_bild_url, label: 'Aufgabenbild' });
  for (const m of (aufgabe?.materialien || [])) {
    if (m?.url) {
      urls.push({ url: m.url, label: m.label || m.type });
    } else if (m?.type === 'book_ref' && m?.content) {
      textHinweise.push(`Buchverweis: ${m.content}`);
    } else if (m?.type === 'free_text' && m?.content) {
      textHinweise.push(m.content);
    }
  }
  return { urls, textHinweise };
}

function hasAufgabeContent(aufgabe) {
  const hasText = !!trimMultiline(aufgabe?.aufgabenstellung);
  const hasImage = !!aufgabe?.aufgaben_bild_url;
  const hasMaterials = Array.isArray(aufgabe?.materialien) && aufgabe.materialien.some(
    (m) => m?.url || m?.content
  );
  return hasText || hasImage || hasMaterials;
}

/**
 * Erstellungspaket für eine AllgemeineAufgabe (Ebene 2 oder Ebene 3).
 *
 * @param {object} args
 * @param {object} args.aufgabe
 */
export function buildErstellungspaketForAufgabe({ aufgabe }) {
  const titel = safeText(aufgabe?.titel, '(ohne Titel)');
  const ebene = safeText(aufgabe?.anforderungsebene);
  const typ = safeText(aufgabe?.aufgaben_typ);
  const hasContent = hasAufgabeContent(aufgabe);

  const header = [
    blockHeading('Erstellungspaket: AllgemeineAufgabe'),
    `- Titel: ${titel}`,
    `- Anforderungsebene: ${ebene}`,
    `- Aufgaben-Typ: ${typ}`,
    `- Quelle-ID: ${aufgabe?.id || '(unbekannt)'}`,
    '',
  ].join('\n');

  if (!hasContent) {
    return [
      header,
      blockHeading('Inhaltsstand'),
      '⚠️ Diese Aufgabe ist noch nicht ausgearbeitet — es liegen weder Aufgabenstellung noch Bild noch Materialien vor.',
      '',
      '**Anweisung an die KI:** Erfinde KEINE Aufgabenstellung. Setze stattdessen den Platzhalter-Text:',
      '',
      '> _„Aufgabe noch nicht ausgearbeitet — bitte später ergänzen."_',
      '',
      'Lasse die Aufgabe ansonsten leer.',
    ].join('\n');
  }

  const { urls, textHinweise } = collectAufgabeMaterials(aufgabe);
  const aufgabentext = trimMultiline(aufgabe?.aufgabenstellung);
  const erwartung = trimMultiline(aufgabe?.erwartungshorizont);
  const muster = trimMultiline(aufgabe?.musterloesung);

  const sections = [header];

  sections.push(blockHeading('Aufgabenstellung'));
  sections.push(aufgabentext || '(keine Textstellung — Inhalt liegt nur als Bild/Material vor)');
  sections.push('');

  if (urls.length > 0) {
    sections.push(blockHeading('Materialien (URLs zum internen Medienserver)'));
    sections.push(urls.map((u) => `- [${u.label}] ${u.url}`).join('\n'));
    sections.push('');
  }
  if (textHinweise.length > 0) {
    sections.push(blockHeading('Material-Hinweise (Buchverweise / Freitext)'));
    sections.push(bulletList(textHinweise));
    sections.push('');
  }
  if (erwartung) {
    sections.push(blockHeading('Erwartungshorizont'));
    sections.push(erwartung);
    sections.push('');
  }
  if (muster) {
    sections.push(blockHeading('Musterlösung'));
    sections.push(muster);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Erstellungspaket für ein Lernpaket (Ebene 1).
 *
 * @param {object} args
 * @param {object} args.lernpaket
 * @param {Array}  args.lernziele       — gefiltert auf dieses Lernpaket
 * @param {Array}  args.aufgaben        — Aufgabenbausteine dieses Lernpakets
 */
export function buildErstellungspaketForLernpaket({ lernpaket, lernziele = [], aufgaben = [] }) {
  const titel = safeText(lernpaket?.titel_des_pakets, '(ohne Titel)');
  const dauer = lernpaket?.geschaetzte_dauer_minuten;

  const header = [
    blockHeading('Erstellungspaket: Lernpaket (Ebene 1)'),
    `- Titel: ${titel}`,
    dauer ? `- Geschätzte Dauer: ${dauer} Minuten` : null,
    `- Quelle-ID: ${lernpaket?.id || '(unbekannt)'}`,
    '',
  ].filter(Boolean).join('\n');

  const zielLines = lernziele.map((lz) => `- ${safeText(lz.formulierung_fachsprache)}`);
  const aufgabenLines = aufgaben.map((a, idx) => {
    const text = trimMultiline(a.aufgabentext_inhalt) || '(kein Aufgabentext)';
    return `### Baustein ${idx + 1}: ${safeText(a.baustein_typ)}\n${text}`;
  });

  return [
    header,
    blockHeading('Lernziele'),
    zielLines.length > 0 ? zielLines.join('\n') : '- (keine Lernziele)',
    '',
    blockHeading('Aufgabenbausteine'),
    aufgabenLines.length > 0 ? aufgabenLines.join('\n\n') : '(keine Aufgabenbausteine)',
  ].join('\n');
}