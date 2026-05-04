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
import { formatMissionLabel } from '@/lib/missionen';

/**
 * Versionskennung der Template-Engine.
 *
 * Wird beim Generieren in jeden ExportPrompts-Record als `template_version`
 * geschrieben. Der Out-of-Sync-Check vergleicht diese Version zusätzlich zur
 * `source_updated_at`, sodass Wording-/Reihenfolge-Änderungen in dieser Datei
 * automatisch alle Prompts als "veraltet" markieren — auch wenn die
 * Quelldaten unverändert geblieben sind.
 *
 * **Wichtig:** Bei jeder inhaltlichen Änderung an den Build-Funktionen
 * unten (Headings, Pflichtsätze, Reihenfolge, Halluzinations-Fallback)
 * MUSS diese Version hochgezählt werden.
 */
export const MBK_TEMPLATE_VERSION = 'v1.3.0';

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
 * Pro Lerntyp: konkrete Bearbeitungs-Pädagogik. Sagt der MBK explizit, wie
 * dasselbe Lernpaket je nach Lerntyp anders durchlaufen werden soll —
 * weniger/mehr Aufgaben, andere Tonalität, andere Pflicht-/Kürtfelder.
 *
 * Diese Texte sind die zweite Hälfte der "Persona": die erste Hälfte (Tonalität)
 * steht im Persona-Prompt, hier kommt die didaktische Bearbeitungsregel pro
 * Sektor-Lauf dazu.
 */
const LERNTYP_BEARBEITUNGSREGEL = {
  minimalist: [
    'Konzentriere dich auf den Pflichtkern jedes Lernpakets: nur die zentralen Lernziele und die Aufgaben mit Schwierigkeitsgrad 1.',
    'Aufgaben mit Schwierigkeitsgrad 2 oder 3 werden weggelassen, ebenso optionale Vertiefungs-Aktivitäten in der Phase „Abschluss".',
    'Brian-Dialoge und ausführliche Erklärtexte werden auf das Nötigste gekürzt; keine zusätzlichen Beispiele erfinden.',
    'In Arbeitsphasen mit Bündel-Aufgaben (X-von-Y) wird nur die Mindestanzahl angeboten.',
  ],
  pragmatiker: [
    'Vollständige Bearbeitung aller Pflichtinhalte des Lernpakets. Aufgaben mit Schwierigkeitsgrad 1 + 2 sind enthalten, Schwierigkeitsgrad 3 nur, wenn sie didaktisch zwingend sind.',
    'Stil: kurz, lösungsorientiert, mit klaren Anwendungs-Beispielen. Keine theoretischen Exkurse.',
    'Brian-Dialoge werden nur dort eingesetzt, wo die Aufgabe explizit einen Tutor-Dialog vorsieht.',
    'Bei Bündel-Aufgaben werden alle als Pflicht markierten Items übernommen.',
  ],
  ehrgeizig: [
    'Vollständige Bearbeitung aller Aufgaben (Schwierigkeitsgrade 1, 2 und 3). Zusätzliche Knobel-/Vertiefungsaufgaben in der Phase „Abschluss" werden bevorzugt eingebaut.',
    'Stil: anspruchsvoll, fordernd, mit Verknüpfungen zu weiterführenden Themen.',
    'Brian-Dialoge werden vollständig konfiguriert (Tutor-Persona, Erwartungshorizont, Abbruchbedingung) — Brian fordert hier aktiv heraus statt nur zu erklären.',
    'Bei Bündel-Aufgaben werden alle Items angeboten; die Reihenfolge bleibt sequenziell, falls so konfiguriert.',
  ],
  passioniert: [
    'Vollständige Bearbeitung aller Aufgaben + alle als „Mission Kreativität" markierten Aktivitäten werden ausgebaut.',
    'Stil: tiefgehend, vernetzt, mit Querbezügen zu Alltag, Forschung oder anderen Fächern. Erklärtexte ausführlich.',
    'Brian-Dialoge werden zu echten Sokratischen Dialogen ausgebaut — Brian stellt Rückfragen, fordert Begründungen, bietet Alternativwege.',
    'Bei Bündel-Aufgaben werden alle Items angeboten; zusätzlich werden — wo vorhanden — Projekt-Anker-Aufgaben (Ebene 3) prominent verlinkt.',
  ],
};

