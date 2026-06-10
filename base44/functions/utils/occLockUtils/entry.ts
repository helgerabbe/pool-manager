/**
 * occLockUtils.js – Zentrale OCC-Lock-Hilfsfunktion (Single Source of Truth)
 *
 * Wird als Deno.serve-Stub deployed (Base44 erwartet das für jede Datei
 * unter functions/), aber inhaltlich ist diese Datei eine **Code-Referenz**:
 * der Code von `acquireLockWithVersion` wird wegen der „NO LOCAL IMPORTS"-
 * Regel inline in jede konsumierende Function kopiert (siehe
 * acquireDashboardLockSecure, acquireLockSecure, …). Bei Änderungen hier
 * MUSS gleichzeitig der Inline-Block in den Konsumenten aktualisiert werden.
 *
 * Nach der Supabase-Migration entfällt diese Verdopplung: dann genügt es,
 * diese eine Datei (oder ihren Postgres-Function-Pendant) anzupassen.
 *
 * ────────────────────────────────────────────────────────────────────────
 *
 * acquireLockWithVersion(base44, config)
 *
 *   Universeller OCC-Wrapper für „Lock setzen mit Race-Condition-Schutz".
 *
 *   Workflow:
 *     1. INITIAL READ:  Datensatz inkl. `version` laden.
 *     2. STATE CHECK:
 *          - lockField leer       → OK
 *          - lockField === userEmail (Refresh) → OK
 *          - timeField älter als timeoutMs (stale) → OK (Override)
 *          - sonst → return { ok: false, reason: 'busy', … }
 *     3. ATOMIC-LIKE UPDATE: lockField, timeField, version+1, ...extraUpdate
 *     4. RE-READ via asServiceRole (frisch, kein End-User-Cache).
 *     5. VERIFY:
 *          - reRead[lockField] === userEmail → return { ok: true, … }
 *          - sonst → return { ok: false, reason: 'race_lost', … }
 *
 *   ⚠️ First-Mover-Disziplin: VERIFY prüft AUSSCHLIESSLICH die E-Mail,
 *   NICHT das Versions-Inkrement (siehe OPTIMISTIC_LOCKING_VERSION_FIELD.md).
 *
 *   KEIN Rollback bei race_lost: würde den rechtmäßigen Gewinner zerstören.
 *
 * Signatur:
 *   acquireLockWithVersion(base44, {
 *     entityName, entityId, lockField, timeField,
 *     userEmail, timeoutMs, extraUpdate?
 *   })
 *   → Promise<
 *       | { ok: true,  version, lockedAt }
 *       | { ok: false, reason: 'busy' | 'race_lost' | 'not_found',
 *                      lockedByEmail, lockedAt, currentRecord? }
 *     >
 */

export async function acquireLockWithVersion(base44, config) {
  const {
    entityName,
    entityId,
    lockField,
    timeField,
    userEmail,
    timeoutMs,
    extraUpdate = {},
  } = config;

  if (!entityName || !entityId || !lockField || !timeField || !userEmail || !timeoutMs) {
    throw new Error('acquireLockWithVersion: missing required config field');
  }

  // KRITISCH (Self-Lockout-Fix 2026-06-10): READ + VERIFY laufen BEIDE über
  // asServiceRole. Vorher las der State-Check über base44.entities (User-Token,
  // möglicherweise replikations-/cache-verzögert) und der VERIFY über
  // asServiceRole – diese inkonsistenten Lesequellen konnten dazu führen, dass
  // der rechtmäßige Lock-Gewinner seinen eigenen, frisch geschriebenen Lock im
  // VERIFY noch nicht sah und sich fälschlich selbst mit 'race_lost' aussperrte.
  const record = await base44.asServiceRole.entities[entityName].get(entityId);
  if (!record) {
    return { ok: false, reason: 'not_found', lockedByEmail: null, lockedAt: null };
  }

  const now = Date.now();
  const currentLockOwner = record[lockField];
  const currentLockedAt = record[timeField];

  if (currentLockOwner && currentLockOwner !== userEmail) {
    const lockAge = currentLockedAt ? now - new Date(currentLockedAt).getTime() : Infinity;
    if (lockAge < timeoutMs) {
      return {
        ok: false,
        reason: 'busy',
        lockedByEmail: currentLockOwner,
        lockedAt: currentLockedAt,
        currentRecord: record,
      };
    }
  }

  const currentVersion = Number.isFinite(record?.version) ? record.version : 1;
  const nextVersion = currentVersion + 1;
  const isoNow = new Date().toISOString();
  await base44.entities[entityName].update(entityId, {
    ...extraUpdate,
    [lockField]: userEmail,
    [timeField]: isoNow,
    version: nextVersion,
  });

  // VERIFY mit kurzem Retry: der eigene Write kann minimal verzögert
  // propagieren. Erst wenn nach mehreren Re-Reads ein ANDERER Owner im
  // Lock-Feld steht, hat man den Race wirklich verloren. Sieht man den eigenen
  // Lock (oder noch leer = eigener Write nicht propagiert), wird weiter geprüft
  // – so sperrt sich der rechtmäßige Gewinner nie selbst aus.
  let verify = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    verify = await base44.asServiceRole.entities[entityName].get(entityId);
    if (verify?.[lockField] === userEmail) {
      return { ok: true, version: nextVersion, lockedAt: isoNow };
    }
    // Ein anderer, gültiger Owner steht drin → echter Race-Verlust, kein Retry.
    if (verify?.[lockField] && verify[lockField] !== userEmail) {
      return {
        ok: false,
        reason: 'race_lost',
        lockedByEmail: verify[lockField],
        lockedAt: verify?.[timeField] || null,
        currentRecord: verify,
      };
    }
    // Lock-Feld (noch) leer oder Stand veraltet → kurz warten und erneut lesen.
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }

  // Nach allen Retries weder eigener noch fremder Owner sichtbar: Schreib-Write
  // erneut bestätigen, indem wir den Lock idempotent nochmal setzen und prüfen.
  await base44.entities[entityName].update(entityId, {
    [lockField]: userEmail,
    [timeField]: isoNow,
  });
  verify = await base44.asServiceRole.entities[entityName].get(entityId);
  if (verify?.[lockField] === userEmail) {
    return { ok: true, version: nextVersion, lockedAt: isoNow };
  }
  return {
    ok: false,
    reason: 'race_lost',
    lockedByEmail: verify?.[lockField] || null,
    lockedAt: verify?.[timeField] || null,
    currentRecord: verify,
  };
}

// ── Deno.serve-Stub ──
// Backend-Functions auf Base44 müssen einen HTTP-Handler exportieren,
// auch wenn die Datei als reine Code-Referenz gedacht ist. Der Stub
// dokumentiert nur, dass die Datei nicht direkt aufzurufen ist.
Deno.serve(() =>
  Response.json(
    {
      error:
        'occLockUtils ist ein interner Code-Baustein. ' +
        'Aufrufer kopieren acquireLockWithVersion inline – siehe Header-Kommentar.',
    },
    { status: 410 }
  )
);