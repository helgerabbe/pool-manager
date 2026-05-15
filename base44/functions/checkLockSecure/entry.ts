import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * checkLockSecure
 * 
 * Prüft den aktuellen Lock-Status eines Lernpakets.
 * Gibt zurück: {is_locked, locked_by_email, locked_by_name, locked_at}
 *
 * Genutzt vom Frontend um zu entscheiden: Bearbeitungsmodus ja/nein?
 *
 * @MIGRATION_NOTE Supabase:
 * Dieser Endpoint wird mit hoher Wahrscheinlichkeit durch Supabase Realtime
 * ersetzt. Statt Frontend-Polling auf Lock-Status abzufragen, abonniert das
 * Frontend Row-Änderungen an Lernpakete(id=X) per WebSocket und erhält sofort
 * Push-Events, sobald ein Lock gesetzt oder freigegeben wird.
 */
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

async function resolveDisplayName(base44, email) {
  if (!email) return null;
  try {
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const b = benutzer?.[0];
    if (b?.vorname || b?.nachname) {
      return `${b.vorname || ''} ${b.nachname || ''}`.trim();
    }
  } catch (_e) {
    // Anzeigename ist nur UX/Privacy-Polish – Lock-Prüfung darf nicht scheitern.
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaketId } = await req.json();

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId required' }, { status: 400 });
    }

    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    const lockAge = paket.locked_at
      ? Date.now() - new Date(paket.locked_at).getTime()
      : Infinity;
    const isActuallyLocked = !!paket.is_locked && lockAge < LOCK_TIMEOUT_MS;
    const lockedByEmail = isActuallyLocked ? (paket.locked_by_email || null) : null;
    const lockedByName = await resolveDisplayName(base44, lockedByEmail);

    return Response.json({
      is_locked: isActuallyLocked,
      locked_by_email: lockedByEmail,
      locked_by_name: lockedByName,
      locked_at: isActuallyLocked ? (paket.locked_at || null) : null,
    });
  } catch (error) {
    console.error('[checkLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});