/**
 * Erzeugt für ein einzelnes Sektor-Item eine Markdown-Zeile mit Titel,
 * Element-Typ und Quell-ID. Die Quell-ID ist für die MBK essenziell, damit
 * sie das passende Erstellungspaket finden kann (das Erstellungspaket wird
 * mit derselben ID referenziert — siehe `buildErstellungspaketFor*`).
 */
function renderSektorItem(item, idx, indent, ctx) {
  const { lernpaketById, aufgabeById, systemBausteinById } = ctx;
  const refId = item?.ref_id || '(unbekannt)';
  let bezeichnung = '(unbekanntes Element)';
  let elementTyp = item?.type || 'unbekannt';
  let extra = '';

  if (item?.type === 'system') {
    const sb = systemBausteinById.get(refId);
    bezeichnung = sb?.titel || `System-Baustein ${refId}`;
    elementTyp = 'System-Baustein';
    if (sb?.baustein_modus === 'bundle_1ton') {
      const cfg = item?.bundle_config || {};
      const teile = [];
      if (cfg.erforderliche_anzahl) teile.push(`${cfg.erforderliche_anzahl} von n erforderlich`);
      if (cfg.modus) teile.push(`Bearbeitung: ${cfg.modus}`);
      if (teile.length > 0) extra = ` _(${teile.join(', ')})_`;
    }
  } else {
    // Reguläre Aufgabe: kann Lernpaket-Bündel (AllgemeineAufgabe.aufgaben_typ='buendel'),
    // Inhalts-/Handlungs-/Prozess-Aufgabe oder Projekt-Anker sein.
    const aufgabe = aufgabeById.get(refId);
    if (aufgabe) {
      bezeichnung = aufgabe.titel || '(Aufgabe ohne Titel)';
      const ebene = aufgabe.anforderungsebene ? ` · ${aufgabe.anforderungsebene}` : '';
      elementTyp = `Aufgabe (${aufgabe.aufgaben_typ || 'inhalt'}${ebene})`;
      // Wenn die Aufgabe ein Lernpaket-Bündel ist, listen wir die enthaltenen
      // Lernpaket-IDs mit, damit die KI die zugehörigen Erstellungspakete findet.
      if (aufgabe.aufgaben_typ === 'buendel' && Array.isArray(aufgabe.verlinkte_lernpaket_ids)) {
        const ids = aufgabe.verlinkte_lernpaket_ids;
        if (ids.length > 0) {
          const lpRefs = ids.map((lpId) => {
            const lp = lernpaketById.get(lpId);
            return lp ? `${lp.titel_des_pakets || '(ohne Titel)'} [${lpId}]` : `[${lpId}]`;
          });
          extra = `\n${indent}    → enthält Lernpakete: ${lpRefs.join('; ')}`;
        }
      } else if (aufgabe.aufgaben_typ === 'auswahl_buendel' && Array.isArray(aufgabe.verlinkte_aufgaben_ids)) {
        const ids = aufgabe.verlinkte_aufgaben_ids;
        if (ids.length > 0) {
          extra = `\n${indent}    → Auswahl-Bündel über Aufgaben: ${ids.join(', ')}` +
            (aufgabe.erforderliche_anzahl ? ` (${aufgabe.erforderliche_anzahl} von ${ids.length} erforderlich)` : '');
        }
      } else if (aufgabe.aufgaben_typ === 'projekt_anker' && Array.isArray(aufgabe.verlinkte_projekt_ids)) {
        const ids = aufgabe.verlinkte_projekt_ids;
        if (ids.length > 0) {
          extra = `\n${indent}    → Projekte: ${ids.join(', ')}`;
        }
      }
    }
  }

  return `${indent}${idx + 1}. **${bezeichnung}** _(${elementTyp}, Quell-ID: ${refId})_${extra}`;
}

