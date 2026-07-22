/**
 * updateActivitySecure.js
 * 
 * Sichere Backend-Funktion zum Aktualisieren von Aktivitäten-Inhalten.
 * 
 * Validiert:
 * 1. Current User hat Berechtigung (Global Admin/Fachschaft ODER Delegierte LEITUNG/EDITOR)
 * 2. Einheit-Scope wird validiert (Scope-Leak Prevention)
 * 3. Aktivität existiert und gehört zur angegebenen Einheit
 * 4. Audit-Log wird geschrieben
 * 
 * Parameter:
 * - activityId: LernpaketPhaseAktivitaet ID
 * - fieldValues: Die neuen Feldwerte (Objekt)
 * - einheitId: Einheit ID (für Scope-Validierung)
 * - targetFach: Fachbereich (für globale Fachschafts-Validierung)
 * 
 * Rückgabe: { success: boolean, activityId, grantedBy }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ✅ Rate-Limiter: In-Memory Tracking mit Timestamps
const requestLog = new Map();

function isRateLimited(userEmail, functionName, maxRequests = 60, windowMs = 60000) {
  const key = `${userEmail}::${functionName}`;
  const now = Date.now();
  
  if (!requestLog.has(key)) {
    requestLog.set(key, []);
  }
  
  const timestamps = requestLog.get(key);
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  requestLog.set(key, validTimestamps);
  
  if (validTimestamps.length >= maxRequests) {
    return true; // Limit überschritten
  }
  
  validTimestamps.push(now);
  requestLog.set(key, validTimestamps);
  return false;
}

/**
 * Prüft, ob ein User eine Aktivität bearbeiten darf.
 * Berücksichtigt globale Rollen UND delegierte Berechtigungen.
 */
function validateEditPermissionWithScope(
  rolle,
  faecher,
  targetFach,
  einheitId,
  delegatedMembership
) {
  // RBAC-Angleichung 2026-06-10 (Bugfix "Bearbeitungsmodus startet nicht"):
  // Die Frontend-Matrix (lib/rbac.js, Bereich 2 INHALTE) erlaubt der
  // FACHLEHRKRAFT die Inhalts-Bearbeitung im eigenen Fach — ohne
  // delegierte EinheitMembers-Rolle. Das Backend verlangte bisher
  // zusätzlich eine Delegation und wies fachzuständige Lehrkräfte ab.
  if (rolle === 'Fachlehrkraft' && Array.isArray(faecher) && faecher.includes(targetFach)) {
    return { allowed: true, reason: 'lehrkraft_fach' };
  }

  // ADMIN: immer erlaubt (GLOBAL, alle Einheiten)
  if (rolle === 'Administrator') {
    return { allowed: true, reason: 'admin_global' };
  }

  // FACHSCHAFTSLEITUNG: nur im eigenen Fach (GLOBAL, Fach-scoped)
  if (rolle === 'Fachschaftsleitung') {
    if (!Array.isArray(faecher) || !faecher.includes(targetFach)) {
      return { allowed: false, reason: 'fachschaft_wrong_fach' };
    }
    return { allowed: true, reason: 'fachschaft_fach' };
  }

  // FACHLEHRKRAFT: nur mit delegierter LEITUNG oder EDITOR
  if (rolle === 'Fachlehrkraft') {
    // Ohne delegierte Berechtigung: nicht erlaubt
    if (!delegatedMembership) {
      return { allowed: false, reason: 'lehrkraft_no_delegation' };
    }

    // Mit delegierter LEITUNG oder EDITOR: OK
    if (delegatedMembership.unit_role === 'LEITUNG' || delegatedMembership.unit_role === 'EDITOR') {
      return { allowed: true, reason: `lehrkraft_delegated_${delegatedMembership.unit_role.toLowerCase()}` };
    }

    // Alle anderen delegierten Rollen: nicht erlaubt
    return { allowed: false, reason: 'lehrkraft_insufficient_delegation' };
  }

  // Alle anderen Rollen: nicht erlaubt
  return { allowed: false, reason: 'insufficient_role' };
}

