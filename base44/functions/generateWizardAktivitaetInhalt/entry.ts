/**
 * functions/generateWizardAktivitaetInhalt
 *
 * Super-Wizard Etappe 2 (2026-07-26): Befüllt EINE leere Aktivität eines
 * Lernpakets mit KI-generierten Inhalten.
 *
 * Zwei Pfade (die Persistenz-Formate wurden gegen die echten
 * Runtime-/Editor-Formate der App verifiziert):
 *   A) Masterfähige Typen (supports_master=true: Lückentext, Begriffe
 *      zuordnen, Reihenfolge/Sortierung, Miniquiz): Es wird EINE neue
 *      MasterAufgabe mit typgerechten field_values angelegt (Format wie
 *      in masterAufgabeTouchActivity/isMasterComplete definiert).
 *      Test & Multiple Choice sind bewusst (noch) ausgenommen.
 *   B) Normale Typen: field_values der Aktivität werden anhand des
 *      form_schema aus dem AktivitaetenKatalog befüllt (text/textarea/
 *      number/select generisch, bekannte json-Felder wie training_pairs
 *      mit fester Spezifikation).
 *
 * Nicht-destruktive Garantien:
 *   – Freigegebene (approved) oder vollständige Aktivitäten → skipped.
 *   – Aktivitäten mit bereits existierenden Master-Aufgaben → skipped.
 *   – Einzelne Felder, die schon einen Wert haben, werden NIE überschrieben.
 *   – Pflichtfelder mit externem Material (Datei/Bild/Audio) oder
 *     unbekanntem Format → skipped mit Begründung.
 *
 * Etappe 3 (2026-07-26): URL-Felder werden nicht mehr übersprungen — die
 * KI recherchiert per Websuche eine echte, existierende Quelle (bei
 * Video/Audio bevorzugt Studyflix) und jede Kandidaten-URL wird
 * server-seitig per HTTP-Check verifiziert, bevor sie gespeichert wird.
 *
 * Alle Ergebnisse bleiben content_status='draft' — die Lehrkraft prüft.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { hasUnitWriteAccess } from '../../shared/unitAccess.js';
import { unwrapLLM } from '../../shared/llmUtils.js';
import {
  isEmptyValue,
  MASTER_TYP_SPEZIFIKATIONEN,
  NICHT_BEFUELLBARE_FELDTYPEN,
  JSON_FELD_SPEZIFIKATIONEN,
  TEXT_FELD_REGELN,
  SYSTEM_PROMPT,
  BASIS_REGELN,
} from '../../shared/aktivitaetInhaltSpecs.js';

const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const requestLog = new Map();

function isRateLimited(userIdentifier) {
  if (!userIdentifier) return true;
  const now = Date.now();
  const key = `${userIdentifier}::generateWizardAktivitaetInhalt`;
  const timestamps = requestLog.get(key) || [];
  while (timestamps.length > 0 && now - timestamps[0] >= RATE_LIMIT_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

// Formate/Spezifikationen: base44/shared/aktivitaetInhaltSpecs.js

// unwrapLLM: gemeinsamer Helfer in base44/shared/llmUtils.js.

// ── Etappe 3: Web-Recherche für URL-Felder ───────────────────────────
const URL_CHECK_TIMEOUT_MS = 6000;

async function urlExistiert(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoolManagerBot/1.0; +https://base44.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    res.body?.cancel().catch(() => {});
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Recherchiert per KI-Websuche eine echte, existierende Quelle (URL) für
 * die Aktivität. Bei Video/Audio wird Studyflix bevorzugt. Jeder Kandidat
 * wird per HTTP-Check verifiziert — erfundene URLs werden verworfen.
 */
