/**
 * cleanupOnboardingSektoren.js
 *
 * Einmalige Bereinigung (Etappe B): Entfernt den einheits-GLOBAL gewordenen
 * Orientierungs-/Onboarding-Sektor (sektor_typ === 'onboarding') aus den vier
 * Lerntyp-Dashboards der `lernpfade_konfiguration`. Hintergrund: Das Onboarding
 * lebt jetzt zentral in `Einheiten.onboarding_konfiguration` (Tab 8, 5. Pill)
 * und im Export-Payload (airgap-1.10.0, `einheit.onboarding`). In bestehenden
 * Dashboards ist der alte Sektor noch enthalten und würde im Export doppelt
 * auftauchen.
 *
 * Sicherheit: Admin-only (User.role === 'admin' ODER Benutzer.rolle ===
 * 'Administrator').
 *
 * Payload:
 *   { einheit_id?: string, dryRun?: boolean }
 *   - einheit_id gesetzt → nur diese eine Einheit bereinigen.
 *   - einheit_id leer    → ALLE Einheiten bereinigen.
 *   - dryRun=true        → nur zählen, nichts schreiben.
 *
 * Idempotent: ohne Onboarding-Sektor bleibt die Konfiguration unverändert.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LERN_TYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

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
 * Entfernt alle Sektoren mit sektor_typ === 'onboarding' aus jedem Lerntyp.
 * @returns { konfiguration, removed }  removed = Anzahl entfernter Sektoren.
 */
function stripOnboarding(konfig) {
  const next = {};
  let removed = 0;
  for (const lt of LERN_TYPEN) {
    const sektoren = Array.isArray(konfig?.[lt]) ? konfig[lt] : [];
    const kept = sektoren.filter((s) => s?.sektor_typ !== 'onboarding');
    removed += sektoren.length - kept.length;
    next[lt] = kept;
  }
  return { konfiguration: next, removed };
}

async function cleanupEinheit(base44, einheit, dryRun) {
  const konfig = einheit?.lernpfade_konfiguration;
  if (!konfig) return { changed: false, removed: 0 };

  const { konfiguration, removed } = stripOnboarding(konfig);
  if (removed === 0) return { changed: false, removed: 0 };

  if (!dryRun) {
    await base44.asServiceRole.entities.Einheiten.update(einheit.id, {
      lernpfade_konfiguration: konfiguration,
    });
  }
  return { changed: true, removed };
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
    const einheitId = body?.einheit_id || null;

    const result = {
      dry_run: dryRun,
      einheiten_total: 0,
      einheiten_changed: 0,
      sektoren_removed: 0,
      errors: [],
    };

    if (einheitId) {
      const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
      if (!einheit) {
        return Response.json({ error: 'Einheit not found' }, { status: 404 });
      }
      result.einheiten_total = 1;
      const { changed, removed } = await cleanupEinheit(base44, einheit, dryRun);
      if (changed) result.einheiten_changed += 1;
      result.sektoren_removed += removed;
      return Response.json({ ok: true, ...result });
    }

    // Alle Einheiten durchgehen (paginiert).
    let skip = 0;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const batch = await base44.asServiceRole.entities.Einheiten.list('created_date', PAGE_SIZE, skip);
      if (!batch || batch.length === 0) break;

      for (const einheit of batch) {
        result.einheiten_total += 1;
        try {
          const { changed, removed } = await cleanupEinheit(base44, einheit, dryRun);
          if (changed) result.einheiten_changed += 1;
          result.sektoren_removed += removed;
        } catch (err) {
          result.errors.push({ einheit_id: einheit.id, error: err?.message || String(err) });
        }
      }

      if (batch.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cleanupOnboardingSektoren] Error:', error);
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
});