// ---------------------------------------------------------------------------
// Phase 3 (Freigabe-Konzept 2026-05-14): Inline-Validierung der Vollständigkeit.
// Backend kann keine lokalen Imports — deshalb hier dupliziert.
// Synchron halten mit lib/completenessValidation.js!
// ---------------------------------------------------------------------------
function _isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function _validateJsonStruct(fieldName, data) {
  if (!data || typeof data !== 'object') return 'Inhalt fehlt';
  switch (fieldName) {
    case 'match_data': {
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const valid = pairs.filter(p => p && String(p.left || '').trim() !== '' && String(p.right || '').trim() !== '');
      return valid.length < 3 ? `Mindestens 3 Paare (aktuell: ${valid.length})` : null;
    }
    case 'mc_data': {
      const qs = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length < 1) return 'Mindestens 1 Frage';
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (!q || _isEmpty(q.text)) return `Frage ${i + 1}: Text fehlt`;
        const ans = Array.isArray(q.answers) ? q.answers.filter(a => a && !_isEmpty(a.text)) : [];
        if (ans.length < 2) return `Frage ${i + 1}: Mindestens 2 Antworten`;
        if (!ans.some(a => a.correct === true)) return `Frage ${i + 1}: Richtige Antwort markieren`;
      }
      return null;
    }
    case 'lueckentext_data': {
      if (_isEmpty(data.text)) return 'Text fehlt';
      const gaps = Array.isArray(data.gaps) ? data.gaps : [];
      const valid = gaps.filter(g => g && !_isEmpty(g.correct));
      return valid.length < 1 ? 'Mindestens 1 Lücke mit Lösung' : null;
    }
    case 'answer_data': {
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.fragen) ? data.fragen : []);
      const valid = qs.filter(q => q && !_isEmpty(q.frage || q.text) && !_isEmpty(q.antwort || q.korrekt));
      return valid.length < 3 ? `Mindestens 3 Fragen (aktuell: ${valid.length})` : null;
    }
    case 'sort_data': {
      const items = Array.isArray(data.items) ? data.items : [];
      const valid = items.filter(it => it && !_isEmpty(it.text));
      return valid.length < 3 ? `Mindestens 3 Sortier-Elemente (aktuell: ${valid.length})` : null;
    }
    case 'marker_data': {
      const zones = Array.isArray(data.dropzones) ? data.dropzones : [];
      const valid = zones.filter(z => z && !_isEmpty(z.label));
      return valid.length < 2 ? `Mindestens 2 Drop-Zonen (aktuell: ${valid.length})` : null;
    }
    case 'test_data': {
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.fragen) ? data.fragen : []);
      return qs.length < 1 ? 'Mindestens 1 Frage' : null;
    }
    default:
      return null;
  }
}

