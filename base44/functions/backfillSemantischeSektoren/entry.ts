/**
 * backfillSemantischeSektoren
 *
 * One-shot Backfill für das Epic „Semantische Dashboard-Sektoren" (Phase A).
 *
 * Drei Aufgaben (alle idempotent, re-run safe):
 *
 *   1. Sektor-Felder ergänzen:
 *      - sektor_typ:      default 'individuell' (siehe Frage 13).
 *      - themenfeld_id:   default null.
 *      - titel_snapshot:  default null.
 *      - modus:           hart auf 'sequenziell' fixiert (siehe Frage 1).
 *
 *   2. Bündel-Modus migrieren (siehe §5 des Epics):
 *      Jedes Item, dessen ref_id auf einen Baustein mit
 *      baustein_modus='bundle_1ton' zeigt, bekommt `bundle_config.modus`:
 *        - accepted_types ⊇ ['lernpaket']        → 'sequenziell' (Moodle)
 *        - accepted_types ⊇ ['auswahl_buendel'] → 'frei' (Aufgabenbündel)
 *        - accepted_types ⊇ ['projekt']          → 'frei' (Projektbündel)
 *      Bestehende bundle_config-Werte werden NICHT überschrieben (z. B.
 *      eine bereits gesetzte erforderliche_anzahl bleibt erhalten).
 *
 *   3. Schema-Version auf 3 hochziehen.
 *
 * Sicherheit: Admin-only (User.role === 'admin' ODER Benutzer.rolle ===
 * 'Administrator'), analog zu migrateLernpfadeToInstanceIds.
 *
 * Auch gesperrte Pfade werden migriert (Frage 14): es ist reines
 * Schema-Setting von Defaults, kein inhaltlicher Eingriff.
 *
 * @MIGRATION_NOTE (Supabase): Bei der Supabase-Migration entfällt diese
 * Function. Schema v3 wird DDL-mäßig erzwungen und ein einmaliges SQL-Skript
 * backfilled die JSON-Spalte.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LERN_TYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

const VALID_SEKTOR_TYPEN = new Set([
  'onboarding',
  'ueberblick',
  'arbeitsphase_themenfeld',
  'zwischentest',
  'abschlusstest',
  'projekte',
  'individuell',
]);

const DEFAULT_SEKTOR_TYP = 'individuell';

/**
 * Bündel-Kind aus accepted_types ableiten — Spiegel von
 * lib/sektorTypen.js#getBundleKindByAcceptedTypes (Deno hat keine
 * lokalen Imports auf src/).
 */
function bundleKindFromAcceptedTypes(acceptedTypes) {
  if (!Array.isArray(acceptedTypes) || acceptedTypes.length === 0) return null;
  if (acceptedTypes.includes('lernpaket')) return 'lernpakete';
  if (acceptedTypes.includes('auswahl_buendel')) return 'aufgaben';
  if (acceptedTypes.includes('projekt')) return 'projekte';
  return null;
}

function defaultBundleModus(bundleKind) {
  if (bundleKind === 'lernpakete') return 'sequenziell';
  return 'frei';
}

async function isAdmin(base44, user) {
  if (user?.role === 'admin') return true;
  try {
    const profile = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    return profile?.[0]?.rolle === 'Administrator';
  } catch {
    return false;
  }
}

/**
 * Migriert eine einzelne lernpfade_konfiguration.
 * @param konfig         Ist-Zustand aus DB.
 * @param bundleMetaById Map<ref_id, {modus: 'bundle_1ton', accepted_types}>
 * @returns { konfiguration, changed, stats }
 */
