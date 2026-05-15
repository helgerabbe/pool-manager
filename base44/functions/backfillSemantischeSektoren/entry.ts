/**
 * backfillSemantischeSektoren
 *
 * Idempotenter Migrations-Endpoint für die Lernpfad-Konfigurationen.
 * Re-run safe — kann mehrfach hintereinander ausgeführt werden, ohne
 * Daten zu beschädigen.
 *
 * Aufgaben:
 *
 *   1. Sektor-Felder ergänzen (Phase A / Schema v3):
 *      - sektor_typ:      default 'individuell'.
 *      - themenfeld_id:   default null.
 *      - titel_snapshot:  default null.
 *
 *   2. Bündel-Modus migrieren (Schema v3 / §5 des Epics):
 *      Jedes Item, dessen ref_id auf einen Baustein mit
 *      baustein_modus='bundle_1ton' zeigt, bekommt `bundle_config.modus`:
 *        - accepted_types ⊇ ['lernpaket']        → 'sequenziell' (Moodle)
 *        - accepted_types ⊇ ['auswahl_buendel'] → 'frei' (Aufgabenbündel)
 *        - accepted_types ⊇ ['projekt']          → 'frei' (Projektbündel)
 *      Bestehende bundle_config-Werte werden NICHT überschrieben.
 *
 *   3. Sektor-Gating (Schema v4):
 *      - `bearbeitungsmodus` pro Sektor setzen, falls fehlend, anhand der
 *        Default-Tabelle (Sektor-Typ × Lerntyp): Passioniert hat 'frei'
 *        bei Arbeitsphase/Test/Projekt, alle anderen 'sequenziell'.
 *      - Altes Feld `modus` wird entfernt (war hart auf 'sequenziell'
 *        fixiert und ist seit v4 durch `bearbeitungsmodus` abgelöst).
 *      - Bei `bearbeitungsmodus === 'sequenziell'` wird automatisch ein
 *        sys_sektor_abschluss-Baustein als letztes Root-Item eingefügt,
 *        falls noch keiner existiert (Variante A: immer wieder einfügen,
 *        wenn fehlend).
 *
 *   4. Schema-Version auf 4 hochziehen.
 *
 * Sicherheit: Admin-only (User.role === 'admin' ODER Benutzer.rolle ===
 * 'Administrator').
 *
 * Auch gesperrte Pfade werden migriert: es ist reines Schema-Setting von
 * Defaults, kein inhaltlicher Eingriff.
 *
 * @MIGRATION_NOTE Supabase:
 * Clientseitiges Herunterladen, Parsen und Zurückschreiben komplexer JSON-
 * Strukturen ist in PostgreSQL ein Anti-Pattern. Diese Migration sollte dort
 * als set-basiertes SQL-/PLpgSQL-Update mit nativen JSONB-Funktionen wie
 * jsonb_set und jsonb_build_object direkt auf Datenbankebene laufen.
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
  'feedback',
]);

const DEFAULT_SEKTOR_TYP = 'individuell';

// Schema v4: Spiegel von lib/sektorTypen.js (Deno hat keine src-Imports).
const SEKTOR_ABSCHLUSS_BAUSTEIN_ID = 'sys_sektor_abschluss';
const TARGET_SCHEMA_VERSION = 4;
const PAGE_SIZE = 100;
const UPDATE_BATCH_SIZE = 10;
const MAX_PAGES = 200;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function listAll(entitySdk, sort = 'created_date') {
  const all = [];
  let skip = 0;

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const page = await entitySdk.list(sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

/**
 * Default-bearbeitungsmodus pro Sektor-Typ × Lerntyp. Spiegelt
 * lib/sektorTypen.js#getDefaultBearbeitungsmodus.
 */
