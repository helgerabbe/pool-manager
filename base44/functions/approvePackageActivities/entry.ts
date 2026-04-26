/**
 * approvePackageActivities.js
 *
 * Setzt `content_status='approved'` auf allen `LernpaketPhaseAktivitaet`
 * eines Lernpakets in einem Rutsch. Mit `force=true` werden zusätzlich
 * fehlende Pflichtfelder mit Platzhaltern (`[Label]`) aufgefüllt – ein
 * bewusst eingebautes UX-Komfort-Feature, das Lehrkräften erlaubt, eine
 * Einheit auch dann zu releasen, wenn nicht alle Mikro-Felder
 * vollständig sind.
 *
 * Sicherheit & Architektur
 * ────────────────────────
 *  - **RBAC (Türsteher):** identisch zu `acquireUnitLockSecure`
 *      Administrator                                  → frei
 *      Fachschaftsleitung MIT Fachzuständigkeit       → frei
 *      Sonst: explizite EinheitMembers-Mitgliedschaft → frei
 *    Damit kann KEIN beliebiger angemeldeter Nutzer fremde Pakete
 *    zwangs-freigeben.
 *  - **Fremd-Lock-Schutz:** Hält ein anderer Nutzer den Lernpaket-Lock,
 *    schlägt der Bulk-Approve mit 403 fehl. Eigener Lock ist erlaubt
 *    (oder gar kein Lock – Approve ist ein Status-Switch, kein
 *    Inhalts-Edit; vgl. §11 zur Lock-Philosophie).
 *  - **Parallel-Updates:** alle Activity-Updates laufen über
 *    `Promise.all`. Damit ist das Skript auch bei 30+ Activities
 *    Edge-Function-tauglich. Update-Fehler werden eingesammelt und
 *    NICHT verschluckt – ein partieller Fehler schlägt durch.
 *  - **Master-Konsistenz:** Sobald eine Activity per `force` als
 *    "approved" markiert wird, werden ihre `MasterAufgabe`-Kinder im
 *    selben Rutsch ebenfalls auf `content_status='approved'` und
 *    `sync_status='pending'` gesetzt. Das deckt sich mit der
 *    Aggregat-Logik aus `approveMasterAufgabe` und verhindert den
 *    "Geister-Zustand" (Activity grün, Masters unter ihr noch draft).
 *
 * @MIGRATION_NOTE (Supabase) – siehe Logbuch §12
 *  - Komplette Funktion schrumpft auf zwei `UPDATE … WHERE
 *    lernpaket_id = $1`-Statements (Activities + Masters).
 *  - Katalog-Lookup wird zum LEFT JOIN.
 *  - Master-Aggregat wandert in den Trigger aus §11 (greift dann auch
 *    für diesen Pfad automatisch).
 *
 * Params:
 *   paketId  (string)  – Pflicht
 *   force    (boolean) – default false
 *
 * Response:
 *   { success, approvedCount, incompleteCount, incomplete? }
 *   Bei force=false + unvollständigen Activities: success=false,
 *   needsConfirmation=true.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Einheitliche RBAC-Prüfung – identisch zu approveMasterAufgabe und
 * acquireUnitLockSecure, damit das System ein konsistentes Türsteher-
 * Verhalten zeigt.
 */
async function checkApprovalPermission(base44, user, einheit) {
  if (user.role === 'admin') return { allowed: true };

  const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
    user_id: user.email,
  });
  const benutzer = benutzerList?.[0];
  const rolle = benutzer?.rolle;

  if (rolle === 'Administrator') return { allowed: true };

  if (rolle === 'Fachschaftsleitung') {
    const fachzustaendig =
      benutzer?.fachbereich_zustaendigkeit?.includes(einheit.fach) || false;
    if (fachzustaendig) return { allowed: true };
  }

  const members = await base44.asServiceRole.entities.EinheitMembers.filter({
    einheit_id: einheit.id,
    user_email: user.email,
  });
  if (members.length > 0) return { allowed: true };

  return { allowed: false, reason: 'Sie haben keinen Zugriff auf diese Einheit' };
}

