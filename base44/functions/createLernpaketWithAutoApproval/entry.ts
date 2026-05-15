/**
 * createLernpaketWithAutoApproval.js
 * 
 * Erstellt ein Lernpaket mit automatischer content_status='approved'
 * (da es sich nur um einen Container handelt, keine inhaltliche Freigabe nötig)
 *
 * @MIGRATION_NOTE (Supabase):
 *   Dieser Endpunkt kann in Supabase voraussichtlich entfallen: content_status
 *   und sync_status sollten als PostgreSQL-Defaults auf lernpakete liegen,
 *   während direkte Client-INSERTs durch RLS gegen EinheitMembers/JWT abgesichert
 *   werden. Strukturänderungen müssen zusätzlich per RLS/RPC gegen aktive
 *   structural_locks geschützt werden.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STRUCTURAL_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function hasActiveForeignStructuralLock(einheit, userEmail) {
  if (!einheit?.structural_lock || einheit.structural_lock === userEmail) return false;
  const lockedAt = einheit.structural_locked_at ? new Date(einheit.structural_locked_at).getTime() : 0;
  return Number.isFinite(lockedAt) && Date.now() - lockedAt < STRUCTURAL_LOCK_TIMEOUT_MS;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, themenfeld_id, einheit_id, reihenfolge_nummer } = body;

    if (!title || !einheit_id || reihenfolge_nummer === undefined) {
      return Response.json({ 
        error: 'Missing required fields: title, einheit_id, reihenfolge_nummer' 
      }, { status: 400 });
    }

    const einheiten = await base44.asServiceRole.entities.Einheiten.filter({ id: einheit_id });
    const einheit = einheiten?.[0];
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    if (hasActiveForeignStructuralLock(einheit, user.email)) {
      return Response.json({
        error: 'Einheit wird gerade strukturell bearbeitet',
        code: 'STRUCTURAL_LOCK_HELD',
        locked_by: einheit.structural_lock,
      }, { status: 409 });
    }

    const [benutzerList, membershipList] = await Promise.all([
      base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }),
      base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id,
        user_email: user.email,
      }),
    ]);

    const profil = benutzerList?.[0];
    const role = profil?.rolle;
    const subjects = profil?.fachbereich_zustaendigkeit || [];
    const isGlobalAdmin = user.role === 'admin' || role === 'Administrator';
    const isFachschaft = role === 'Fachschaftsleitung' && subjects.includes(einheit.fach);
    const isUnitMember = !!membershipList?.[0];

    if (!isGlobalAdmin && !isFachschaft && !isUnitMember) {
      return Response.json({
        error: 'Insufficient permissions to create Lernpakete in this Einheit',
        code: 'INSUFFICIENT_PERMISSIONS',
      }, { status: 403 });
    }

    // Erstelle das Lernpaket mit Auto-Grün
    const lernpaket = await base44.asServiceRole.entities.Lernpakete.create({
      titel_des_pakets: title,
      themenfeld_id: themenfeld_id || null,
      einheit_id,
      reihenfolge_nummer,
      // 2-Signal: Struktur-Container sind immer 'approved' (Auto-Grün)
      content_status: 'approved',
      // Sync-Status: neu erstellt = 'new'
      sync_status: 'new',
    });

    return Response.json({
      success: true,
      lernpaket,
      message: 'Lernpaket erstellt (Auto-Grün für Strukturdaten)',
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});