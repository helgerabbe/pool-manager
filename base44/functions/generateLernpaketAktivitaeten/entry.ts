/**
 * functions/generateLernpaketAktivitaeten
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.2 – §4.4).
 *
 * Generiert auf Basis eines freien Briefings der Lehrkraft eine
 * Liste von Aktivitäts-Hüllen (Empty Shells) für die drei Phasen
 * Input / Übung / Abschluss eines Lernpakets.
 *
 * Wichtige Designentscheidungen:
 *   – Nur Strukturdaten (Aktivitätstyp + Begründung), KEINE Inhalte.
 *   – Phase-Mismatches werden automatisch korrigiert (Review B, §4.4),
 *     nicht stumm verworfen.
 *   – Lerntyp-Hintergrund wird nur als Kontext mitgegeben, die KI baut
 *     keine lerntyp-spezifische Differenzierung in die Hüllen ein
 *     (Variante β, §4.7).
 *   – Default-Modell `gpt_5_mini` — günstig, ausreichend für strukturelle
 *     Aufgaben. Token-Verbrauch + Korrekturrate werden geloggt (§9.6).
 *   – Diese Funktion PERSISTIERT NICHTS. Der Aufruf
 *     `applyLernpaketWizardProposal` (Etappe 4) übernimmt das.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

const VALID_PHASES = ['Input', 'Übung', 'Abschluss'];
const MAX_BRIEFING_LENGTH = 5000;
const MAX_ITEMS = 15;

// Glossar-Konstanten — bewusst in dieser Funktion gespiegelt, weil Deno-
// Functions keine lokalen Imports erlauben (siehe coding_instructions §19).
// Single Source of Truth bleibt `lib/wizardGlossar.js` — bei Änderungen dort
// hier bitte nachziehen.
const AKTIVITAETSTYP_GLOSSAR = {
  'Link / URL': { phase: 'Input', beschreibung: 'Schüler:innen besuchen eine externe Webseite und verschaffen sich einen Überblick.' },
  Video: { phase: 'Input', beschreibung: 'Schüler:innen schauen ein Erklärvideo.' },
  Lehrwerk: { phase: 'Input', beschreibung: 'Verweis auf eine Seite/einen Abschnitt im Schulbuch.' },
  Quelle: { phase: 'Input', beschreibung: 'Verweis auf einen externen Text, ein PDF oder eine zitierfähige Quelle.' },
  Audio: { phase: 'Input', beschreibung: 'Schüler:innen hören ein Audio (Podcast, Hörverstehen).' },
  Bild: { phase: 'Input', beschreibung: 'Schüler:innen betrachten ein Bild oder Schema und entnehmen Informationen.' },
  'Text lesen': { phase: 'Input', beschreibung: 'Schüler:innen lesen einen längeren Text.' },
  Miniquiz: { phase: 'Übung', beschreibung: 'Kurze Wissensfrage mit ein bis drei erwarteten Antworten.' },
  'Lückentext': { phase: 'Übung', beschreibung: 'Schüler:innen füllen Lücken in einem vorgegebenen Text.' },
  'Begriffe zuordnen': { phase: 'Übung', beschreibung: 'Schüler:innen verbinden Begriffe mit ihren Definitionen oder Beispielen.' },
  'Reihenfolge / Sortierung': { phase: 'Übung', beschreibung: 'Schüler:innen bringen Elemente in die richtige Reihenfolge.' },
  Bildbeschriftung: { phase: 'Übung', beschreibung: 'Schüler:innen beschriften Marker in einem Bild.' },
  'KI-Tutor Aufgabe': { phase: 'Übung', beschreibung: 'Offene Aufgabe, die die KI individuell auswertet und Feedback gibt.' },
  'Offene Aufgabe': { phase: 'Übung', beschreibung: 'Frei formulierte Aufgabe ohne Auto-Korrektur.' },
  'Multiple Choice': { phase: 'Übung', beschreibung: 'Klassische Auswahlfrage mit mehreren Antwortoptionen.' },
  Test: { phase: 'Abschluss', beschreibung: 'Kombinierter Lernstandstest mit mehreren Teilaufgaben.' },
  'KI-Check': { phase: 'Abschluss', beschreibung: 'Offene Abschlussaufgabe, die die KI nach hinterlegten Kriterien bewertet.' },
  'Bearbeitung bestätigen': { phase: 'Abschluss', beschreibung: 'Schüler:innen bestätigen die Bearbeitung der vorherigen Aktivitäten.' },
};

const LERNTYPEN_HINTERGRUND = [
  { label: 'Minimalist', beschreibung: 'Will den Stoff in der kürzesten sinnvollen Form. Knappe Einstiege, schnelle Lernstandskontrolle.' },
  { label: 'Pragmatiker', beschreibung: 'Will effizient zum Ziel. Klar strukturierte Übungen mit direktem Anwendungsbezug.' },
  { label: 'Ehrgeizig', beschreibung: 'Will vollständige Prüfungsvorbereitung. Vielfältige Übungsformate, gründliche Abschlusstests.' },
  { label: 'Passioniert', beschreibung: 'Will Freiheit und Tiefe. Offene Aufgaben, KI-Tutor-Dialoge, reflexive Abschlussformate.' },
];

function buildSystemPrompt({ allowedTypes, paketTitel, kernbegriffe }) {
  const aktivitaetenBlock = allowedTypes
    .map((t) => `  • ${t.name} (Phase: ${t.phase}) — ${t.beschreibung}`)
    .join('\n');

  const lerntypenBlock = LERNTYPEN_HINTERGRUND
    .map((lt) => `  • ${lt.label}: ${lt.beschreibung}`)
    .join('\n');

  const kernbegriffeBlock = kernbegriffe && kernbegriffe.length > 0
    ? `\nPflicht-Kernbegriffe dieses Lernpakets (sollten in der Begründung erwähnt werden, wo passend):\n  ${kernbegriffe.map((k) => `"${k}"`).join(', ')}\n`
    : '';

  return `Du bist ein Didaktik-Experte für Gesamtschulen in Niedersachsen.
Du planst die STRUKTUR eines Lernpakets, indem du eine Auswahl von
Aktivitäts-HÜLLEN (Empty Shells) für die drei Phasen Input, Übung
und Abschluss vorschlägst.

WICHTIG:
  – Du erfindest KEINE konkreten Inhalte (keine Texte, keine Fragen,
    keine Links). Du wählst nur den passenden Aktivitäts-TYP und
    gibst eine kurze didaktische Begründung.
  – Die Lehrkraft füllt die Inhalte später selbst aus.
  – Verwende AUSSCHLIESSLICH die unten gelisteten Aktivitätstypen.
  – Jeder Aktivitätstyp hat eine feste Phase — halte dich daran.
  – Liefere insgesamt zwischen 3 und ${MAX_ITEMS} Aktivitäten,
    didaktisch ausgewogen über die drei Phasen verteilt.

Lernpaket-Titel: "${paketTitel || '(ohne Titel)'}"
${kernbegriffeBlock}
Verfügbare Aktivitätstypen:
${aktivitaetenBlock}

Hintergrund (NICHT für lerntyp-spezifische Differenzierung verwenden,
sondern nur als Kontext für eine ausgewogene Mischung):
Vier Lerntypen werden die Lernpakete später nutzen:
${lerntypenBlock}

Antworte AUSSCHLIESSLICH mit validem JSON nach dem vorgegebenen Schema —
keine Erklärungen, keine Markdown-Codeblöcke.`;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aktivitaetstyp: { type: 'string', description: 'Exakter Name aus der erlaubten Liste.' },
          phase: { type: 'string', enum: VALID_PHASES, description: 'Input, Übung oder Abschluss.' },
          begruendung: { type: 'string', description: 'Ein knapper Satz, warum diese Aktivität an dieser Stelle sinnvoll ist.' },
        },
        required: ['aktivitaetstyp', 'phase', 'begruendung'],
      },
    },
  },
  required: ['items'],
};

/**
 * Korrigiert die Phase eines Items anhand des Katalogs.
 * Gibt zurück, ob eine Korrektur stattgefunden hat.
 */
