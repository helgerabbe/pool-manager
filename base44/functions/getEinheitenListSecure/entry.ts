/**
 * getEinheitenListSecure.js
 *
 * Phase 6.5: Paginierter Einheiten-List-Endpoint
 * - Löst Überlastung bei großen Datenmengen
 * - Serverseitige Pagination (Limit + Offset)
 * - RBAC: Filtert nach Benutzer-Berechtigung
 * - Selective Fetching: Nur Listenansicht-Felder
 *
 * Response-Format:
 * {
 *   success: true,
 *   data: [
 *     { id, fach, titel_der_einheit, jahrgangsstufe, freigabe_status, ... },
 *     ...
 *   ],
 *   meta: {
 *     total_count: 47,
 *     current_page: 1,
 *     total_pages: 4,
 *     page_size: 15
 *   }
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Initialize & Auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Payload
    const payload = await req.json();
    const page = Math.max(1, payload.page || 1); // Min: 1
    const limit = Math.min(Math.max(1, payload.limit || 15), 100); // Min: 1, Max: 100

    const offset = (page - 1) * limit;

    // 3. RBAC: Bestimme welche Einheiten der User sehen darf
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    const benutzer = benutzerList?.[0];
    
    // CRITICAL: Admin-Rolle hat höchste Priorität - auch wenn kein Profil existiert
    // User.role ist die Systemrolle aus der eingebauten User-Entität
    const role = user.role === 'admin' ? 'Administrator' : (benutzer?.rolle || 'Betrachter');

    // Basis-Filter: Entwürfe (noch im Wizard) sind für alle unsichtbar,
    // außer dem Ersteller selbst. Da der Ersteller der einzige ist, der
    // im Wizard arbeitet, reicht es, wizard_status != 'entwurf' zu filtern.
    const draftFilter = { wizard_status: { $ne: 'entwurf' } };

    let filterCriteria = { ...draftFilter };

    // Rolle bestimmt Filterung:
    if (role === 'Administrator') {
      // Admin sieht ALLE Einheiten außer Entwürfen (immer!)
      filterCriteria = { ...draftFilter };
    } else if (role === 'Fachschaftsleitung') {
      // Fachschaftsleitung sieht nur ihre Fächer
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.length === 0) {
        // Keine Fächer zugeordnet → keine Einheiten
        return Response.json(
          {
            success: true,
            data: [],
            meta: {
              total_count: 0,
              current_page: page,
              total_pages: 0,
              page_size: limit,
            },
          },
          {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      }
      // Fach muss in der Liste sein, und kein Entwurf
      filterCriteria = { ...draftFilter, fach: { $in: subjects } };
    } else if (role === 'Fachlehrkraft' || role === 'Betrachter') {
      // Fachlehrkraft/Betrachter sieht alle Einheiten IHRER FÄCHER
      // Primäre Regel: fach muss in fachbereich_zustaendigkeit enthalten sein
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.length === 0) {
        // Keine Fächer zugeordnet → keine Einheiten
        return Response.json(
          {
            success: true,
            data: [],
            meta: {
              total_count: 0,
              current_page: page,
              total_pages: 0,
              page_size: limit,
            },
          },
          {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      }
      // Fach muss in der Liste sein, und kein Entwurf
      filterCriteria = { ...draftFilter, fach: { $in: subjects } };
    } else {
      // Unbekannte Rolle → keine Einheiten
      return Response.json(
        {
          success: true,
          data: [],
          meta: {
            total_count: 0,
            current_page: page,
            total_pages: 0,
            page_size: limit,
          },
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 4. ZÄHLE GESAMT (für Pagination Metadata)
    const allEinheiten = await base44.asServiceRole.entities.Einheiten.filter(
      filterCriteria
    );
    const totalCount = allEinheiten.length;
    const totalPages = Math.ceil(totalCount / limit);

    // 5. FETCH SEITE (mit Pagination)
    // Hinweis: Base44 SDK hat kein built-in skip/limit, daher Client-Side pagination
    // In Produktionssystem würde Backend-Query mit LIMIT/OFFSET optimiert
    const pageData = allEinheiten.slice(offset, offset + limit);

    // 6. LADE MITGLIEDER FÜR ALLE EINHEITEN (für Unit-Level RBAC)
    const einheitIds = pageData.map(e => e.id);
    const alleMembers = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: { $in: einheitIds }
    });

    // 7. MAP SELECTIVE FIELDS (nur was die Liste braucht) + Members
    const responseData = pageData.map((einheit) => {
      const members = alleMembers.filter(m => m.einheit_id === einheit.id);
      return {
        id: einheit.id,
        fach: einheit.fach,
        titel_der_einheit: einheit.titel_der_einheit,
        jahrgangsstufe: einheit.jahrgangsstufe,
        freigabe_status: einheit.freigabe_status,
        sync_status: einheit.sync_status,
        last_synced_at: einheit.last_synced_at,
        last_exported_at: einheit.last_exported_at,
        created_date: einheit.created_date,
        updated_date: einheit.updated_date,
        version: einheit.version,
        structural_lock: einheit.structural_lock,
        structural_locked_at: einheit.structural_locked_at,
        // ✅ KRITISCH: Lernpfad-Konfiguration für Tab 7 (Dashboards).
        // Wird vom LernpfadeCockpit gelesen, um den letzten gespeicherten
        // Stand aus der DB zu rekonstruieren. Ohne diese Felder verliert
        // das Cockpit den Stand bei jedem Tab-Wechsel.
        lernpfade_konfiguration: einheit.lernpfade_konfiguration,
        lernpfade_schema_version: einheit.lernpfade_schema_version,
        // ✅ Unit-Level-Mitglieder für RBAC-Prüfung
        members: members.map(m => ({
          user_email: m.user_email,
          unit_role: m.unit_role,
          user_name: m.user_name
        }))
      };
    });
    
    // 8. DEBUG: Logge RBAC-Filterung für Audit
    console.log('[EINHEITEN_LIST_SECURE] RBAC-Filter:', {
      user_email: user.email,
      user_role_system: user.role,
      user_role_resolved: role,
      benutzer_rolle: benutzer?.rolle,
      subjects: role === 'Fachlehrkraft' || role === 'Betrachter' ? benutzer?.fachbereich_zustaendigkeit : 'N/A',
      filterCriteria: JSON.stringify(filterCriteria),
      allEinheiten_count: allEinheiten.length,
      filtered_count: responseData.length,
      total_count: totalCount,
    });
    
    // Zeige auch alle Einheiten die gefiltert wurden
    console.log('[EINHEITEN_LIST_SECURE] Alle verfügbaren Einheiten:', allEinheiten.map(e => ({
      id: e.id,
      titel: e.titel_der_einheit,
      fach: e.fach,
      wizard_status: e.wizard_status,
    })));

    // 9. RESPONSE
    const response = {
      success: true,
      data: responseData,
      meta: {
        total_count: totalCount,
        current_page: page,
        total_pages: totalPages,
        page_size: limit,
      },
    };

    return Response.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[EINHEITEN_LIST_ERROR]', error);

    return Response.json(
      { error: error.message || 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});