/**
 * Sektor-Anweisungen für einen Lerntyp.
 *
 * Pro Sektor wird ausgegeben:
 *   - Titel + semantischer Typ
 *   - Themenfeld-ID (bei Arbeitsphasen)
 *   - vollständige Item-Liste mit Quell-IDs und Bündel-Hierarchie
 *
 * Dazu kommt eine lerntyp-spezifische Bearbeitungsregel
 * (siehe LERNTYP_BEARBEITUNGSREGEL), damit die MBK das gleiche Lernpaket
 * für Minimalist, Pragmatiker, Ehrgeizig und Passioniert unterschiedlich
 * ausarbeitet.
 *
 * @param {object} args
 * @param {object} args.einheit
 * @param {string} args.lerntyp                 — 'minimalist'|'pragmatiker'|'ehrgeizig'|'passioniert'
 * @param {Array}  args.themenfelder            — für Arbeitsphase-Titel-Auflösung
 * @param {Array}  args.lernpakete              — alle Lernpakete der Einheit (für Bündel-Verlinkungen)
 * @param {Array}  args.allgemeineAufgaben      — alle AllgemeineAufgabe-Records der Einheit
 * @param {Array}  args.systemBausteine         — alle SystemBausteine (für System-Item-Titel)
 */
export function buildSektorPrompt({
  einheit,
  lerntyp,
  themenfelder = [],
  lernpakete = [],
  allgemeineAufgaben = [],
  systemBausteine = [],
}) {
  const label = LERNTYP_LABELS[lerntyp] || lerntyp;
  const beschreibung = LERNTYP_BESCHREIBUNGEN[lerntyp] || '';
  const sektoren = einheit?.lernpfade_konfiguration?.[lerntyp] || [];

  const tfTitel = new Map(themenfelder.map((tf) => [tf.id, tf.titel]));
  const lernpaketById = new Map(lernpakete.map((lp) => [lp.id, lp]));
  const aufgabeById = new Map(allgemeineAufgaben.map((a) => [a.id, a]));
  const systemBausteinById = new Map(systemBausteine.map((sb) => [sb.baustein_id, sb]));
  const ctx = { lernpaketById, aufgabeById, systemBausteinById };

  const sektorBloecke = sektoren.map((s, idx) => {
    const typLabel = getSektorTypLabel(s.sektor_typ);
    let titel = s.titel || typLabel;
    if (s.sektor_typ === 'arbeitsphase_themenfeld') {
      const tf = s.titel_snapshot || tfTitel.get(s.themenfeld_id) || s.titel;
      titel = `Arbeitsphase · ${tf || '(Themenfeld unbenannt)'}`;
    }

    const items = Array.isArray(s.items) ? s.items : [];
    const headerLine = `### Sektor ${idx + 1}: ${titel}`;
    const metaLines = [
      `- Typ: ${typLabel}`,
      s.sektor_typ === 'arbeitsphase_themenfeld' && s.themenfeld_id
        ? `- Themenfeld-ID: ${s.themenfeld_id}`
        : null,
      `- Anzahl Elemente: ${items.length}`,
    ].filter(Boolean);

    // Items hierarchisch rendern: Root-Items + ihre Children (max. 1 Ebene Bündel).
    const rootItems = items.filter((it) => !it?.parent_instance_id);
    const childrenByParent = new Map();
    for (const it of items) {
      if (it?.parent_instance_id) {
        if (!childrenByParent.has(it.parent_instance_id)) childrenByParent.set(it.parent_instance_id, []);
        childrenByParent.get(it.parent_instance_id).push(it);
      }
    }

    const itemLines = [];
    rootItems.forEach((root, rIdx) => {
      itemLines.push(renderSektorItem(root, rIdx, '', ctx));
      const children = childrenByParent.get(root.instance_id) || [];
      children.forEach((child, cIdx) => {
        itemLines.push(renderSektorItem(child, cIdx, '    ', ctx));
      });
    });

    return [
      headerLine,
      metaLines.join('\n'),
      '',
      itemLines.length > 0 ? itemLines.join('\n') : '_(keine Elemente in diesem Sektor)_',
    ].join('\n');
  });

  const bearbeitungsRegel = LERNTYP_BEARBEITUNGSREGEL[lerntyp] || [];

  return [
    blockHeading(`Sektor-Anweisungen für Lerntyp „${label}"`),
    `Tonalität: ${beschreibung}.`,
    '',
    blockHeading('Bearbeitungsregel für diesen Lerntyp'),
    bearbeitungsRegel.length > 0
      ? bearbeitungsRegel.map((r) => `- ${r}`).join('\n')
      : '(keine speziellen Bearbeitungsregeln definiert)',
    '',
    blockHeading('Reihenfolge und Inhalte der Sektoren'),
    sektorBloecke.length > 0 ? sektorBloecke.join('\n\n') : '(noch keine Sektoren konfiguriert)',
    '',
    blockHeading('Anweisung an die Moodle-Builder-KI'),
    '- Erstelle die Moodle-Kursstruktur in genau der oben angegebenen Reihenfolge der Sektoren.',
    '- Verwende die oben gelisteten Quell-IDs, um die jeweils passenden „Erstellungspakete" zuzuordnen — die ID im Erstellungspaket-Header (Quelle-ID) entspricht 1:1 der hier genannten Quell-ID.',
    `- Wende die oben definierte Bearbeitungsregel für „${label}" auf JEDES Lernpaket und JEDE Aufgabe an, sodass dasselbe Lernpaket für unterschiedliche Lerntypen unterschiedlich aufbereitet wird.`,
    '- Bei Bündel-Aufgaben (Lernpaket-Bündel oder Auswahl-Bündel) folge der dort angegebenen Bearbeitungs-Anweisung (Reihenfolge, X-von-Y).',
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

// Mapping der internen output_formats-Slugs auf lesbare Labels für die KI.
// Quelle: components/projektaufgaben/AbgabeDefinitionSection. Unbekannte
// Slugs werden 1:1 durchgereicht, damit eigene Werte der Lehrkraft erhalten
// bleiben.
const OUTPUT_FORMAT_LABELS = {
  presentation: 'Präsentation',
  document: 'Schriftliches Dokument',
  timeline: 'Zeitstrahl',
  poster: 'Poster',
  video: 'Video',
  podcast: 'Podcast / Audio',
  website: 'Website',
  model: 'Modell / Objekt',
  experiment: 'Experiment / Demonstration',
  performance: 'Aufführung / Performance',
};

function formatOutputFormat(slug) {
  return OUTPUT_FORMAT_LABELS[slug] || slug;
}

/**
 * Erstellungspaket für eine AllgemeineAufgabe (Ebene 2 oder Ebene 3).
 *
 * Rendert alle didaktisch relevanten Felder, sofern gesetzt:
 *   - Mission (nur Ebene 1/2 mit aufgaben_typ inhalt|handlung)
 *   - Schwierigkeitsgrad (1–3)
 *   - Aufgabenstellung + Bild + Materialien
 *   - Ebene-3-spezifisch: aufgabentyp_projekt, ergebnis_form,
 *     ergebnis_dateiformat, output_formats, custom_format, quality_focus,
 *     rubric_criteria
 *   - Erwartungshorizont, Musterlösung
 *   - Brian-Dialog (sofern konfiguriert)
 *
 * Hinweise zum Mapping:
 *   Im Datenmodell speichern wir output_formats als Slug-Array (z. B.
 *   ['presentation','timeline']). Für die MBK übersetzen wir die Slugs in
 *   lesbare Labels — Slugs sind interne Sache und für die KI nicht hilfreich.
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
    aufgabe?.aufgabentyp_projekt ? `- Projekt-Variante: ${safeText(aufgabe.aufgabentyp_projekt)}` : null,
    aufgabe?.mission_type ? `- Mission: ${formatMissionLabel(aufgabe.mission_type)}` : null,
    aufgabe?.schwierigkeitsgrad ? `- Schwierigkeitsgrad: ${aufgabe.schwierigkeitsgrad} / 3` : null,
    `- Quelle-ID: ${aufgabe?.id || '(unbekannt)'}`,
    '',
  ].filter(Boolean).join('\n');

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
  const hinweiseMaterial = trimMultiline(aufgabe?.hinweise_zum_material);
  const qualityFocus = trimMultiline(aufgabe?.quality_focus);
  const customFormat = trimMultiline(aufgabe?.custom_format);
  const ergebnisForm = trimMultiline(aufgabe?.ergebnis_form);
  const ergebnisDateiformat = trimMultiline(aufgabe?.ergebnis_dateiformat);
  const outputFormats = Array.isArray(aufgabe?.output_formats) ? aufgabe.output_formats.filter(Boolean) : [];
  const rubricCriteria = Array.isArray(aufgabe?.rubric_criteria)
    ? aufgabe.rubric_criteria.filter((r) => r && (r.title || r.criteria_text || r.points != null))
    : [];

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
  if (hinweiseMaterial) {
    sections.push(blockHeading('Hinweise zum physischen Material'));
    sections.push(hinweiseMaterial);
    sections.push('');
  }

  // Abgabe-Spezifikation (überwiegend Ebene 3, aber auch Ebene 2 möglich).
  const hatAbgabeBlock =
    ergebnisForm || ergebnisDateiformat || outputFormats.length > 0 || customFormat;
  if (hatAbgabeBlock) {
    sections.push(blockHeading('Abgabeformat'));
    if (ergebnisForm) sections.push(`- Ergebnis-Form: ${ergebnisForm}`);
    if (ergebnisDateiformat) sections.push(`- Dateiformat: ${ergebnisDateiformat}`);
    if (outputFormats.length > 0) {
      sections.push(`- Erlaubte Abgabeformen: ${outputFormats.map(formatOutputFormat).join(', ')}`);
    }
    if (customFormat) sections.push(`- Eigenes Format: ${customFormat}`);
    sections.push('');
  }

  if (qualityFocus) {
    sections.push(blockHeading('Bewertungsschwerpunkt'));
    sections.push(qualityFocus);
    sections.push('');
  }

  if (rubricCriteria.length > 0) {
    sections.push(blockHeading('Bewertungskriterien (Rubrik)'));
    const lines = rubricCriteria.map((r, idx) => {
      const titleLine = `${idx + 1}. **${safeText(r.title, '(ohne Titel)')}**` +
        (r.points != null ? ` _(${r.points} Punkte)_` : '');
      const desc = trimMultiline(r.criteria_text);
      return desc ? `${titleLine}\n   ${desc}` : titleLine;
    });
    sections.push(lines.join('\n'));
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

  // Brian-Dialog (KI-Tutor-Anweisung) — nur wenn konfiguriert.
  const brianName = trimMultiline(aufgabe?.brian_dialog_name);
  const brianLearner = trimMultiline(aufgabe?.brian_learner_instruction);
  const brianSystem = trimMultiline(aufgabe?.brian_system_instruction);
  const brianCompletion = trimMultiline(aufgabe?.brian_completion_rule);
  const hatBrian = brianName || brianLearner || brianSystem || brianCompletion;
  if (hatBrian) {
    sections.push(blockHeading('Brian-Dialog (KI-Tutor)'));
    if (brianName) sections.push(`- Dialog-Name: ${brianName}`);
    if (brianLearner) {
      sections.push('- Anweisung für Lernende:');
      sections.push(brianLearner);
    }
    if (brianSystem) {
      sections.push('- System-Anweisung / Tutor-Persona:');
      sections.push(brianSystem);
    }
    if (brianCompletion) {
      sections.push('- Abbruchbedingung:');
      sections.push(brianCompletion);
    }
    sections.push('');
  }

  return sections.join('\n');
}

// Reihenfolge der Phasen im Erstellungspaket. Identisch zum UI in Tab 4.
const PHASEN_REIHENFOLGE = ['Input', 'Übung', 'Abschluss'];

/**
 * Rendert eine einzelne LernpaketPhaseAktivitaet inkl. ihrer field_values
 * als Markdown-Block. Die field_values sind das eigentliche „Inhaltliche"
 * (URL, Text, Begriffspaare, Anweisungstext, …) — wir geben sie als
 * Key-Value-Liste aus, damit die MBK alle Felder unverändert sieht.
 */
function renderPhaseAktivitaet(pa, idx, katalogById) {
  const katalog = katalogById?.get(pa?.aktivitaet_id) || null;
  const name = safeText(katalog?.name, '(unbekannte Aktivität)');
  const lines = [`### Aktivität ${idx + 1}: ${name}`];

  const fv = pa?.field_values && typeof pa.field_values === 'object' ? pa.field_values : {};
  const fieldEntries = Object.entries(fv).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  if (fieldEntries.length === 0) {
    lines.push('_(noch keine Inhalte konfiguriert)_');
  } else {
    for (const [key, value] of fieldEntries) {
      // Label aus dem Katalog-form_schema, falls vorhanden — sonst field_name.
      const fieldDef = (katalog?.form_schema || []).find((f) => f.field_name === key);
      const label = fieldDef?.label || key;
      let rendered;
      if (typeof value === 'string') {
        rendered = value.includes('\n') ? `\n${value}` : value;
      } else {
        rendered = `\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
      }
      lines.push(`- **${label}:** ${rendered}`);
    }
  }
  return lines.join('\n');
}

/**
 * Erstellungspaket für ein Lernpaket (Ebene 1).
 *
 * Inhaltliche Quelle für die Aufgabenbausteine sind die `LernpaketPhaseAktivitaet`-
 * Records (gegliedert nach Phase Input → Übung → Abschluss). Für die Aktivitäts-
 * Namen wird der `AktivitaetenKatalog` über `katalogById` aufgelöst.
 *
 * Der frühere Parameter `aufgaben` (Legacy-Entity `Aufgabenbausteine`) wird
 * nur noch als Fallback gerendert, wenn keine Phase-Aktivitäten existieren.
 *
 * @param {object} args
 * @param {object} args.lernpaket
 * @param {Array}  args.lernziele         — gefiltert auf dieses Lernpaket
 * @param {Array}  args.phaseAktivitaeten — LernpaketPhaseAktivitaet[] dieses Pakets
 * @param {Map}    args.katalogById       — Map<aktivitaet_id, AktivitaetenKatalog-Record>
 * @param {Array}  args.aufgaben          — (Legacy) Aufgabenbausteine, optional
 */
export function buildErstellungspaketForLernpaket({
  lernpaket,
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById,
  aufgaben = [],
}) {
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

  // Phasen-Bausteine aus LernpaketPhaseAktivitaet aufbauen.
  const sections = [
    header,
    blockHeading('Lernziele'),
    zielLines.length > 0 ? zielLines.join('\n') : '- (keine Lernziele)',
    '',
    blockHeading('Aufgabenbausteine'),
  ];

  const phasenMap = new Map(PHASEN_REIHENFOLGE.map((p) => [p, []]));
  for (const pa of phaseAktivitaeten || []) {
    if (!phasenMap.has(pa?.phase)) continue;
    phasenMap.get(pa.phase).push(pa);
  }
  // Innerhalb der Phase: stabile Reihenfolge.
  for (const arr of phasenMap.values()) {
    arr.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
  }

  const totalPhasenItems = Array.from(phasenMap.values()).reduce((acc, arr) => acc + arr.length, 0);

  if (totalPhasenItems > 0) {
    for (const phaseName of PHASEN_REIHENFOLGE) {
      const items = phasenMap.get(phaseName) || [];
      sections.push('');
      sections.push(`#### Phase: ${phaseName}`);
      if (items.length === 0) {
        sections.push('_(keine Aktivitäten in dieser Phase)_');
        continue;
      }
      const rendered = items.map((pa, idx) => renderPhaseAktivitaet(pa, idx, katalogById));
      sections.push(rendered.join('\n\n'));
    }
  } else if (Array.isArray(aufgaben) && aufgaben.length > 0) {
    // Legacy-Fallback (alte Aufgabenbausteine-Entity).
    const aufgabenLines = aufgaben.map((a, idx) => {
      const text = trimMultiline(a.aufgabentext_inhalt) || '(kein Aufgabentext)';
      return `### Baustein ${idx + 1}: ${safeText(a.baustein_typ)}\n${text}`;
    });
    sections.push(aufgabenLines.join('\n\n'));
  } else {
    sections.push('(keine Aufgabenbausteine)');
  }

  return sections.join('\n');
}