function migrateKonfig(konfig, bundleMetaById) {
  const next = {};
  const stats = { sektorenTouched: 0, bundlesTouched: 0 };
  let changed = false;

  for (const lerntyp of LERN_TYPEN) {
    const sektoren = Array.isArray(konfig?.[lerntyp]) ? konfig[lerntyp] : [];
    next[lerntyp] = sektoren.map((sektor) => {
      const safe = sektor || {};
      let sektorChanged = false;

      // 1. Sektor-Defaults
      const sektorTyp = VALID_SEKTOR_TYPEN.has(safe.sektor_typ)
        ? safe.sektor_typ
        : DEFAULT_SEKTOR_TYP;
      if (sektorTyp !== safe.sektor_typ) sektorChanged = true;

      const themenfeldId =
        sektorTyp === 'arbeitsphase_themenfeld' && typeof safe.themenfeld_id === 'string' && safe.themenfeld_id
          ? safe.themenfeld_id
          : null;
      if ((safe.themenfeld_id ?? null) !== themenfeldId) sektorChanged = true;

      const titelSnapshot =
        sektorTyp === 'arbeitsphase_themenfeld' && typeof safe.titel_snapshot === 'string'
          ? safe.titel_snapshot
          : null;
      if ((safe.titel_snapshot ?? null) !== titelSnapshot) sektorChanged = true;

      // Modus immer hart 'sequenziell'.
      const modus = 'sequenziell';
      if (safe.modus !== modus) sektorChanged = true;

      // 2. Bündel-Modus migrieren.
      const items = Array.isArray(safe.items) ? safe.items : [];
      const newItems = items.map((it) => {
        if (!it || it.type !== 'system' || !it.ref_id) return it;
        const meta = bundleMetaById.get(it.ref_id);
        if (!meta || meta.baustein_modus !== 'bundle_1ton') return it;
        // Bündel: bundle_config.modus sicherstellen.
        const prevConfig = it.bundle_config || {};
        if (prevConfig.modus === 'sequenziell' || prevConfig.modus === 'frei') {
          return it; // schon gesetzt
        }
        const kind = bundleKindFromAcceptedTypes(meta.accepted_types);
        const modusForBundle = defaultBundleModus(kind);
        sektorChanged = true;
        stats.bundlesTouched += 1;
        return {
          ...it,
          bundle_config: { ...prevConfig, modus: modusForBundle },
        };
      });

      if (sektorChanged) {
        changed = true;
        stats.sektorenTouched += 1;
      }

      return {
        ...safe,
        sektor_typ: sektorTyp,
        themenfeld_id: themenfeldId,
        titel_snapshot: titelSnapshot,
        modus,
        items: newItems,
      };
    });
  }

  return { konfiguration: next, changed, stats };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(base44, user))) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    // Bündel-Metadaten laden, einmalig.
    const allBausteine = await base44.asServiceRole.entities.SystemBausteine.list();
    const bundleMetaById = new Map();
    for (const b of allBausteine) {
      bundleMetaById.set(b.baustein_id, {
        baustein_modus: b.baustein_modus,
        accepted_types: Array.isArray(b.accepted_types) ? b.accepted_types : [],
      });
    }

    const result = {
      dry_run: dryRun,
      einheiten: {
        total: 0,
        migrated: 0,
        already_v3: 0,
        no_konfig: 0,
        bundles_touched: 0,
        sektoren_touched: 0,
        errors: [],
      },
    };

    let skip = 0;
    const PAGE = 100;
    while (true) {
      const page = await base44.asServiceRole.entities.Einheiten.list('-created_date', PAGE, skip);
      if (!page || page.length === 0) break;

      for (const einheit of page) {
        result.einheiten.total += 1;

        if (einheit.lernpfade_schema_version === 3) {
          result.einheiten.already_v3 += 1;
          continue;
        }

        if (!einheit.lernpfade_konfiguration) {
          if (!dryRun) {
            try {
              await base44.asServiceRole.entities.Einheiten.update(einheit.id, {
                lernpfade_schema_version: 3,
              });
            } catch (e) {
              result.einheiten.errors.push({ einheit_id: einheit.id, error: e?.message });
            }
          }
          result.einheiten.no_konfig += 1;
          continue;
        }

        const { konfiguration, changed, stats } = migrateKonfig(
          einheit.lernpfade_konfiguration,
          bundleMetaById
        );

        result.einheiten.bundles_touched += stats.bundlesTouched;
        result.einheiten.sektoren_touched += stats.sektorenTouched;

        if (!dryRun) {
          try {
            await base44.asServiceRole.entities.Einheiten.update(einheit.id, {
              lernpfade_konfiguration: konfiguration,
              lernpfade_schema_version: 3,
            });
          } catch (e) {
            result.einheiten.errors.push({ einheit_id: einheit.id, error: e?.message });
            continue;
          }
        }
        if (changed) result.einheiten.migrated += 1;
        else result.einheiten.no_konfig += 1;
      }

      if (page.length < PAGE) break;
      skip += PAGE;
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('[backfillSemantischeSektoren] Error:', error);
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
});