async function rechercheQuelle(base44, kontext, aktivitaetInfo, bevorzugtStudyflix) {
  const auftrag = bevorzugtStudyflix
    ? 'Finde ein passendes Lernvideo — BEVORZUGT auf studyflix.de (Format https://studyflix.de/...). Nur wenn es dort nichts Passendes gibt, weiche auf andere seriöse deutschsprachige Lernplattformen aus.'
    : 'Finde eine passende, seriöse deutschsprachige Webseite/Lernressource (z. B. studyflix.de, öffentlich-rechtliche Bildungsangebote, etablierte Lernportale).';

  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Du suchst Online-Lernmaterial für den Schulunterricht.

Kontext: Fach ${kontext.fach}, Jahrgangsstufe ${kontext.jahrgangsstufe}, Einheit „${kontext.einheit}", Lernpaket „${kontext.lernpaket}".
Lernziele: ${(kontext.lernziele || []).join(' | ') || '—'}
Briefing der Lehrkraft: ${kontext.briefing_der_lehrkraft || '—'}
Aktivität: ${aktivitaetInfo.typ} (Phase: ${aktivitaetInfo.phase})

${auftrag}

WICHTIG:
- Gib bis zu 4 Kandidaten zurück, den besten zuerst.
- Gib AUSSCHLIESSLICH echte, existierende URLs zurück. Erfinde keine URLs — im Zweifel weglassen.
- Zu jedem Kandidaten: titel und eine 1-Satz-Beschreibung des Inhalts.`,
    add_context_from_internet: true,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        kandidaten: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              titel: { type: 'string' },
              beschreibung: { type: 'string' },
            },
            required: ['url', 'titel'],
          },
        },
      },
      required: ['kandidaten'],
    },
  });

  const out = unwrapLLM(llmResponse);
  let kandidaten = (Array.isArray(out?.kandidaten) ? out.kandidaten : []).filter(
    (k) => k && typeof k.url === 'string' && k.url.trim() !== ''
  );
  if (bevorzugtStudyflix) {
    kandidaten = [
      ...kandidaten.filter((k) => k.url.includes('studyflix.de')),
      ...kandidaten.filter((k) => !k.url.includes('studyflix.de')),
    ];
  }
  for (const k of kandidaten.slice(0, 4)) {
    if (await urlExistiert(k.url.trim())) {
      return { url: k.url.trim(), titel: String(k.titel || ''), beschreibung: String(k.beschreibung || '') };
    }
  }
  return null;
}

function buildKontext(einheit, paket, lernziele) {
  return {
    fach: einheit.fach,
    jahrgangsstufe: einheit.jahrgangsstufe,
    einheit: einheit.titel_der_einheit,
    lernpaket: paket.titel_des_pakets,
    kernbegriffe: Array.isArray(paket.kernbegriffe) ? paket.kernbegriffe : [],
    lernziele: (lernziele || []).map((lz) => lz.formulierung_fachsprache).filter(Boolean),
    briefing_der_lehrkraft: paket.kreativ_briefing || '',
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isRateLimited(user.email)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { activityId } = body || {};
    if (!activityId) {
      return Response.json({ error: 'Missing activityId' }, { status: 400 });
    }

    const activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(activityId).catch(() => null);
    if (!activity || activity.sync_status === 'to_delete') {
      return Response.json({ error: 'Aktivität nicht gefunden.' }, { status: 404 });
    }

    // ── Nicht-destruktive Guards ─────────────────────────────────────
    if (activity.content_status === 'approved') {
      return Response.json({ success: false, skipped: true, reason: 'Aktivität ist freigegeben — wird nicht verändert.' });
    }
    if (activity.is_complete === true) {
      return Response.json({ success: false, skipped: true, reason: 'Aktivität ist bereits befüllt — wird nicht überschrieben.' });
    }

    // ── Zugriff prüfen (RLS via User-Kontext + Einheiten-Schreibrecht) ──
    const paket = await base44.entities.Lernpakete.get(activity.lernpaket_id).catch(() => null);
    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden.' }, { status: 404 });
    }
    const einheit = await base44.asServiceRole.entities.Einheiten.get(paket.einheit_id).catch(() => null);
    if (!einheit || !(await hasUnitWriteAccess(base44, user, einheit))) {
      return Response.json({ error: 'Forbidden: keine Schreibrechte für dieses Lernpaket' }, { status: 403 });
    }

    const katalogEintrag = await base44.asServiceRole.entities.AktivitaetenKatalog.get(activity.aktivitaet_id).catch(() => null);
    if (!katalogEintrag) {
      return Response.json({ error: 'Aktivitätstyp nicht gefunden.' }, { status: 404 });
    }

    const lernziele = await base44.asServiceRole.entities.Lernziele
      .filter({ lernpaket_id: paket.id }, undefined, 100)
      .catch(() => []);
    const kontext = buildKontext(einheit, paket, lernziele);
    const aktivitaetInfo = {
      typ: katalogEintrag.name,
      phase: activity.phase,
      beschreibung: katalogEintrag.beschreibung || '',
    };

    // Super-Wizard Etappe 4: Hat der Struktur-Wizard einen Umsetzungsplan
    // (ki_briefing mit Lernziel/Funktionsweise, ggf. quelle_url) hinterlegt,
    // wird er zur verbindlichen inhaltlichen Vorgabe für die Generierung.
    const wizardPlan = activity.ki_briefing && typeof activity.ki_briefing === 'object' ? activity.ki_briefing : null;
    if (wizardPlan?.offen?.funktionsweise || wizardPlan?.offen?.lernziel) {
      kontext.umsetzungsplan_des_wizards = wizardPlan.offen;
    }
    const planRegeln = kontext.umsetzungsplan_des_wizards
      ? ['Setze den unter umsetzungsplan_des_wizards beschriebenen inhaltlichen Plan genau um.']
      : [];

    // ── Aufgabeneditor Etappe 3: Beschreibungs-Pflicht ───────────────
    // Ohne inhaltliche Vorgabe der Lehrkraft wird nichts generiert.
    const aufgabenbeschreibung = String(
      wizardPlan?.idee || wizardPlan?.offen?.funktionsweise || wizardPlan?.offen?.lernziel || ''
    ).trim();
    if (!aufgabenbeschreibung) {
      return Response.json({
        success: false,
        skipped: true,
        reason: 'Keine Aufgabenbeschreibung vorhanden — bitte in der Übersicht ergänzen (was sollen die Schüler:innen machen?).',
      });
    }
    kontext.aufgabenbeschreibung_der_lehrkraft = aufgabenbeschreibung;

    // ── Etappe 3: An der Aktivität hinterlegte Materialien als Grundlage ──
    const materialUrls = (Array.isArray(activity.material_urls) ? activity.material_urls : [])
      .map((m) => String(m?.url || ''))
      .filter((u) => u.startsWith('http'))
      .slice(0, 10);
    const materialRegeln = materialUrls.length > 0
      ? ['Es sind Materialien der Lehrkraft angehängt (Dateien) — nutze sie als inhaltliche Grundlage und Vorlage für die Aufgabe.']
      : [];

    // ═════════════════════════════════════════════════════════════════
    // Pfad A: Masterfähiger Typ → EINE MasterAufgabe anlegen
    // ═════════════════════════════════════════════════════════════════
    if (katalogEintrag.supports_master === true) {
      const spez = MASTER_TYP_SPEZIFIKATIONEN[katalogEintrag.name];
      if (!spez) {
        return Response.json({
          success: false,
          skipped: true,
          reason: `Aufgabenformat „${katalogEintrag.name}" kann noch nicht automatisch befüllt werden.`,
        });
      }

      const vorhandeneMasters = await base44.asServiceRole.entities.MasterAufgabe
        .filter({ activity_id: activity.id }, undefined, 100)
        .catch(() => []);
      const liveMasters = (vorhandeneMasters || []).filter((m) => m.sync_status !== 'to_delete');
      if (liveMasters.length > 0) {
        return Response.json({
          success: false,
          skipped: true,
          reason: 'Aktivität hat bereits Master-Aufgaben — bitte dort weiterarbeiten.',
        });
      }

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: JSON.stringify([
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              kontext,
              aktivitaet: aktivitaetInfo,
              regeln: [...BASIS_REGELN, ...planRegeln, ...materialRegeln, ...spez.regeln],
            }),
          },
        ]),
        model: 'claude-sonnet-5',
        ...(materialUrls.length > 0 ? { file_urls: materialUrls } : {}),
        response_json_schema: spez.schema,
      });

      const unwrapped = unwrapLLM(llmResponse);
      const fieldValues = spez.build(unwrapped);
      if (!fieldValues) {
        console.warn('[generateWizardAktivitaetInhalt] build failed, raw LLM response:', JSON.stringify(llmResponse).slice(0, 1500));
        return Response.json({ success: false, error: 'KI-Inhalt unvollständig. Bitte erneut versuchen.' });
      }

      await base44.asServiceRole.entities.MasterAufgabe.create({
        activity_id: activity.id,
        lernpaket_id: activity.lernpaket_id,
        titel: 'KI-Entwurf',
        field_values: fieldValues,
        reihenfolge: 0,
        is_complete: true,
        content_status: 'draft',
        sync_status: 'new',
      });

      await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity.id, {
        is_complete: true,
        sync_status: activity.sync_status === 'synced' ? 'modified' : activity.sync_status,
      });

      console.log('[generateWizardAktivitaetInhalt] master created', { activity: activity.id, typ: katalogEintrag.name });
      return Response.json({ success: true, is_complete: true, mode: 'master' });
    }

    // ═════════════════════════════════════════════════════════════════
    // Pfad B: Normaler Typ → field_values anhand form_schema befüllen
    // ═════════════════════════════════════════════════════════════════
    const formSchema = Array.isArray(katalogEintrag.form_schema) ? katalogEintrag.form_schema : [];
    const existing = activity.field_values || {};
    const zuGenerieren = [];
    const urlFelder = [];

    for (const field of formSchema) {
      if (!field || !field.field_name || field.type === 'info') continue;
      if (!isEmptyValue(existing[field.field_name])) continue; // nie überschreiben

      // Etappe 3: URL-Felder werden per Web-Recherche befüllt.
      if (field.type === 'url') {
        urlFelder.push(field);
        continue;
      }

      if (NICHT_BEFUELLBARE_FELDTYPEN.has(field.type)) {
        if (field.required) {
          return Response.json({
            success: false,
            skipped: true,
            reason: `Benötigt externes Material („${field.label || field.field_name}") — bitte manuell befüllen.`,
          });
        }
        continue;
      }

      if (field.type === 'json') {
        const spez = JSON_FELD_SPEZIFIKATIONEN[field.field_name];
        if (!spez) {
          if (field.required) {
            return Response.json({
              success: false,
              skipped: true,
              reason: `Aufgabenformat „${katalogEintrag.name}" kann noch nicht automatisch befüllt werden.`,
            });
          }
          continue;
        }
        zuGenerieren.push({ field, schema: spez.schema, regel: spez.regel, validate: spez.validate });
        continue;
      }

      // text / textarea / number / select — generisch befüllbar.
      let schema;
      if (field.type === 'number') {
        schema = { type: 'number' };
      } else if (field.type === 'select') {
        const werte = (field.options || []).map((o) => o?.value).filter(Boolean);
        schema = werte.length > 0 ? { type: 'string', enum: werte } : { type: 'string' };
      } else {
        schema = { type: 'string' };
      }
      zuGenerieren.push({
        field,
        schema,
        regel: TEXT_FELD_REGELN[field.field_name] || null,
        validate: (v) => !isEmptyValue(v),
      });
    }

    // ── Etappe 3: Web-Recherche für URL-Felder (Studyflix bevorzugt) ──
    const rechercheWerte = {};
    let quelle = null;
    if (urlFelder.length > 0) {
      // Vom Struktur-Wizard bereits geplante Quelle zuerst prüfen — nur
      // wenn sie fehlt oder nicht erreichbar ist, wird neu recherchiert.
      const geplanteUrl = wizardPlan?.quelle_url ? String(wizardPlan.quelle_url).trim() : '';
      if (geplanteUrl && (await urlExistiert(geplanteUrl))) {
        quelle = { url: geplanteUrl, titel: '', beschreibung: 'Vom Super-Wizard geplante Quelle.' };
      } else {
        const bevorzugtStudyflix = /video|audio/i.test(katalogEintrag.name);
        quelle = await rechercheQuelle(base44, kontext, aktivitaetInfo, bevorzugtStudyflix);
      }
      if (!quelle) {
        if (urlFelder.some((f) => f.required)) {
          return Response.json({
            success: false,
            skipped: true,
            reason: 'Keine passende, existierende Online-Quelle gefunden — bitte manuell verlinken.',
          });
        }
      } else {
        for (const f of urlFelder) rechercheWerte[f.field_name] = quelle.url;
      }
    }

    if (zuGenerieren.length === 0 && Object.keys(rechercheWerte).length === 0) {
      return Response.json({ success: false, skipped: true, reason: 'Keine automatisch befüllbaren Felder gefunden.' });
    }

    let generated = {};
    if (zuGenerieren.length > 0) {
      const responseSchema = {
        type: 'object',
        properties: {
          field_values: {
            type: 'object',
            properties: Object.fromEntries(zuGenerieren.map((z) => [z.field.field_name, z.schema])),
            required: zuGenerieren.map((z) => z.field.field_name),
            additionalProperties: false,
          },
        },
        required: ['field_values'],
      };

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: JSON.stringify([
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              kontext,
              aktivitaet: aktivitaetInfo,
              ...(quelle ? { gefundene_quelle: quelle } : {}),
              zu_befuellende_felder: zuGenerieren.map((z) => ({
                field_name: z.field.field_name,
                label: z.field.label,
                hinweis: z.field.placeholder || '',
                regel: z.regel || 'Inhaltlich passend zum Kontext befüllen.',
              })),
              regeln: [
                ...BASIS_REGELN,
                ...planRegeln,
                ...materialRegeln,
                ...(quelle
                  ? ['Beziehe Texte (z. B. Titel, Aufgabentext) konkret auf die unter gefundene_quelle angegebene Quelle.']
                  : []),
              ],
            }),
          },
        ]),
        model: 'claude-sonnet-5',
        ...(materialUrls.length > 0 ? { file_urls: materialUrls } : {}),
        response_json_schema: responseSchema,
      });

      generated = unwrapLLM(llmResponse)?.field_values || {};
    }

    // Validieren + mergen (nur leere Felder werden gesetzt).
    const merged = { ...existing, ...rechercheWerte };
    const probleme = [];
    for (const z of zuGenerieren) {
      const val = generated[z.field.field_name];
      if (z.validate(val)) {
        merged[z.field.field_name] = val;
      } else if (z.field.required) {
        probleme.push(z.field.label || z.field.field_name);
      }
    }
    if (probleme.length > 0) {
      return Response.json({
        success: false,
        error: `KI-Inhalt unvollständig (${probleme.join(', ')}). Bitte erneut versuchen.`,
      });
    }

    // Vollständigkeit über alle Pflichtfelder berechnen.
    const isComplete = formSchema.every((f) => {
      if (!f || !f.field_name || f.type === 'info' || !f.required) return true;
      const spez = f.type === 'json' ? JSON_FELD_SPEZIFIKATIONEN[f.field_name] : null;
      const v = merged[f.field_name];
      return spez ? !!spez.validate(v) : !isEmptyValue(v);
    });

    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity.id, {
      field_values: merged,
      is_complete: isComplete,
      sync_status: activity.sync_status === 'synced' ? 'modified' : activity.sync_status,
    });

    const befuellteFelder = [...Object.keys(rechercheWerte), ...zuGenerieren.map((z) => z.field.field_name)];
    console.log('[generateWizardAktivitaetInhalt] filled', {
      activity: activity.id,
      typ: katalogEintrag.name,
      felder: befuellteFelder,
      quelle: quelle?.url || null,
      is_complete: isComplete,
    });

    return Response.json({
      success: true,
      is_complete: isComplete,
      mode: 'fields',
      felder: befuellteFelder,
      quelle: quelle ? { url: quelle.url, titel: quelle.titel } : null,
    });
  } catch (error) {
    console.error('[generateWizardAktivitaetInhalt] error', error);
    return Response.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
});