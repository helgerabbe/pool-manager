/**
 * updateSchulNomenklaturSecure.js
 *
 * Upsert eines `SchulNomenklatur`-Datensatzes (pro Fach genau einer).
 * Schreibt mit Service-Role und umgeht damit die admin-only RLS auf der
 * Entity, prüft aber selbst hart, dass der Aufrufer berechtigt ist:
 *   - Plattform-Admin (user.role === 'admin'), oder
 *   - App-Rolle Administrator, oder
 *   - App-Rolle Fachschaftsleitung MIT `fach` in `fachbereich_zustaendigkeit`.
 *
 * Andere Rollen (Fachlehrkraft, Betrachter, Moodle-Designer) dürfen die
 * Schul-Nomenklatur NICHT bearbeiten — sie ist eine schulweite Konvention,
 * keine unterrichtsspezifische Einstellung.
 *
 * Payload:
 *   { fach: string, conventions: Array<{key,value}>, global_style?: string, ist_aktiv?: boolean }
 *
 * Antwort: { ok: true, record: object, created: boolean }
 *
 * Validierung:
 *   - `fach` Pflicht, 1–100 Zeichen.
 *   - `conventions` max. 100 Einträge, key/value je 1–200 Zeichen.
 *   - `global_style` max. 2000 Zeichen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLE_ADMIN = 'Administrator';
const ROLLE_FACHSCHAFT = 'Fachschaftsleitung';

const MAX_CONVENTIONS = 100;
const MAX_KEY_LEN = 200;
const MAX_VALUE_LEN = 200;
const MAX_STYLE_LEN = 2000;
const MAX_FACH_LEN = 100;

async function logAuditEvent(base44, event) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: 1,
      status: event.status || 'success',
    });
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

function normalizeConventions(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((c) => ({
      key: typeof c?.key === 'string' ? c.key.trim() : '',
      value: typeof c?.value === 'string' ? c.value.trim() : '',
    }))
    .filter((c) => c.key && c.value);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { fach, conventions, global_style, ist_aktiv } = payload;

    // ── Validierung ─────────────────────────────────────────────────────
    if (typeof fach !== 'string' || !fach.trim() || fach.length > MAX_FACH_LEN) {
      return Response.json({ error: 'fach is required (1–100 chars)' }, { status: 400 });
    }
    const fachNorm = fach.trim();

    const cleanConventions = normalizeConventions(conventions);
    if (cleanConventions.length > MAX_CONVENTIONS) {
      return Response.json(
        { error: `Max. ${MAX_CONVENTIONS} Conventions pro Fach.` },
        { status: 400 }
      );
    }
    const tooLong = cleanConventions.find(
      (c) => c.key.length > MAX_KEY_LEN || c.value.length > MAX_VALUE_LEN
    );
    if (tooLong) {
      return Response.json(
        { error: `Convention key/value max. ${MAX_KEY_LEN}/${MAX_VALUE_LEN} Zeichen.` },
        { status: 400 }
      );
    }

    const styleNorm = typeof global_style === 'string' ? global_style.trim() : '';
    if (styleNorm.length > MAX_STYLE_LEN) {
      return Response.json(
        { error: `global_style max. ${MAX_STYLE_LEN} Zeichen.` },
        { status: 400 }
      );
    }

    // ── Autorisierung ───────────────────────────────────────────────────
    let darfPflegen = user.role === 'admin';
    let rolleApp = null;
    let zustaendigkeit = [];
    if (!darfPflegen) {
      const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
      rolleApp = profil?.rolle || null;
      zustaendigkeit = Array.isArray(profil?.fachbereich_zustaendigkeit) ? profil.fachbereich_zustaendigkeit : [];

      if (rolleApp === ROLLE_ADMIN) {
        darfPflegen = true;
      } else if (rolleApp === ROLLE_FACHSCHAFT) {
        // Fachschaftsleitung: nur eigene Fächer.
        darfPflegen = zustaendigkeit.includes(fachNorm);
      }
    }
    if (!darfPflegen) {
      return Response.json(
        {
          error:
            'Forbidden: Nur Administrator oder die zuständige Fachschaftsleitung dürfen die Schul-Nomenklatur bearbeiten.',
          debug: { fach: fachNorm, rolleApp, zustaendigkeit },
        },
        { status: 403 }
      );
    }

    // ── Upsert über `fach` ──────────────────────────────────────────────
    const existing = (await base44.asServiceRole.entities.SchulNomenklatur.filter({ fach: fachNorm }))?.[0] || null;

    const data = {
      fach: fachNorm,
      conventions: cleanConventions,
      global_style: styleNorm,
      ist_aktiv: typeof ist_aktiv === 'boolean' ? ist_aktiv : (existing?.ist_aktiv ?? true),
    };

    let record;
    let created = false;
    if (existing) {
      await base44.asServiceRole.entities.SchulNomenklatur.update(existing.id, data);
      record = await base44.asServiceRole.entities.SchulNomenklatur.get(existing.id);
    } else {
      record = await base44.asServiceRole.entities.SchulNomenklatur.create(data);
      created = true;
    }

    await logAuditEvent(base44, {
      user: user.email,
      action: created ? 'CREATE' : 'UPDATE',
      resource: 'SchulNomenklatur',
      resourceId: record.id,
      changes: {
        fach: fachNorm,
        conventions_count: cleanConventions.length,
        has_global_style: !!styleNorm,
        ist_aktiv: data.ist_aktiv,
      },
      status: 'success',
    });

    return Response.json({ ok: true, record, created });
  } catch (error) {
    console.error('[updateSchulNomenklaturSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});