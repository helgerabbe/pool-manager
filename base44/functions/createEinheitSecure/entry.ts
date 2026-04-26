/**
 * createEinheitSecure.js
 * 
 * Phase 6.3: Sichere CREATE Operation für Einheiten mit:
 * - RBAC Validation
 * - Input Validation
 * - Audit Logging
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Default-Dashboards (Spiegel von src/lib/dashboardTemplates.js) ─────
// Eager init: Neue Einheiten bekommen sofort die Standard-Raster für
// alle vier Lerntypen. Bei Änderungen an der Spec auch
// `createEinheitMitDefaults.js` und `src/lib/dashboardTemplates.js`
// synchron halten (NO_LOCAL_IMPORTS-Regel verbietet Re-Use).
const _sys = (refId) => ({ type: 'system', ref_id: refId });
const _uid = () => 'sec_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function buildDefaultLernpfadKonfiguration() {
  return {
    minimalist: [
      { sektor_id: _uid(), titel: 'Orientierung', modus: 'sequenziell',
        items: [_sys('sys_sec0_overview'), _sys('sys_sec0_qblock'), _sys('sys_diagnose_entry')] },
      { sektor_id: _uid(), titel: 'Lernlandkarte', modus: 'sequenziell',
        items: [_sys('sys_map_reduced')] },
      { sektor_id: _uid(), titel: 'Erste Erarbeitungsphase', modus: 'sequenziell',
        items: [_sys('sys_platzhalter_info'), _sys('sys_platzhalter_handlung'), _sys('sys_platzhalter_moodle_buendel')] },
      { sektor_id: _uid(), titel: 'Zwischentest', modus: 'sequenziell',
        items: [_sys('sys_platzhalter_info'), _sys('sys_platzhalter_zwischentest')] },
    ],
    pragmatiker: [
      { sektor_id: _uid(), titel: 'Orientierung', modus: 'sequenziell',
        items: [_sys('sys_sec0_overview'), _sys('sys_sec0_qblock'), _sys('sys_diagnose_entry')] },
      { sektor_id: _uid(), titel: 'Lernlandkarte', modus: 'sequenziell',
        items: [_sys('sys_map_reduced')] },
      { sektor_id: _uid(), titel: 'Erarbeitungs- und Trainingsphase', modus: 'sequenziell',
        items: [_sys('sys_platzhalter_info'), _sys('sys_platzhalter_handlung'), _sys('sys_platzhalter_moodle_buendel'), _sys('sys_platzhalter_brian_buendel')] },
      { sektor_id: _uid(), titel: 'Abschlusstest', modus: 'sequenziell',
        items: [_sys('sys_external_test')] },
    ],
    ehrgeizig: [
      { sektor_id: _uid(), titel: 'Orientierung', modus: 'sequenziell',
        items: [_sys('sys_sec0_overview'), _sys('sys_sec0_qblock'), _sys('sys_diagnose_entry')] },
      { sektor_id: _uid(), titel: 'Einstieg & Anmeldung', modus: 'sequenziell',
        items: [_sys('sys_map_full'), _sys('sys_exam_register')] },
      { sektor_id: _uid(), titel: 'Erarbeitungs- und Trainingsphase', modus: 'sequenziell',
        items: [_sys('sys_platzhalter_info'), _sys('sys_platzhalter_handlung'), _sys('sys_platzhalter_moodle_buendel'), _sys('sys_platzhalter_brian_buendel')] },
      { sektor_id: _uid(), titel: 'Vorbereitung auf die schriftliche Arbeit', modus: 'sequenziell',
        items: [_sys('sys_zwischentest')] },
      { sektor_id: _uid(), titel: 'Projekt', modus: 'frei',
        items: [_sys('sys_platzhalter_projekt')] },
    ],
    passioniert: [
      { sektor_id: _uid(), titel: 'Orientierung', modus: 'sequenziell',
        items: [_sys('sys_sec0_overview'), _sys('sys_sec0_qblock'), _sys('sys_diagnose_entry')] },
      { sektor_id: _uid(), titel: 'Einstieg & Anmeldung', modus: 'frei',
        items: [_sys('sys_map_full'), _sys('sys_exam_register')] },
      { sektor_id: _uid(), titel: 'Anwendung & Training', modus: 'frei',
        items: [_sys('sys_platzhalter_brian_buendel')] },
      { sektor_id: _uid(), titel: 'Projekt', modus: 'frei',
        items: [_sys('sys_platzhalter_projekt')] },
      { sektor_id: _uid(), titel: 'Abschlusstest', modus: 'frei',
        items: [_sys('sys_external_test')] },
    ],
  };
}

/**
 * STRICT SCHEMA VALIDATION (Mirror of Frontend Zod Schemas)
 * Phase 6.6: Backend-seitige Validierung analog zu Frontend
 */