function validateActivityCompletenessInline(catalog, fieldValues = {}) {
  if (!catalog || !Array.isArray(catalog.form_schema)) return { isComplete: true, missingFields: [] };
  const missing = [];

  // ── Sonderfall Bildbeschriftung (synchron zu lib/completenessValidation.js) ──
  // Der ImageLabelingEditor speichert unter eigenen Keys (aufgabenstellung /
  // backgroundImage / dropZones), NICHT unter den Schema-Feldnamen
  // (instruction / image_url / marker_data). Generische Schema-Prüfung würde
  // hier fälschlich "unvollständig" liefern.
  const isImageLabeling = (catalog.name || '').toLowerCase().includes('bildbeschriftung')
    || catalog.form_schema.some(f => f && f.field_name === 'marker_data');
  if (isImageLabeling) {
    const hasImage = !_isEmpty(fieldValues.backgroundImage) || !_isEmpty(fieldValues.image_url);
    if (!hasImage) {
      missing.push({ fieldName: 'backgroundImage', label: 'Hintergrundbild', reason: 'Bitte ein Bild hochladen' });
    }
    const zones = Array.isArray(fieldValues.dropZones) ? fieldValues.dropZones : [];
    const validZones = zones.filter(z => z && !_isEmpty(z.label));
    if (validZones.length < 2) {
      missing.push({ fieldName: 'dropZones', label: 'Zielbegriffe', reason: `Mindestens 2 beschriftete Begriffe erforderlich (aktuell: ${validZones.length})` });
    }
    return { isComplete: missing.length === 0, missingFields: missing };
  }

  for (const field of catalog.form_schema) {
    if (!field || !field.field_name || field.type === 'info' || !field.required) continue;
    const value = fieldValues[field.field_name];
    if (field.type === 'json') {
      const reason = _validateJsonStruct(field.field_name, value);
      if (reason) missing.push({ fieldName: field.field_name, label: field.label, reason });
    } else if (_isEmpty(value)) {
      missing.push({ fieldName: field.field_name, label: field.label, reason: 'Pflichtfeld leer' });
    }
  }
  return { isComplete: missing.length === 0, missingFields: missing };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 1. Authentifizierung prüfen
    if (!user) {
      console.warn('[updateActivitySecure] Unauthorized access attempt');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Rate-Limiting: 60 Requests pro Minute pro User (häufiger beim Tippen)
    if (isRateLimited(user.email, 'updateActivitySecure', 60, 60000)) {
      console.warn(`[updateActivitySecure] Rate limit exceeded for ${user.email}`);
      return Response.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Request-Parameter validieren
    const payload = await req.json().catch(() => ({}));
    const {
      activityId,
      fieldValues = {},
      einheitId,
      targetFach,
      // AP2 / MBK-Schema v1.1.0 §3: optionale Felder. Wenn der Aufrufer sie
      // setzt, durchläuft das Update den Modus-Switch (Konsistenz: bei
      // erstellungs_modus='ki' werden field_values geleert; bei 'manuell'
      // wird ki_briefing genullt). Bleibt erstellungs_modus undefined,
      // verhält sich die Function exakt wie vorher (Rückwärtskompat).
      erstellungsModus,
      kiBriefing,
    } = payload;

    if (!activityId || !einheitId || !targetFach) {
      console.warn(
        `[updateActivitySecure] Missing parameters from ${user.email}: ` +
        `activityId=${activityId}, einheitId=${einheitId}, targetFach=${targetFach}`
      );
      return Response.json(
        {
          error: 'Missing required parameters: activityId, einheitId, targetFach'
        },
        { status: 400 }
      );
    }

    // 3. Einheit im User-Kontext laden, damit RLS/Tenant-Isolation greift.
    const einheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);

    if (!einheit) {
      console.warn(
        `[updateActivitySecure] Einheit ${einheitId} not found or inaccessible (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Einheit not found or inaccessible' },
        { status: 404 }
      );
    }

    // Scope-Check: targetFach stimmt mit einheit.fach überein
    if (einheit.fach !== targetFach) {
      console.warn(
        `[updateActivitySecure] Scope mismatch: einheit.fach=${einheit.fach}, targetFach=${targetFach} ` +
        `(requested by ${user.email})`
      );
      return Response.json(
        {
          error: 'Scope mismatch: targetFach does not match Einheit fach',
          code: 'SCOPE_MISMATCH'
        },
        { status: 400 }
      );
    }

    // 4. Aktivität im User-Kontext laden, damit RLS/Tenant-Isolation greift.
    const aktivitaet = await base44.entities.LernpaketPhaseAktivitaet.get(activityId).catch(() => null);

    if (!aktivitaet) {
      console.warn(
        `[updateActivitySecure] Aktivität ${activityId} not found or inaccessible (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Aktivität not found or inaccessible' },
        { status: 404 }
      );
    }

    // ✅ Hierarchisches Lock-Validierung (kritisch!)
    // Prüfe: Hat der User einen Lock auf dem übergeordneten Lernpaket?
    // Die Aktivität erbt ihren Lock-Status vom Parent-Lernpaket.
    const lernpaket = await base44.entities.Lernpakete.get(aktivitaet.lernpaket_id).catch(() => null);
    if (!lernpaket) {
      console.warn(
        `[updateActivitySecure] Lernpaket ${aktivitaet.lernpaket_id} for activity ${activityId} not found`
      );
      return Response.json(
        { error: 'Parent Lernpaket not found' },
        { status: 404 }
      );
    }

    // ⛔ Freigabe-Sperre (Phase 3 des Freigabe-Konzepts vom 2026-05-14):
    // Eine freigegebene Aktivität ODER ein freigegebenes Lernpaket sperrt
    // jede inhaltliche Bearbeitung. Die Lehrkraft muss erst die Freigabe
    // zurücknehmen (setReleaseStatusSecure mit release=false).
    // Privat-Modus (2026-07-22): Private Einheiten (genau ein Besitzer)
    // nutzen den Freigabe-Workflow nicht — Freigabe-Sperren gelten dort nicht.
    const istPrivateEinheit = einheit.sichtbarkeit === 'privat';
    if (!istPrivateEinheit && aktivitaet.content_status === 'approved') {
      return Response.json(
        {
          error: 'Aktivität ist freigegeben — bitte erst die Freigabe zurücknehmen',
          code: 'ACTIVITY_RELEASED',
        },
        { status: 423 }
      );
    }
    if (!istPrivateEinheit && lernpaket.content_status === 'approved' && lernpaket.released_at) {
      return Response.json(
        {
          error: 'Übergeordnetes Lernpaket ist freigegeben — bitte erst die Freigabe zurücknehmen',
          code: 'PARENT_LERNPAKET_RELEASED',
        },
        { status: 423 }
      );
    }

    // ⛔ Einheit-Final-Lock (Phase 11): Wenn die Einheit final freigegeben ist,
    // sind alle untergeordneten Inhalte gesperrt — auch unabhängig vom
    // Moodle-Export-Lifecycle. Spiegelt lib/releaseLockCheck.js.
    if (einheit.export_lifecycle_status === 'final_freigegeben' ||
        einheit.export_lifecycle_status === 'export_running' ||
        einheit.export_lifecycle_status === 'published') {
      return Response.json(
        {
          error: 'Einheit ist final freigegeben — Bearbeitung gesperrt',
          code: 'EINHEIT_FINAL_LOCKED',
          status: einheit.export_lifecycle_status,
        },
        { status: 423 }
      );
    }

    // ⛔ PHASE 2: Export-Lock-Enforcement (KRITISCH!)
    // Blockiert alle Updates während eines aktiven Moodle-Exports
    if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
      console.warn(
        `[updateActivitySecure] BLOCKED by export lock - ${user.email} tried to update ${activityId} ` +
        `but export is in progress (export_locked=${lernpaket.export_locked}, moodle_sync_status=${lernpaket.moodle_sync_status})`
      );
      return Response.json(
        {
          error: 'Update abgelehnt: Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuchen Sie es später erneut.',
          code: 'EXPORT_LOCKED',
          details: {
            export_locked: lernpaket.export_locked,
            moodle_sync_status: lernpaket.moodle_sync_status,
            lernpaketId: lernpaket.id
          }
        },
        { status: 423, headers: { 'Retry-After': '5' } }
      );
    }

    // Schema-Feldnamen: Lernpakete benutzt `is_locked` + `locked_by_email`
    // (nicht `lock_status`/`locked_by_user`). Wir lesen beide Varianten,
    // damit ältere/neuere Records gleichermaßen funktionieren.
    const paketIsLocked = lernpaket.is_locked === true || lernpaket.lock_status === true;
    const paketLockOwner = lernpaket.locked_by_email || lernpaket.locked_by_user || null;
    const paketLockHeldByUser = paketIsLocked && paketLockOwner === user.email;
    if (!paketLockHeldByUser) {
      console.warn(
        `[updateActivitySecure] DENIED - ${user.email} tried to save activity but parent paket is_locked=${paketIsLocked}, owner=${paketLockOwner}`
      );
      return Response.json(
        {
          error: 'Das übergeordnete Lernpaket ist nicht für Sie gesperrt. Speichern nicht erlaubt.',
          code: 'PARENT_LOCK_NOT_OWNED',
          paketId: lernpaket.id,
          paketLockStatus: paketIsLocked,
          currentPaketLockOwner: paketLockOwner,
          details: {
            expectedOwner: user.email,
            actualOwner: paketLockOwner,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 409 } // Conflict
      );
    }

    // 5. Benutzer-Profil laden (Current User)
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });
    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    // 6. Delegierte Berechtigung prüfen (Current User für diese Einheit)
    const myMembership = await base44.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: user.email
    });
    const delegatedMembership = myMembership[0];

    // 7. Berechtigung validieren mit Scope (für Edit-Permission)
    const authCheck = validateEditPermissionWithScope(
      rolle,
      faecher,
      targetFach,
      einheitId,
      delegatedMembership
    );

    if (!authCheck.allowed) {
      console.warn(
        `[updateActivitySecure] DENIED - ${user.email} (role: ${rolle}, delegated: ${delegatedMembership?.unit_role || 'none'}) ` +
        `tried to update ${activityId} in ${einheitId}. Reason: ${authCheck.reason}`
      );

      // Audit-Log für BLOCKED Attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'LernpaketPhaseAktivitaet',
          resource_id: activityId,
          changes: {
            attempt: 'update_blocked',
            einheitId: einheitId,
            targetFach: targetFach
          },
          affected_count: 0,
          status: 'failed',
          error_message: `Permission denied: ${authCheck.reason}`
        });
      } catch (auditErr) {
        console.error('[updateActivitySecure] Failed to write audit log:', auditErr);
      }

      return Response.json(
        {
          error: 'Insufficient permissions to perform this action',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            userRole: rolle,
            userFaecher: faecher,
            targetFach: targetFach,
            einheitId: einheitId,
            delegatedRole: delegatedMembership?.unit_role || null,
            validationReason: authCheck.reason
          }
        },
        { status: 403 }
      );
    }

    // 8. Activity-Update.
    //
    // Wahrheitsprüfung (`supports_master` → MasterAufgabe-Existenz) und
    // Roll-up auf `Lernpakete.is_complete` laufen ab Variante C (§17)
    // ZENTRAL in der Entity-Automation `lernpaketAggregateGuardian` –
    // unabhängig davon, ob das Update über diese Function oder direkt
    // über das SDK reinkommt. Diese Function reicht den Frontend-Wert
    // 1:1 durch; die Automation überschreibt ihn ggf. mit `false`.
    // Phase G: Auto-Reset des export_error-Flags. Sobald die Lehrkraft
    // den fehlerhaft exportierten Inhalt bearbeitet, verschwindet das
    // rote Badge im Pool/Cockpit automatisch — der nächste Export-Lauf
    // wertet das Item neu aus.
    //
    // AP2 / MBK-Schema v1.1.0 §3 (Modus-Switch):
    // Wenn der Frontend-Aufruf `erstellungs_modus` mitliefert, sorgen wir
    // serverseitig für die Konsistenz zwischen den beiden Welten —
    // unabhängig davon, was das Frontend in field_values/kiBriefing
    // mitschickt. So kann es zu KEINEM gemischten Zustand kommen, in dem
    // die MBK gleichzeitig auf manuelle Inhalte UND ein Briefing zugreift.
    //
    // Reihenfolge ist wichtig: Erst die "andere Seite" auf null setzen,
    // dann die "aktive Seite" schreiben. Damit ist die Datenbank zu
    // keinem Zeitpunkt in einem Zustand, in dem beide Seiten gleichzeitig
    // gefüllt wären — ein evtl. parallel lesender MBK-Job sieht entweder
    // den alten oder den neuen Stand, nie eine Mischung.
    // Phase 3 (Freigabe-Konzept 2026-05-14): `is_complete` wird AB JETZT
    // ehrlich aus dem Katalog-Schema berechnet, nicht mehr blind auf true
    // gesetzt. Die Validierungslogik ist als Inline-Funktion oben definiert
    // (Backend-Isolation; synchron zu lib/completenessValidation.js halten).
    let isCompleteHonest;
    try {
      const cat = await base44.asServiceRole.entities.AktivitaetenKatalog.filter({ id: aktivitaet.aktivitaet_id });
      const catalog = cat[0];
      // Wir prüfen gegen den TATSÄCHLICH gespeicherten Endzustand der
      // Aktivität nach diesem Save. Im KI-Modus zählt das Briefing, sonst
      // die field_values.
      const effectiveValues = erstellungsModus === 'ki'
        ? {} // Wir validieren KI-Aktivitäten nicht über field_values, sondern über ki_briefing (separater Pfad — nicht in dieser Function).
        : (erstellungsModus === 'manuell' ? fieldValues : fieldValues);
      const v = validateActivityCompletenessInline(catalog, effectiveValues);
      isCompleteHonest = v.isComplete;
    } catch (e) {
      console.warn('[updateActivitySecure] Completeness check failed, defaulting to false:', e?.message);
      isCompleteHonest = false;
    }

    const updatePayload = {
      is_complete: isCompleteHonest,
      export_error: false,
    };

    if (erstellungsModus === 'ki') {
      // KI-Modus: Briefing setzen, manuelle Inhalte leeren.
      updatePayload.erstellungs_modus = 'ki';
      updatePayload.field_values = null;
      updatePayload.ki_briefing = kiBriefing ?? null;
    } else if (erstellungsModus === 'manuell') {
      // Manueller Modus: Inhalte setzen, Briefing leeren.
      updatePayload.erstellungs_modus = 'manuell';
      updatePayload.field_values = fieldValues;
      updatePayload.ki_briefing = null;
    } else {
      // Backward-Compat: kein Modus mitgegeben → klassisches field_values-Update.
      updatePayload.field_values = fieldValues;
    }

    const [latestEinheit, latestAktivitaet, latestLernpaket] = await Promise.all([
      base44.entities.Einheiten.get(einheitId).catch(() => null),
      base44.entities.LernpaketPhaseAktivitaet.get(activityId).catch(() => null),
      base44.entities.Lernpakete.get(lernpaket.id).catch(() => null),
    ]);

    if (!latestEinheit || !latestAktivitaet || !latestLernpaket) {
      return Response.json(
        { error: 'Datensatz wurde zwischenzeitlich entfernt oder ist nicht mehr zugänglich', code: 'TARGET_NOT_ACCESSIBLE' },
        { status: 409 }
      );
    }

    const latestPaketIsLocked = latestLernpaket.is_locked === true || latestLernpaket.lock_status === true;
    const latestPaketLockOwner = latestLernpaket.locked_by_email || latestLernpaket.locked_by_user || null;
    const statusChanged =
      latestAktivitaet.updated_date !== aktivitaet.updated_date ||
      latestAktivitaet.content_status !== aktivitaet.content_status ||
      latestLernpaket.updated_date !== lernpaket.updated_date ||
      latestLernpaket.content_status !== lernpaket.content_status ||
      latestLernpaket.released_at !== lernpaket.released_at ||
      latestLernpaket.export_locked !== lernpaket.export_locked ||
      latestLernpaket.moodle_sync_status !== lernpaket.moodle_sync_status ||
      latestPaketIsLocked !== paketIsLocked ||
      latestPaketLockOwner !== paketLockOwner ||
      latestEinheit.updated_date !== einheit.updated_date ||
      latestEinheit.export_lifecycle_status !== einheit.export_lifecycle_status;

    if (statusChanged) {
      return Response.json(
        { error: 'Der Inhalt oder Sperrstatus wurde zwischenzeitlich geändert. Bitte neu laden.', code: 'VERSION_CHANGED' },
        { status: 409 }
      );
    }

    await base44.entities.LernpaketPhaseAktivitaet.update(
      activityId,
      updatePayload
    );

    // 9. ✅ Audit-Log schreiben (SUCCESS)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'LernpaketPhaseAktivitaet',
        resource_id: activityId,
        changes: {
          field_values: Object.keys(fieldValues),
          einheitId: einheitId,
          targetFach: targetFach,
          grantedBy: authCheck.reason,
          delegatedRole: delegatedMembership?.unit_role || null,
          // AP2: Modus-Wechsel im Audit-Log sichtbar machen.
          erstellungs_modus: erstellungsModus || null,
          ki_briefing_variant: kiBriefing?.variant || null
        },
        affected_count: 1,
        status: 'success'
      });
    } catch (auditErr) {
      console.error('[updateActivitySecure] Failed to write audit log:', auditErr);
    }

    console.info(
      `[updateActivitySecure] SUCCESS - ${user.email} updated ${activityId} ` +
      `(Einheit: ${einheitId}, grantedBy: ${authCheck.reason})`
    );

    // Response
    return Response.json({
      success: true,
      message: 'Aktivität erfolgreich aktualisiert',
      activityId,
      einheitId,
      grantedBy: authCheck.reason
    });

  } catch (error) {
    console.error('[updateActivitySecure] Unexpected error:', error);

    return Response.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      { status: 500 }
    );
  }
});