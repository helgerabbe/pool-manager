/**
 * migrateLernpfadeToInstanceIds
 *
 * One-shot Backfill für das Dashboard-Epic Phase 1 (siehe Logbuch §18).
 *
 * Zwei Aufgaben:
 *
 *   1. SystemBausteine: Setzt baustein_modus + accepted_types auf jedem
 *      bekannten Baustein nach dem M4-Mapping. Idempotent — re-run safe.
 *      Seedet zusätzlich den neuen Baustein 'sys_themenfeld_intro' (static).
 *
 *   2. Einheiten: Migriert lernpfade_konfiguration vom flachen Legacy-Format
 *      auf das neue Schema mit Instanz-IDs:
 *
 *      Vorher (Schema v1):
 *        items: [ { type: 'aufgabe',  ref_id: '...' },
 *                 { type: 'system',   ref_id: 'sys_xxx' } ]
 *
 *      Nachher (Schema v2):
 *        items: [ { instance_id: 'inst_<uuid>',
 *                   type: 'aufgabe' | 'system',
 *                   ref_id: '...',
 *                   parent_instance_id: null } ]
 *
 *      In v2 hat jedes Item eine eigene instance_id. parent_instance_id ist
 *      beim Backfill IMMER null (Bündel-Hierarchie wird erst durch User-DnD
 *      in Phase 2/3 entstehen — der Backfill erfindet keine Hierarchien).
 *
 * Kompletter Backfill, Schema-Version wird auf 2 gesetzt. Re-runs überspringen
 * bereits migrierte Einheiten (lernpfade_schema_version === 2).
 *
 * Sicherheit: Admin-only (User.role === 'admin' ODER Benutzer.rolle ===
 * 'Administrator'). Kein anderer Pfad darf diese Function triggern.
 *
 * @MIGRATION_NOTE (Supabase): Bei der Supabase-Migration entfällt diese
 * Function vollständig. Schema v2 wird DDL-mäßig erzwungen, ein einmaliges
 * SQL-Skript backfilled die JSON-Spalte. Diese JS-Function ist explizit ein
 * Übergangs-Konstrukt für das aktuelle Base44-Setup.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── M4-Mapping: SystemBausteine → baustein_modus + accepted_types ───────────
// Single Source of Truth für die Initial-Migration.
// Bekannte baustein_id-Werte werden hier explizit gemappt; alle anderen
// (z. B. zukünftig manuell angelegte) bleiben auf 'static' / [] – sicherer
// Default, der weder UI-Drop-Zone noch Strict-Drop aktiviert.
const BAUSTEIN_MAPPING = {
  // ── Statische Info-Anker (keine Drop-Zone) ───────────────────────────────
  sys_sec0_overview:       { baustein_modus: 'static', accepted_types: [] },
  sys_sec0_qblock:         { baustein_modus: 'static', accepted_types: [] },
  sys_diagnose_entry:      { baustein_modus: 'static', accepted_types: [] },
  sys_map_reduced:         { baustein_modus: 'static', accepted_types: [] },
  sys_map_full:            { baustein_modus: 'static', accepted_types: [] },
  sys_external_test:       { baustein_modus: 'static', accepted_types: [] },
  sys_exam_register:       { baustein_modus: 'static', accepted_types: [] },
  sys_themenfeld_intro:    { baustein_modus: 'static', accepted_types: [] },

  // ── 1:1-Platzhalter ──────────────────────────────────────────────────────
  // Reflexion: prozess- oder handlungsorientierte Aufgaben.
  sys_platzhalter_reflexion:      { baustein_modus: 'placeholder_1to1', accepted_types: ['prozess', 'handlung'] },
  // Zwischentest: ein einzelnes Lernpaket (test_only-Logik).
  sys_platzhalter_zwischentest:   { baustein_modus: 'placeholder_1to1', accepted_types: ['lernpaket'] },

  // ── 1:n-Bündel (lila Container, Pool-Modus für Export) ───────────────────
  // Lernpakete-Bündel (Moodle-Bündel).
  sys_platzhalter_moodle_buendel: { baustein_modus: 'bundle_1ton', accepted_types: ['lernpaket'] },
  // Aufgabenbündel (ehem. Brian-Bündel) – nimmt mehrere auswahl_buendel-Aufgaben auf.
  sys_platzhalter_brian_buendel:  { baustein_modus: 'bundle_1ton', accepted_types: ['auswahl_buendel'] },
  // Projektbündel – nimmt mehrere Projekt-Aufgaben (Ebene 3) auf.
  sys_projektbuendel:             { baustein_modus: 'bundle_1ton', accepted_types: ['projekt'] },

  // ── M4-Addendum (2026-04-27): Legacy-IDs, die aus historischen Sektor-
  //    Templates noch aktiv referenziert werden, im Erst-Backfill aber
  //    ungemappt blieben.
  sys_platzhalter_info:      { baustein_modus: 'static',           accepted_types: [] },
  sys_platzhalter_handlung:  { baustein_modus: 'placeholder_1to1', accepted_types: ['handlung'] },
  sys_platzhalter_projekt:   { baustein_modus: 'placeholder_1to1', accepted_types: ['projekt_anker'] },
  // Legacy-Alias für sys_platzhalter_zwischentest. Cleanup (alle ref_ids
  // umschreiben + Eintrag deaktivieren) ist ein separates Folge-Ticket.
  sys_zwischentest:          { baustein_modus: 'placeholder_1to1', accepted_types: ['lernpaket'] },
};

// Neu zu seedende Bausteine, die bisher nicht in der DB liegen.
// (Im Screenshot sichtbar als „Einführung in das Themenfeld" — laut M4b
// existiert dieser Datensatz nicht, also legen wir ihn hier an.)
const BAUSTEINE_TO_SEED = [
  {
    baustein_id: 'sys_themenfeld_intro',
    titel: 'Einführung in das Themenfeld',
    icon: 'info',
    admin_beschreibung:
      'Statischer Info-Anker: Hier wird beim Export eine kurze Einführung in das Themenfeld eingeblendet. Keine Drop-Zone.',
    export_instruktion:
      'Zeige dem Schüler eine kurze Einführung in das aktuelle Themenfeld – Zielsetzung, zentrale Begriffe, Erwartungshorizont.',
    ist_aktiv: true,
    reihenfolge: 6,
    baustein_modus: 'static',
    accepted_types: [],
  },
];

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const LERN_TYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

/**
 * Migriert eine einzelne lernpfade_konfiguration auf Schema v2.
 * Idempotent: items mit existierender instance_id werden 1:1 übernommen.
 */