function validateEinheitPayload(data) {
  const errors = {};

  // titel_der_einheit: required, min 3, max 200
  if (!data.titel_der_einheit || typeof data.titel_der_einheit !== 'string') {
    errors.titel_der_einheit = 'Titel ist erforderlich';
  } else if (data.titel_der_einheit.trim().length < 3) {
    errors.titel_der_einheit = 'Titel muss mindestens 3 Zeichen lang sein';
  } else if (data.titel_der_einheit.length > 200) {
    errors.titel_der_einheit = 'Titel darf maximal 200 Zeichen lang sein';
  }

  // fach: required, must be in enum
  const VALID_FAECHER = [
    'Deutsch', 'Mathematik', 'Englisch', 'Französisch', 'Latein',
    'Biologie', 'Chemie', 'Physik', 'Geschichte', 'Geographie',
    'Politik', 'Wirtschaft', 'Kunst', 'Musik', 'Sport', 'Religion', 'Ethik', 'Informatik'
  ];
  if (!data.fach || !VALID_FAECHER.includes(data.fach)) {
    errors.fach = 'Bitte wählen Sie ein gültiges Fach aus';
  }

  // jahrgangsstufe: required, must be in enum
  const VALID_JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];
  if (!data.jahrgangsstufe || !VALID_JAHRGAENGE.includes(String(data.jahrgangsstufe))) {
    errors.jahrgangsstufe = 'Bitte wählen Sie eine gültige Jahrgangsstufe aus';
  }

  // gesamtziel: optional, max 1000
  if (data.gesamtziel && data.gesamtziel.length > 1000) {
    errors.gesamtziel = 'Gesamtziel darf maximal 1000 Zeichen lang sein';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Main Handler
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = await req.json();
    const { titel_der_einheit, gesamtziel, fach, jahrgangsstufe, freigabe_status } = payload;

    // 3. STRICT INPUT VALIDATION (Phase 6.6: Zod Mirror)
    const validation = validateEinheitPayload(payload);
    if (!validation.valid) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // 4. RBAC Check - Only Administrator, Fachschaftsleitung, Fachlehrkraft can create
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    
    const benutzer = benutzerList?.[0];
    const role = benutzer?.rolle;

    let allowed = false;
    let rbacReason = '';

    if (role === 'Administrator') {
      allowed = true;
    } else if (role === 'Fachschaftsleitung') {
      // Can only create for their subject
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(fach)) {
        allowed = true;
      } else {
        rbacReason = `Cannot create unit for subject: ${fach}. You are responsible for: ${subjects.join(', ') || 'no subjects'}`;
      }
    } else if (role === 'Fachlehrkraft') {
      allowed = true;
    } else {
      rbacReason = `Role ${role} cannot create units`;
    }

    if (!allowed) {
      // Log failed attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'CREATE',
          resource_type: 'Einheiten',
          resource_id: 'new',
          status: 'failed',
          error_message: rbacReason || 'Permission denied',
        });
      } catch (logError) {
        console.error('Audit log error:', logError.message);
      }

      return Response.json(
        { error: rbacReason || 'Permission denied' },
        { status: 403 }
      );
    }

    // 5. Create Einheit (mit Default-Dashboards via eager init).
    //    lernpfade_konfiguration wird mit den Standard-Rastern aller
    //    vier Lerntypen vorbefüllt – kein leeres Dashboard mehr.
    //    Die Default-Struktur ist 1:1 ein Spiegel von
    //    `src/lib/dashboardTemplates.js`. Bei Änderungen beide Stellen
    //    synchron halten.
    const newEinheit = await base44.entities.Einheiten.create({
      titel_der_einheit,
      gesamtziel: gesamtziel || '',
      fach,
      jahrgangsstufe,
      freigabe_status: freigabe_status || 'In Planung',
      lernpfade_konfiguration: buildDefaultLernpfadKonfiguration(),
    });

    // 6. Log Success
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'CREATE',
        resource_type: 'Einheiten',
        resource_id: newEinheit.id,
        status: 'success',
      });
    } catch (logError) {
      console.error('Audit log error:', logError.message);
    }

    // 7. Return Success
    return Response.json(
      {
        success: true,
        data: newEinheit,
        message: `Einheit "${titel_der_einheit}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[CREATE_EINHEIT_ERROR]', error);

    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});