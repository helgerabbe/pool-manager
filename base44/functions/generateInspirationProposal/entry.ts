/**
 * generateInspirationProposal
 * ───────────────────────────
 * Phase 2 / PR4 des Epics "Intelligentes Aufgaben-Management & Didaktische
 * Typisierung". Liefert dem Lehrer im InspirationModal einen vollständigen
 * Aufgaben-Entwurf, gesteuert über drei Briefing-Parameter:
 *
 *   - mission_type   : einer der 6 Mission-Slugs (Pflicht)
 *                      → 'problem' | 'entdeckung' | 'recherche' |
 *                        'anwendung' | 'transfer' | 'kreativitaet'
 *   - material_level : 0 = rein kognitiv | 1 = minimal (Default) |
 *                      2 = moderat | 3 = aufwändiges Setup
 *   - fokus          : optionaler Freitext der Lehrkraft
 *                      ("Was soll unbedingt vorkommen?")
 *
 * Zusätzlicher Kontext (vom Frontend mitgegeben oder vom Backend selbst
 * gezogen): aufgaben_typ ('inhalt'|'handlung'), Einheit-Metadaten (Fach,
 * Jahrgang, Titel), die Schul-Stammdaten aus den Systemeinstellungen.
 *
 * Output (sauberes JSON, keine Markdown-Wrapper):
 *   {
 *     "titel": "...",
 *     "aufgabenstellung": "...",
 *     "schwierigkeitsgrad": 1|2|3,
 *     "mission_type": "<slug>",
 *     "required_materials": "..." | null,
 *     "didaktischer_hinweis": "..."
 *   }
 *
 * Modell: claude_sonnet_4_6 — bewusste Qualitäts-Entscheidung der
 * Planungsabteilung (siehe Entscheidungsprotokoll Phase 2, Punkt 7).
 * Wenn das Premium-Modell nicht antwortet, fallen wir transparent auf
 * 'automatic' zurück, damit die Lehrkraft IMMER einen Vorschlag bekommt.
 *
 * STATELESS: Schreibt nichts in die DB. Reines Inspiration-Werkzeug —
 * der Lehrer entscheidet im Modal, ob er den Vorschlag übernimmt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Mission-Definitionen (gespiegelt aus lib/missionen.js) ────────────────
// Backend-Funktionen dürfen nicht aus dem src/-Tree importieren (NO LOCAL
// IMPORTS). Wir spiegeln die didaktische Essenz inline. Bei Änderungen an
// lib/missionen.js bitte synchron halten.
const MISSION_DEFINITIONEN = {
  problem: {
    label: 'Den Funken zünden',
    kern: 'Alltagsbezug & Motivation',
    instruktion:
      'Die Aufgabe knüpft an einen lebensnahen Alltagskonflikt oder ein konkretes Problem aus der Lebenswelt der Schüler an. Sie wirkt motivierend, weckt Neugier und macht klar, WARUM sich die Beschäftigung mit dem Thema lohnt. Vermeide trockene Lehrbuchformulierungen.',
  },
  entdeckung: {
    label: 'Selber rausfinden lassen',
    kern: 'Induktion & Regelbildung',
    instruktion:
      'Die Aufgabe ist induktiv angelegt: Schüler sollen anhand von Beispielen, Beobachtungen oder Material eine Regel/ein Prinzip SELBST entdecken — nicht erklärt bekommen. Stelle keine fertige Erklärung bereit, sondern lade zum aktiven Schlussfolgern ein.',
  },
  recherche: {
    label: 'Informationen checken',
    kern: 'Informationsbeschaffung & Quellen',
    instruktion:
      'Die Aufgabe verlangt aktive Informationsbeschaffung (Lehrbuch, Internet, Quellen). Schüler müssen Fakten finden, vergleichen oder die Glaubwürdigkeit von Quellen prüfen. Gib einen klaren Recherche-Auftrag mit präzisen Leitfragen.',
  },
  anwendung: {
    label: 'Zeigen, was man kann',
    kern: 'Wissen im bekannten Kontext festigen',
    instruktion:
      'Die Aufgabe festigt bereits eingeführtes Wissen in einem bekannten Kontext. Sie ist klar, eindeutig lösbar und zielt auf Sicherheit/Routine, nicht auf Transfer. Gerne mit konkreten Beispielen oder kleinen Übungseinheiten.',
  },
  transfer: {
    label: 'In neue Welten übertragen',
    kern: 'Wissen im neuen Kontext anwenden',
    instruktion:
      'Die Aufgabe verlangt expliziten Transfer auf einen NEUEN, fachfremden oder unerwarteten Kontext. Schüler müssen Bekanntes auf Unbekanntes übertragen. Der neue Kontext muss klar erkennbar anders sein als der Lernkontext.',
  },
  kreativitaet: {
    label: 'Etwas Eigenes erschaffen',
    kern: 'Schöpferische Gestaltung & Deep Dive',
    instruktion:
      'Die Aufgabe ist offen-schöpferisch: Schüler erschaffen etwas Eigenes (Text, Plakat, Modell, Story, Hörspiel, …). Es gibt mehrere richtige Lösungswege. Gib Gestaltungsfreiheit statt enger Vorgaben.',
  },
};

// ── Material-Level-Definitionen ───────────────────────────────────────────
const MATERIAL_LEVEL_INSTRUKTIONEN = {
  0: {
    label: 'Rein kognitiv / sprachlich',
    instruktion:
      'Die Aufgabe ist OHNE jegliches physisches Material lösbar — rein durch Denken, Sprechen, Schreiben oder Lesen. Verlange KEINE Gegenstände. Das Feld required_materials MUSS in der Antwort null sein.',
  },
  1: {
    label: 'Minimal',
    instruktion:
      'Maximal 1–2 alltägliche Gegenstände, die jeder Schüler im Klassenraum oder zuhause hat (Stift, Papier, Heft, Lineal). Keine Vorbereitung durch die Lehrkraft.',
  },
  2: {
    label: 'Moderat',
    instruktion:
      'Mehrere Haushaltsgegenstände oder einfache Schulmaterialien (z. B. Becher, Schnur, Folie, Schere, Klebstoff, Smartphone). Die Lehrkraft muss vorbereiten, aber nichts beschaffen, was nicht in einem Standardhaushalt vorkommt.',
  },
  3: {
    label: 'Aufwändiges Experimentier-Setup',
    instruktion:
      'Echtes Experimentier-Setup mit mehreren Komponenten oder Schritten (z. B. Versuchsaufbau mit Wasser/Eis, mehrere Gefäße, Messgerät, Beleuchtung). Vorbereitung durch die Lehrkraft notwendig, aber kein Labor — Klassenraum-tauglich.',
  },
};

// ── Validierungs-Sets ─────────────────────────────────────────────────────
const VALID_MISSIONS = new Set(Object.keys(MISSION_DEFINITIONEN));
const VALID_TYPEN = new Set(['inhalt', 'handlung']);

// ── Antwort-Schema für InvokeLLM ─────────────────────────────────────────
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    titel: { type: 'string' },
    aufgabenstellung: { type: 'string' },
    schwierigkeitsgrad: { type: 'number', enum: [1, 2, 3] },
    mission_type: { type: 'string' },
    required_materials: { type: ['string', 'null'] },
    didaktischer_hinweis: { type: 'string' },
  },
  required: [
    'titel',
    'aufgabenstellung',
    'schwierigkeitsgrad',
    'mission_type',
    'didaktischer_hinweis',
  ],
};

// ── Hilfsfunktion: Schul-Stammdaten lesen ────────────────────────────────
async function loadSchulStammdaten(base44) {
  try {
    const settings = await base44.asServiceRole.entities.Systemeinstellungen.list();
    const find = (key) => settings.find((s) => s.schluessel === key)?.wert_text || '';
    return {
      land: find('system_land'),
      bundesland: find('system_bundesland'),
      schulform: find('system_schulform'),
    };
  } catch {
    return { land: '', bundesland: '', schulform: '' };
  }
}

// ── Hilfsfunktion: Einheit-Metadaten optional anreichern ─────────────────
async function loadEinheitContext(base44, einheit_id) {
  if (!einheit_id) return null;
  try {
    const e = await base44.asServiceRole.entities.Einheiten.get(einheit_id);
    if (!e) return null;
    return {
      fach: e.fach || '',
      jahrgang: e.jahrgangsstufe || '',
      titel: e.titel_der_einheit || '',
      gesamtziele: Array.isArray(e.gesamtziele) ? e.gesamtziele : [],
    };
  } catch {
    return null;
  }
}

// ── Prompt-Builder ───────────────────────────────────────────────────────
function buildPrompt({ mission, materialLevel, fokus, aufgabenTyp, einheit, stammdaten }) {
  const missionDef = MISSION_DEFINITIONEN[mission];
  const matDef = MATERIAL_LEVEL_INSTRUKTIONEN[materialLevel];
  const typLabel = aufgabenTyp === 'handlung' ? 'Handlungsaufgabe' : 'Brian-Aufgabe (digital)';

  const stammdatenBlock = [
    stammdaten.land && `Land: ${stammdaten.land}`,
    stammdaten.bundesland && `Bundesland: ${stammdaten.bundesland} (Lehrplan-Kontext beachten!)`,
    stammdaten.schulform && `Schulform: ${stammdaten.schulform}`,
  ]
    .filter(Boolean)
    .join('\n');

  const einheitBlock = einheit
    ? [
        einheit.fach && `Fach: ${einheit.fach}`,
        einheit.jahrgang && `Jahrgangsstufe: ${einheit.jahrgang}`,
        einheit.titel && `Titel der Unterrichtseinheit: ${einheit.titel}`,
        einheit.gesamtziele.length > 0 &&
          `Gesamtziele der Einheit:\n  - ${einheit.gesamtziele.join('\n  - ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '(Keine Einheit-Metadaten übergeben.)';

  const typBeschreibung =
    aufgabenTyp === 'handlung'
      ? 'Diese Aufgabe wird OFFLINE im Klassenraum bearbeitet — mit physischem Material, beobachtbaren Handlungen.'
      : 'Diese Aufgabe wird DIGITAL im Brian.study-Tutor bearbeitet — schreibtisch-tauglich.';

  const requiredMaterialsHint =
    materialLevel === 0
      ? 'null'
      : '"konkrete Materialliste, kommagetrennt"';

  return `Du bist ein erfahrener Didaktiker und unterstützt eine Lehrkraft dabei, eine schülergerechte, didaktisch wertvolle Aufgabe zu entwerfen. Du erhältst ein präzises Briefing und lieferst genau EINEN konkreten Aufgaben-Vorschlag.

## Schul-Kontext
${stammdatenBlock || '(Keine Schul-Stammdaten gepflegt.)'}

## Unterrichts-Kontext
${einheitBlock}

## Briefing der Lehrkraft

### Aufgaben-Typ: ${typLabel}
${typBeschreibung}

### Mission: "${missionDef.label}" (${missionDef.kern})
${missionDef.instruktion}

### Material-Level: ${materialLevel} — ${matDef.label}
${matDef.instruktion}

### Fokus der Lehrkraft
${fokus?.trim() ? `"${fokus.trim()}"` : '(kein expliziter Fokus — du hast didaktischen Spielraum.)'}

## Deine Aufgabe
Liefere genau EINEN konkreten Aufgabenvorschlag, der ALLE oben genannten Vorgaben erfüllt:
- Die Mission muss in der Aufgaben-DNA spürbar sein (nicht nur im Titel).
- Der Material-Level wird strikt eingehalten.
- Der Fach- und Bundesland-Kontext leitet die Beispielwahl.
- Die Aufgabenstellung richtet sich DIREKT an die Schüler (Du-Form), 2–6 prägnante Sätze.
- Schwierigkeitsgrad: 1 = leicht / Sicherung, 2 = mittel / Standard, 3 = anspruchsvoll / Transfer.

## Output-Format
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt — kein Markdown, kein Vortext, keine Code-Fences:

{
  "titel": "kurzer prägnanter Titel, max. 80 Zeichen",
  "aufgabenstellung": "vollständige, schülergerechte Aufgabenstellung in Du-Form",
  "schwierigkeitsgrad": 1|2|3,
  "mission_type": "${mission}",
  "required_materials": ${requiredMaterialsHint},
  "didaktischer_hinweis": "1–2 Sätze für die Lehrkraft: warum diese Aufgabe didaktisch funktioniert"
}

WICHTIG:
- "mission_type" MUSS exakt der String "${mission}" sein (nicht übersetzen, nicht verändern).
- Bei Material-Level 0 MUSS "required_materials" der JSON-Wert null sein (nicht "null" als String).
- Bei Material-Level 1–3 MUSS "required_materials" ein nicht-leerer String sein.`;
}

// ── Validierung & Normalisierung ─────────────────────────────────────────
function normalizeProposal(raw, missionFromBriefing, materialLevel) {
  const titel = (raw?.titel || '').toString().trim().slice(0, 200);
  const aufgabenstellung = (raw?.aufgabenstellung || '').toString().trim();
  let schwierigkeitsgrad = parseInt(raw?.schwierigkeitsgrad, 10);
  if (![1, 2, 3].includes(schwierigkeitsgrad)) schwierigkeitsgrad = 2;
  // mission_type IMMER aus dem Briefing übernehmen — Source of Truth.
  const mission_type = missionFromBriefing;
  const didaktischer_hinweis = (raw?.didaktischer_hinweis || '').toString().trim();
  let required_materials = raw?.required_materials;
  if (materialLevel === 0) {
    required_materials = null;
  } else {
    required_materials =
      typeof required_materials === 'string' && required_materials.trim().length > 0
        ? required_materials.trim()
        : null;
  }
  return {
    titel,
    aufgabenstellung,
    schwierigkeitsgrad,
    mission_type,
    required_materials,
    didaktischer_hinweis,
  };
}

// ── LLM-Aufruf mit Modell-Fallback ───────────────────────────────────────
async function callLLM(base44, prompt) {
  // Premium-Modell zuerst (Qualitäts-Entscheidung Phase 2, Punkt 7).
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: RESPONSE_SCHEMA,
    });
    if (result?.titel && result?.aufgabenstellung) {
      return result;
    }
    console.warn(
      '[generateInspirationProposal] Premium-Modell lieferte leere Antwort — Fallback auf automatic.'
    );
  } catch (err) {
    console.warn(
      '[generateInspirationProposal] Premium-Modell-Fehler — Fallback auf automatic:',
      err?.message
    );
  }

  // Fallback: Default-Modell. Wenn auch das fehlschlägt, propagieren wir
  // den Fehler nach oben (HTTP 500), damit die UI den Toast anzeigen kann.
  return await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: RESPONSE_SCHEMA,
  });
}

// ── Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      mission_type,
      material_level = 1,
      fokus = '',
      aufgaben_typ = 'inhalt',
      einheit_id = null,
    } = body || {};

    // ── Eingabe-Validierung ──────────────────────────────────────────────
    if (!VALID_MISSIONS.has(mission_type)) {
      return Response.json(
        {
          error: `Ungültiger mission_type. Erlaubt: ${[...VALID_MISSIONS].join(', ')}.`,
        },
        { status: 400 }
      );
    }
    const matLevel = parseInt(material_level, 10);
    if (![0, 1, 2, 3].includes(matLevel)) {
      return Response.json(
        { error: 'material_level muss 0, 1, 2 oder 3 sein.' },
        { status: 400 }
      );
    }
    const typ = VALID_TYPEN.has(aufgaben_typ) ? aufgaben_typ : 'inhalt';

    // ── Kontext laden ────────────────────────────────────────────────────
    const [stammdaten, einheit] = await Promise.all([
      loadSchulStammdaten(base44),
      loadEinheitContext(base44, einheit_id),
    ]);

    // ── Prompt bauen + LLM ───────────────────────────────────────────────
    const prompt = buildPrompt({
      mission: mission_type,
      materialLevel: matLevel,
      fokus,
      aufgabenTyp: typ,
      einheit,
      stammdaten,
    });

    const result = await callLLM(base44, prompt);
    const proposal = normalizeProposal(result, mission_type, matLevel);

    // ── Sanity-Check: Wenn die KI komplett leer geliefert hat, geben wir
    //    einen 502 zurück, damit das Frontend einen Fehler anzeigen kann
    //    (statt eine leere Karte zu rendern).
    if (!proposal.titel || !proposal.aufgabenstellung) {
      return Response.json(
        {
          error:
            'Das KI-Modell hat keinen verwertbaren Vorschlag geliefert. Bitte erneut "Neu würfeln" klicken.',
        },
        { status: 502 }
      );
    }

    return Response.json(proposal);
  } catch (error) {
    console.error('[generateInspirationProposal] Fehler:', error);
    return Response.json(
      { error: error?.message || 'Unbekannter Fehler beim Generieren des Vorschlags.' },
      { status: 500 }
    );
  }
});