function migrateKonfiguration(konfig) {
  const next = {};
  let changed = false;

  for (const lerntyp of LERN_TYPEN) {
    const sektoren = Array.isArray(konfig?.[lerntyp]) ? konfig[lerntyp] : [];
    next[lerntyp] = sektoren.map((sektor) => {
      const oldItems = Array.isArray(sektor?.items)
        ? sektor.items
        : Array.isArray(sektor?.aufgaben_ids)
          ? sektor.aufgaben_ids
          : [];

      const newItems = oldItems
        .map((it) => {
          // Legacy: String-ID → Aufgabe.
          if (typeof it === 'string') {
            if (!it) return null;
            changed = true;
            return {
              instance_id: `inst_${uuid()}`,
              type: 'aufgabe',
              ref_id: it,
              parent_instance_id: null,
            };
          }
          if (!it || typeof it !== 'object' || !it.ref_id) return null;

          // Bereits migriert? Dann durchreichen, aber parent_instance_id
          // sicherstellen (Default null).
          if (it.instance_id) {
            const out = {
              instance_id: it.instance_id,
              type: it.type === 'system' ? 'system' : 'aufgabe',
              ref_id: it.ref_id,
              parent_instance_id: it.parent_instance_id ?? null,
            };
            return out;
          }

          changed = true;
          return {
            instance_id: `inst_${uuid()}`,
            type: it.type === 'system' ? 'system' : 'aufgabe',
            ref_id: it.ref_id,
            parent_instance_id: null,
          };
        })
        .filter(Boolean);

      // aufgaben_ids gezielt droppen, falls noch vorhanden.
      const { aufgaben_ids: _legacy, ...rest } = sektor || {};
      return { ...rest, items: newItems };
    });
  }

  return { konfiguration: next, changed };
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

    const result = {
      dry_run: dryRun,
      bausteine: { updated: 0, seeded: 0, skipped: 0, mapping: [] },
      einheiten: { migrated: 0, already_v2: 0, no_konfig: 0, total: 0, errors: [] },
    };

    // ── Phase A: SystemBausteine durchgehen ──────────────────────────────────
    const allBausteine = await base44.asServiceRole.entities.SystemBausteine.list();
    const existingIds = new Set(allBausteine.map((b) => b.baustein_id));

    for (const b of allBausteine) {
      const mapping = BAUSTEIN_MAPPING[b.baustein_id];
      if (!mapping) {
        result.bausteine.skipped += 1;
        continue;
      }
      const needsUpdate =
        b.baustein_modus !== mapping.baustein_modus ||
        JSON.stringify(b.accepted_types || []) !== JSON.stringify(mapping.accepted_types);

      if (!needsUpdate) {
        result.bausteine.skipped += 1;
        continue;
      }

      result.bausteine.mapping.push({
        baustein_id: b.baustein_id,
        from_modus: b.baustein_modus || null,
        to_modus: mapping.baustein_modus,
        accepted_types: mapping.accepted_types,
      });

      if (!dryRun) {
        await base44.asServiceRole.entities.SystemBausteine.update(b.id, {
          baustein_modus: mapping.baustein_modus,
          accepted_types: mapping.accepted_types,
        });
      }
      result.bausteine.updated += 1;
    }

    // Neue Bausteine seeden (z. B. sys_themenfeld_intro).
    for (const seed of BAUSTEINE_TO_SEED) {
      if (existingIds.has(seed.baustein_id)) continue;
      if (!dryRun) {
        await base44.asServiceRole.entities.SystemBausteine.create(seed);
      }
      result.bausteine.seeded += 1;
      result.bausteine.mapping.push({
        baustein_id: seed.baustein_id,
        seeded: true,
        to_modus: seed.baustein_modus,
        accepted_types: seed.accepted_types,
      });
    }

    // ── Phase B: Einheiten in Batches durchgehen ─────────────────────────────
    let skip = 0;
    const PAGE = 100;
    while (true) {
      const page = await base44.asServiceRole.entities.Einheiten.list('-created_date', PAGE, skip);
      if (!page || page.length === 0) break;

      for (const einheit of page) {
        result.einheiten.total += 1;

        if (einheit.lernpfade_schema_version === 2) {
          result.einheiten.already_v2 += 1;
          continue;
        }
        if (!einheit.lernpfade_konfiguration) {
          // Keine Konfiguration → nur Schema-Version markieren, kein Migrationsbedarf.
          if (!dryRun) {
            try {
              await base44.asServiceRole.entities.Einheiten.update(einheit.id, {
                lernpfade_schema_version: 2,
              });
            } catch (e) {
              result.einheiten.errors.push({ einheit_id: einheit.id, error: e?.message });
            }
          }
          result.einheiten.no_konfig += 1;
          continue;
        }

        const { konfiguration, changed } = migrateKonfiguration(einheit.lernpfade_konfiguration);

        if (!dryRun) {
          try {
            await base44.asServiceRole.entities.Einheiten.update(einheit.id, {
              lernpfade_konfiguration: konfiguration,
              lernpfade_schema_version: 2,
            });
          } catch (e) {
            result.einheiten.errors.push({ einheit_id: einheit.id, error: e?.message });
            continue;
          }
        }
        if (changed) result.einheiten.migrated += 1;
        else result.einheiten.no_konfig += 1; // bereits leere/instanced Items
      }

      if (page.length < PAGE) break;
      skip += PAGE;
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('[migrateLernpfadeToInstanceIds] Error:', error);
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
});