function defaultBearbeitungsmodus(sektorTyp, lerntyp) {
  const isPassioniert = lerntyp === 'passioniert';
  switch (sektorTyp) {
    case 'ueberblick':
    case 'individuell':
      return 'frei';
    case 'onboarding':
    case 'feedback':
      return 'sequenziell';
    case 'arbeitsphase_themenfeld':
    case 'zwischentest':
    case 'abschlusstest':
    case 'projekte':
      return isPassioniert ? 'frei' : 'sequenziell';
    default:
      return 'sequenziell';
  }
}

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
  const stats = {
    sektorenTouched: 0,
    bundlesTouched: 0,
    abschlussInserted: 0,
    legacyModusRemoved: 0,
  };
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

      // Schema v4: bearbeitungsmodus aus Default-Tabelle ableiten,
      // falls fehlend / ungültig.
      const bearbeitungsmodus = (safe.bearbeitungsmodus === 'sequenziell' || safe.bearbeitungsmodus === 'frei')
        ? safe.bearbeitungsmodus
        : defaultBearbeitungsmodus(sektorTyp, lerntyp);
      if (bearbeitungsmodus !== safe.bearbeitungsmodus) sektorChanged = true;

      // Altes Feld `modus` entfernen — wird seit v4 durch
      // `bearbeitungsmodus` abgelöst.
      const hasLegacyModus = 'modus' in safe;
      if (hasLegacyModus) {
        sektorChanged = true;
        stats.legacyModusRemoved += 1;
      }

      // 2. Bündel-Modus migrieren.
      const items = Array.isArray(safe.items) ? safe.items : [];
      let newItems = items.map((it) => {
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

      // 3. Schema v4 — Auto-Insert sys_sektor_abschluss bei
      //    sequenziellen Sektoren (Variante A: immer einfügen, falls
      //    fehlend; respektiert Lehrer-Vorrang nur, wenn der Baustein
      //    schon irgendwo im Sektor steht).
      if (bearbeitungsmodus === 'sequenziell') {
        const hasAbschluss = newItems.some(
          (it) => it && it.type === 'system'
            && it.ref_id === SEKTOR_ABSCHLUSS_BAUSTEIN_ID
            && !it.parent_instance_id
        );
        if (!hasAbschluss) {
          newItems = [
            ...newItems,
            { type: 'system', ref_id: SEKTOR_ABSCHLUSS_BAUSTEIN_ID },
          ];
          sektorChanged = true;
          stats.abschlussInserted += 1;
        }
      }

      if (sektorChanged) {
        changed = true;
        stats.sektorenTouched += 1;
      }

      // Altes `modus`-Feld bewusst NICHT durchreichen.
      const { modus: _legacyModus, ...withoutLegacy } = safe;
      return {
        ...withoutLegacy,
        sektor_typ: sektorTyp,
        themenfeld_id: themenfeldId,
        titel_snapshot: titelSnapshot,
        bearbeitungsmodus,
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

    // Bündel-Metadaten vollständig laden, einmalig.
    const allBausteine = await listAll(base44.asServiceRole.entities.SystemBausteine);
    const bundleMetaById = new Map();
    for (const b of allBausteine) {
      bundleMetaById.set(b.baustein_id, {
        baustein_modus: b.baustein_modus,
        accepted_types: Array.isArray(b.accepted_types) ? b.accepted_types : [],
      });
    }

    const result = {
      dry_run: dryRun,
      target_schema_version: TARGET_SCHEMA_VERSION,
      einheiten: {
        total: 0,
        migrated: 0,
        already_current: 0,
        already_current_json: 0,
        no_konfig: 0,
        bundles_touched: 0,
        sektoren_touched: 0,
        abschluss_inserted: 0,
        legacy_modus_removed: 0,
        errors: [],
      },
    };

    let skip = 0;
    while (true) {
      // Stabilere Reihenfolge als -created_date: neue Einheiten werden ans Ende angehängt.
      const page = await base44.asServiceRole.entities.Einheiten.list('created_date', PAGE_SIZE, skip);
      if (!page || page.length === 0) break;

      const pageUpdates = [];

      for (const einheit of page) {
        result.einheiten.total += 1;

        if (einheit.lernpfade_schema_version === TARGET_SCHEMA_VERSION) {
          result.einheiten.already_current += 1;
          continue;
        }

        if (!einheit.lernpfade_konfiguration) {
          if (!dryRun) {
            pageUpdates.push({
              einheitId: einheit.id,
              payload: { lernpfade_schema_version: TARGET_SCHEMA_VERSION },
            });
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
        result.einheiten.abschluss_inserted += stats.abschlussInserted;
        result.einheiten.legacy_modus_removed += stats.legacyModusRemoved;

        if (!dryRun) {
          pageUpdates.push({
            einheitId: einheit.id,
            payload: {
              lernpfade_konfiguration: konfiguration,
              lernpfade_schema_version: TARGET_SCHEMA_VERSION,
            },
          });
        }

        if (changed) result.einheiten.migrated += 1;
        else result.einheiten.already_current_json += 1;
      }

      for (const batch of chunkArray(pageUpdates, UPDATE_BATCH_SIZE)) {
        const outcomes = await Promise.allSettled(
          batch.map(({ einheitId, payload }) =>
            base44.asServiceRole.entities.Einheiten.update(einheitId, payload)
              .then(() => ({ einheitId }))
          )
        );

        outcomes.forEach((outcome, index) => {
          if (outcome.status === 'rejected') {
            result.einheiten.errors.push({
              einheit_id: batch[index].einheitId,
              error: outcome.reason?.message || String(outcome.reason),
            });
          }
        });
      }

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
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