const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paketId, force = false } = await req.json();
    if (!paketId) {
      return Response.json({ error: 'paketId is required' }, { status: 400 });
    }

    // ── 1. Lernpaket + Einheit laden (RBAC + Lock-Check) ─────────────
    const paket = await base44.asServiceRole.entities.Lernpakete.get(paketId);
    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }
    if (!paket.einheit_id) {
      return Response.json({ error: 'Lernpaket hat keine Einheit' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(paket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    // ── 2. RBAC ──────────────────────────────────────────────────────
    const perm = await checkApprovalPermission(base44, user, einheit);
    if (!perm.allowed) {
      return Response.json({ error: perm.reason }, { status: 403 });
    }

    // ── 3. Fremd-Lock-Schutz ─────────────────────────────────────────
    // Hält ein ANDERER User einen aktiven (nicht-stale) Lock, brechen
    // wir ab. Eigener Lock oder gar kein Lock ist okay (Approve ist
    // ein Status-Switch, kein Inhalts-Edit – Konsistenz mit §11).
    const isLocked = !!paket.is_locked;
    const isLockedByOther =
      isLocked &&
      paket.locked_by_email &&
      paket.locked_by_email !== user.email;
    const lockAgeMs = paket.locked_at
      ? Date.now() - new Date(paket.locked_at).getTime()
      : Infinity;
    const lockIsFresh = lockAgeMs < PAKET_LOCK_TIMEOUT_MS;

    if (isLockedByOther && lockIsFresh) {
      return Response.json(
        {
          error: `Lernpaket wird gerade von ${paket.locked_by_email} bearbeitet. Bitte später erneut versuchen.`,
          code: 'LOCKED_BY_OTHER',
          locked_by_email: paket.locked_by_email,
          locked_at: paket.locked_at,
        },
        { status: 403 }
      );
    }

    // ── 4. Activities + Katalog parallel laden ───────────────────────
    const [allActivities, katalog] = await Promise.all([
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: paketId,
      }),
      base44.asServiceRole.entities.AktivitaetenKatalog.list(),
    ]);
    const katalogMap = Object.fromEntries((katalog || []).map((k) => [k.id, k]));

    // ── 5. Unvollständige Activities sammeln ─────────────────────────
    const incomplete = [];
    for (const activity of allActivities) {
      if (!activity.is_complete) {
        const katalogEntry = katalogMap[activity.aktivitaet_id];
        const name = katalogEntry?.name || 'Unbekannte Aktivität';
        incomplete.push({ id: activity.id, name });
      }
    }

    if (incomplete.length > 0 && !force) {
      return Response.json({
        success: false,
        needsConfirmation: true,
        incompleteCount: incomplete.length,
        totalCount: allActivities.length,
        incomplete,
      });
    }

    // ── 6. Updates parallel zusammenstellen ──────────────────────────
    // 6a) Activity-Updates: content_status='approved', bei force +
    //     unvollständig zusätzlich Platzhalter + is_complete=true.
    const activityUpdates = allActivities.map((activity) => {
      const updateData = { content_status: 'approved' };

      if (!activity.is_complete && force) {
        const katalogEntry = katalogMap[activity.aktivitaet_id];
        if (katalogEntry?.form_schema) {
          const defaultFieldValues = {};
          for (const field of katalogEntry.form_schema) {
            if (field.required && !activity.field_values?.[field.field_name]) {
              defaultFieldValues[field.field_name] =
                field.placeholder || `[${field.label}]`;
            }
          }
          if (Object.keys(defaultFieldValues).length > 0) {
            updateData.field_values = {
              ...(activity.field_values || {}),
              ...defaultFieldValues,
            };
          }
        }
        updateData.is_complete = true;
      }

      return base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(
        activity.id,
        updateData
      );
    });

    // 6b) Master-Konsistenz: alle MasterAufgaben dieser Activities
    //     mitziehen. Sonst entsteht der Geister-Zustand „Activity
    //     approved, Masters draft" (siehe Logbuch §12).
    const activityIds = allActivities.map((a) => a.id);
    let masterUpdates = [];
    if (activityIds.length > 0) {
      // Base44-SDK unterstützt aktuell kein `IN` über mehrere IDs in
      // einem einzigen filter()-Call; daher pro Activity ein
      // paralleler filter, dann flach updaten.
      const masterListsPerActivity = await Promise.all(
        activityIds.map((aid) =>
          base44.asServiceRole.entities.MasterAufgabe.filter({ activity_id: aid })
        )
      );
      const allMasters = masterListsPerActivity.flat();
      masterUpdates = allMasters
        .filter((m) => m.is_master !== false) // nur echte Master, keine Klone
        .map((m) =>
          base44.asServiceRole.entities.MasterAufgabe.update(m.id, {
            content_status: 'approved',
            sync_status: 'pending',
          })
        );
    }

    // ── 7. Alle Updates parallel feuern + Fehler aggregieren ──────────
    const results = await Promise.allSettled([...activityUpdates, ...masterUpdates]);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(
        `[approvePackageActivities] ${failed.length}/${results.length} updates failed`,
        failed.map((f) => f.reason?.message || String(f.reason))
      );
      return Response.json(
        {
          success: false,
          partial: true,
          approvedCount: activityUpdates.length - failed.filter((_, i) => i < activityUpdates.length).length,
          failedCount: failed.length,
          error: 'Einige Updates sind fehlgeschlagen. Bitte erneut versuchen.',
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      approvedCount: activityUpdates.length,
      mastersUpdated: masterUpdates.length,
      incompleteCount: incomplete.length,
    });
  } catch (error) {
    console.error('[approvePackageActivities] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});