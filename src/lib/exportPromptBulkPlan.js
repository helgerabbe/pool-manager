/**
 * exportPromptBulkPlan.js
 *
 * Reine Plan-Logik für den MBK-Bulk-Generator.
 * Trennt das WAS-passiert-wo (Plan) vom WIE-wird-es-ausgeführt (Hook).
 *
 * Verwendet wird der Plan an drei Stellen:
 *   1. im Bulk-Preview-Modal (welche Prompts werden neu erzeugt vs. übersprungen?)
 *   2. im Bulk-Hook selbst (Items in einem Roundtrip an das Backend)
 *   3. im Markdown-Bulk-Export (Reihenfolge: Nukleus → Persona → Sektoren → Erstellungspakete)
 */
import {
  buildNucleusPrompt,
  buildPersonaPrompt,
  buildSektorPrompt,
  buildErstellungspaketForLernpaket,
  buildErstellungspaketForAufgabe,
  MBK_TEMPLATE_VERSION,
} from '@/lib/exportPromptTemplates';
import {
  findExistingPrompt,
  isErstellungspaketBlocked,
  lookupSourceMaxTimestampFromIndex,
  LERNTYP_KEYS,
} from '@/lib/exportPromptSync';

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

/**
 * Erzeugt für eine Einheit den vollständigen Bulk-Plan.
 *
 * Items haben die Form:
 *   {
 *     key: string,             // eindeutiger Key (für UI + dedup)
 *     label: string,           // Anzeige-Label
 *     section: string,         // 'nucleus'|'persona'|'sektoren'|'erstellungspakete'
 *     promptType: string,
 *     referenceId: string|null,
 *     status: 'new' | 'update' | 'skip-customized' | 'skip-blocked',
 *     skipReason?: string,
 *     buildContent: () => string,
 *     sourceMaxTs: number,
 *     existing: object|null,   // bestehender Prompt (für Diff im Modal)
 *   }
 */
export function buildBulkPlan({
  einheitId,
  einheit,
  stammdaten,
  themenfelder,
  lernpakete,
  lernziele,
  aufgabenbausteine,
  phaseAktivitaeten = [],
  katalogById,
  allgemeineAufgaben,
  allgemeineAufgabenEbene23,
  systemBausteine = [],
  prompts,
  tsIndex,
}) {
  const items = [];

  const lookup = (promptType, referenceId = null) =>
    findExistingPrompt(prompts, { einheitId, promptType, referenceId });

  const tsFor = (promptType, referenceId = null) =>
    lookupSourceMaxTimestampFromIndex(tsIndex, promptType, referenceId);

  const classify = (existing, blockReason) => {
    if (blockReason) return { status: 'skip-blocked', skipReason: blockReason };
    if (existing?.is_customized) {
      return { status: 'skip-customized', skipReason: 'Manuell angepasst — nicht überschrieben.' };
    }
    return { status: existing ? 'update' : 'new' };
  };

  // 1. Nukleus
  {
    const existing = lookup('nucleus');
    const { status, skipReason } = classify(existing);
    items.push({
      key: 'nucleus',
      label: 'Nukleus (Kontext-Anker)',
      section: 'nucleus',
      promptType: 'nucleus',
      referenceId: null,
      status,
      skipReason,
      buildContent: () => buildNucleusPrompt({ einheit, stammdaten, themenfelder, lernpakete, lernziele }),
      sourceMaxTs: tsFor('nucleus'),
      existing,
    });
  }

  // 2. Persona
  {
    const existing = lookup('persona');
    const { status, skipReason } = classify(existing);
    items.push({
      key: 'persona',
      label: 'Persona & Tonalität',
      section: 'persona',
      promptType: 'persona',
      referenceId: null,
      status,
      skipReason,
      buildContent: () => buildPersonaPrompt({ einheit }),
      sourceMaxTs: tsFor('persona'),
      existing,
    });
  }

  // 3. Sektoren
  for (const lerntyp of LERNTYP_KEYS) {
    const existing = lookup('sektor_anweisung', lerntyp);
    const { status, skipReason } = classify(existing);
    items.push({
      key: `sektor::${lerntyp}`,
      label: `Sektoren · ${LERNTYP_LABELS[lerntyp]}`,
      section: 'sektoren',
      promptType: 'sektor_anweisung',
      referenceId: lerntyp,
      status,
      skipReason,
      buildContent: () => buildSektorPrompt({
        einheit,
        lerntyp,
        themenfelder,
        lernpakete,
        allgemeineAufgaben,
        systemBausteine,
      }),
      sourceMaxTs: tsFor('sektor_anweisung', lerntyp),
      existing,
    });
  }

  // 4. Erstellungspakete: Lernpakete (sortiert nach Themenfeld + Reihenfolge)
  const lernpaketeSorted = [...lernpakete].sort(
    (a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)
  );
  for (const lp of lernpaketeSorted) {
    const existing = lookup('erstellungspaket', lp.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: lp.id, lernpakete, allgemeineAufgaben,
    });
    const { status, skipReason } = classify(existing, blockReason);
    const zieleDesPakets = lernziele.filter((z) => z.lernpaket_id === lp.id);
    const aufgabenDesPakets = aufgabenbausteine.filter((a) => a.lernpaket_id === lp.id);
    const phasenDesPakets = phaseAktivitaeten.filter((pa) => pa.lernpaket_id === lp.id);
    items.push({
      key: `lp::${lp.id}`,
      label: `📦 Lernpaket: ${lp.titel_des_pakets || '(ohne Titel)'}`,
      section: 'erstellungspakete',
      promptType: 'erstellungspaket',
      referenceId: lp.id,
      status,
      skipReason,
      buildContent: () => buildErstellungspaketForLernpaket({
        lernpaket: lp,
        lernziele: zieleDesPakets,
        phaseAktivitaeten: phasenDesPakets,
        katalogById,
        aufgaben: aufgabenDesPakets,
      }),
      sourceMaxTs: tsFor('erstellungspaket', lp.id),
      existing,
    });
  }

  // 4b. Erstellungspakete: AllgemeineAufgaben Ebene 2/3
  for (const aa of allgemeineAufgabenEbene23) {
    const existing = lookup('erstellungspaket', aa.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: aa.id, lernpakete, allgemeineAufgaben,
    });
    const { status, skipReason } = classify(existing, blockReason);
    const ebeneLabel = aa.anforderungsebene === '3 - Projekt' ? 'Ebene 3' : 'Ebene 2';
    items.push({
      key: `aa::${aa.id}`,
      label: `🎯 ${ebeneLabel}: ${aa.titel || '(ohne Titel)'}`,
      section: 'erstellungspakete',
      promptType: 'erstellungspaket',
      referenceId: aa.id,
      status,
      skipReason,
      buildContent: () => buildErstellungspaketForAufgabe({ aufgabe: aa }),
      sourceMaxTs: tsFor('erstellungspaket', aa.id),
      existing,
    });
  }

  return items;
}

