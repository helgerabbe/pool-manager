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
    const role = benutzer?.rolle;

    let filterCriteria = {};

    // Rolle bestimmt Filtierung:
    if (role === 'Administrator') {
      // Admin sieht alles: Kein Filter
      filterCriteria = {};
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
      // Fach muss in der Liste sein
      filterCriteria = { fach: { $in: subjects } };
    } else if (role === 'Fachlehrkraft' || role === 'Betrachter') {
      // Fachlehrkraft/Betrachter sieht nur Einheiten, zu denen er Mitglied ist
      const membership = await base44.asServiceRole.entities.EinheitMembers.filter({
        user_email: user.email,
      });

      const einheitIds = membership.map((m) => m.einheit_id);
      if (einheitIds.length === 0) {
        // Keine Zuordnungen → keine Einheiten
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
      filterCriteria = { id: { $in: einheitIds } };
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

    // 6. MAP SELECTIVE FIELDS (nur was die Liste braucht)
    const responseData = pageData.map((einheit) => ({
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
    }));

    // 7. RESPONSE
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