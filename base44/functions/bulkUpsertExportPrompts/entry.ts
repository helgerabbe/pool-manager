/**
 * bulkUpsertExportPrompts.js
 *
 * Schreibt mehrere ExportPrompts-Records in einem einzigen Backend-Roundtrip.
 *
 * Performance-Hintergrund: Der Bulk-Generator im Frontend ruft sonst pro Prompt
 * einen einzelnen upsert-Call. Bei einer realen Einheit mit ~30 Prompts macht
 * das 30 sequentielle Roundtrips. Diese Funktion bündelt das.
 *
 * Sicherheit:
 *   - Authentifizierter User wird via Base44-SDK validiert.
 *   - Nur Rollen, die ExportPrompts schreiben dürfen (admin / Administrator /
 *     Moodle-Designer), werden zugelassen — passend zu den Entity-RLS.
 *   - einheit_id wird pro Item geprüft — alle Items müssen zur selben Einheit
 *     gehören (verhindert Cross-Einheit-Schreibversuche).
 *
 * Payload:
 *   {
 *     einheit_id: string,
 *     items: Array<{
 *       prompt_type: 'nucleus'|'persona'|'sektor_anweisung'|'erstellungspaket',
 *       reference_id: string|null,
 *       content: string,
 *       is_customized: boolean,
 *       source_updated_at: string,
 *       template_version: string,
 *     }>
 *   }
 *
 * Antwort:
 *   { created: number, updated: number, skipped: number, errors: Array<{...}> }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = new Set(['admin', 'Administrator', 'Moodle-Designer']);
const ALLOWED_PROMPT_TYPES = new Set(['nucleus', 'persona', 'sektor_anweisung', 'erstellungspaket']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rolle aus Benutzer-Profil holen (gleiche Logik wie in den anderen
    // secure-Functions): zuerst die User-Entity, dann die Benutzer-Entity.
    const userRole = user.role || null;
    const benutzerProfile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profileRolle = benutzerProfile?.[0]?.rolle || null;
    const effectiveRole = userRole === 'admin' ? 'admin' : (profileRolle || userRole);

    if (!ALLOWED_ROLES.has(effectiveRole)) {
      return Response.json(
        { error: 'Forbidden: ExportPrompts schreiben erfordert Admin oder Moodle-Designer.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { einheit_id, items } = body;
    if (!einheit_id || typeof einheit_id !== 'string') {
      return Response.json({ error: 'einheit_id is required' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    // Alle vorhandenen Prompts dieser Einheit einmal laden, damit wir pro Item
    // create vs. update entscheiden können — ohne pro Item einen filter().
    // Wir nutzen den User-Kontext (nicht Service-Role), damit die RLS-Policies
    // der ExportPrompts-Entity gelten — die Rolle wurde oben bereits geprüft.
    const existing = await base44.entities.ExportPrompts.filter({ einheit_id });
    const existingByKey = new Map();
    for (const p of existing) {
      const key = `${p.prompt_type}::${p.reference_id || 'null'}`;
      existingByKey.set(key, p);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      try {
        if (!ALLOWED_PROMPT_TYPES.has(item.prompt_type)) {
          skipped += 1;
          errors.push({ item, reason: 'invalid prompt_type' });
          continue;
        }
        const referenceId = item.reference_id || null;
        const key = `${item.prompt_type}::${referenceId || 'null'}`;
        const payload = {
          einheit_id,
          prompt_type: item.prompt_type,
          reference_id: referenceId,
          content: item.content || '',
          is_customized: !!item.is_customized,
          source_updated_at: item.source_updated_at || new Date().toISOString(),
          template_version: item.template_version || null,
        };
        const found = existingByKey.get(key);
        if (found) {
          await base44.entities.ExportPrompts.update(found.id, payload);
          updated += 1;
        } else {
          const newRec = await base44.entities.ExportPrompts.create(payload);
          // damit ein nachfolgender Eintrag mit gleichem Key (sollte nicht
          // vorkommen, aber sicher ist sicher) geupdated wird:
          existingByKey.set(key, newRec);
          created += 1;
        }
      } catch (e) {
        errors.push({ item, reason: e?.message || 'unknown' });
      }
    }

    return Response.json({ created, updated, skipped, errors });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});