function autoCorrectPhase(item, allowedTypesByName) {
  const katalog = allowedTypesByName.get(item.aktivitaetstyp);
  if (!katalog) return { item, korrigiert: false };
  if (item.phase === katalog.phase) return { item, korrigiert: false };
  return {
    item: { ...item, phase: katalog.phase, phase_originalwert: item.phase },
    korrigiert: true,
  };
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lernpaketId, briefing } = body || {};

    if (!lernpaketId) {
      return Response.json({ error: 'Missing lernpaketId' }, { status: 400 });
    }
    if (!briefing || typeof briefing !== 'string' || !briefing.trim()) {
      return Response.json({ error: 'Briefing darf nicht leer sein.' }, { status: 400 });
    }
    if (briefing.length > MAX_BRIEFING_LENGTH) {
      return Response.json({ error: `Briefing zu lang (max. ${MAX_BRIEFING_LENGTH} Zeichen).` }, { status: 400 });
    }

    // Lernpaket-Kontext laden (Titel, Kernbegriffe).
    const paket = await base44.asServiceRole.entities.Lernpakete.get(lernpaketId).catch(() => null);
    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden.' }, { status: 404 });
    }

    // Erlaubte Aktivitätstypen aus dem Katalog (aktiv) — geschnitten mit dem Glossar.
    const katalogAlle = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    const aktiveKatalogNamen = new Set(
      katalogAlle.filter((k) => k.is_active === true).map((k) => k.name)
    );
    const allowedTypes = Object.entries(AKTIVITAETSTYP_GLOSSAR)
      .filter(([name]) => aktiveKatalogNamen.has(name))
      .map(([name, entry]) => ({ name, ...entry }));

    if (allowedTypes.length === 0) {
      return Response.json({ error: 'Keine aktiven Aktivitätstypen verfügbar.' }, { status: 500 });
    }

    const allowedTypesByName = new Map(allowedTypes.map((t) => [t.name, t]));

    const systemPrompt = buildSystemPrompt({
      allowedTypes,
      paketTitel: paket.titel_des_pakets,
      kernbegriffe: paket.kernbegriffe || [],
    });

    const userPrompt = `Briefing der Lehrkraft:\n\n${briefing.trim()}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n---\n\n${userPrompt}`,
      model: 'gpt_5_mini',
      response_json_schema: RESPONSE_SCHEMA,
    });

    // InvokeLLM gibt mit response_json_schema bereits ein Objekt zurück.
    const rawItems = Array.isArray(llmResponse?.items) ? llmResponse.items : [];

    // Validierung + Phase-Autokorrektur.
    const korrekturen = [];
    const verworfen = [];
    const phasenBuckets = { Input: [], 'Übung': [], Abschluss: [] };

    rawItems.forEach((it, idx) => {
      if (!it || typeof it !== 'object') return;
      if (!allowedTypesByName.has(it.aktivitaetstyp)) {
        verworfen.push({ index: idx, grund: 'unbekannter aktivitaetstyp', wert: it.aktivitaetstyp });
        return;
      }
      const { item, korrigiert } = autoCorrectPhase(
        { ...it, id: `prop-${idx}` },
        allowedTypesByName
      );
      if (korrigiert) korrekturen.push({ id: item.id, von: item.phase_originalwert, nach: item.phase });
      if (phasenBuckets[item.phase]) {
        phasenBuckets[item.phase].push(item);
      }
    });

    const totalItems = Object.values(phasenBuckets).reduce((s, arr) => s + arr.length, 0);

    const telemetry = {
      model: 'gpt_5_mini',
      duration_ms: Date.now() - t0,
      items_raw: rawItems.length,
      items_total: totalItems,
      korrekturen: korrekturen.length,
      verworfen: verworfen.length,
      briefing_length: briefing.length,
    };
    console.log('[generateLernpaketAktivitaeten] telemetry', telemetry);

    if (totalItems === 0) {
      return Response.json({
        success: false,
        message: 'Die KI konnte keine passenden Aktivitäten erzeugen. Bitte Briefing präzisieren.',
        telemetry,
      });
    }

    return Response.json({
      success: true,
      proposal: { phasen: phasenBuckets },
      korrekturen,
      verworfen,
      telemetry,
    });
  } catch (error) {
    console.error('[generateLernpaketAktivitaeten] error', error);
    return Response.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
});