/**
 * Filtert den Plan auf "wirklich geschriebene" Items + bereitet sie für das
 * Backend (`bulkUpsertExportPrompts`) auf.
 */
export function planToWritePayload(items) {
  return items
    .filter((it) => it.status === 'new' || it.status === 'update')
    .map((it) => ({
      prompt_type: it.promptType,
      reference_id: it.referenceId,
      content: it.buildContent(),
      is_customized: false,
      source_updated_at: new Date(it.sourceMaxTs || Date.now()).toISOString(),
      template_version: MBK_TEMPLATE_VERSION,
    }));
}

/**
 * Erzeugt den Markdown-Export aller bereits generierten Prompts der Einheit.
 *
 * Reihenfolge: 1. Nukleus → 2. Persona → 3. Sektoren (alle 4) →
 * 4. Erstellungspakete (Lernpakete, dann Ebene-2/3-Aufgaben).
 *
 * Items ohne gespeicherten content (`existing` ist null) werden mit einem
 * Platzhalter-Hinweis gerendert, damit die Lehrkraft Lücken sofort sieht.
 */
export function buildMarkdownBundle({ einheit, items }) {
  const titel = einheit?.titel_der_einheit || '(unbenannte Einheit)';
  const fach = einheit?.fach || '—';
  const jahrgang = einheit?.jahrgangsstufe || '—';
  const generiertAm = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const sections = [];
  let counter = 1;
  for (const it of items) {
    // Wir nehmen NUR die geschriebene Content-Quelle: existing.content,
    // sonst den frisch berechneten buildContent(). Das spiegelt also den
    // tatsächlich gespeicherten Stand mit Fallback auf den Live-Build.
    const content = it.existing?.content || it.buildContent();
    sections.push(`# ${counter}. ${it.label}\n\n${content}\n`);
    counter += 1;
  }

  return [
    `# MBK-Prompts: ${titel}`,
    `_Fach: ${fach} · Jahrgang: ${jahrgang} · Stand: ${generiertAm}_`,
    '',
    '> Kopieren Sie die folgenden Prompts in der angegebenen Reihenfolge in Ihre Moodle-Builder-KI.',
    '',
    '---',
    '',
    sections.join('\n---\n\n'),
  ].join('\n');
}