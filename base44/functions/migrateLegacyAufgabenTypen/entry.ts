/**
 * migrateLegacyAufgabenTypen.js
 *
 * One-shot Admin-Migration: Setzt `aufgaben_typ` aller bestehenden
 * AllgemeineAufgabe-Records, die noch auf einem der entfernten Legacy-Typen
 * (buendel | prozess | projekt_anker | auswahl_buendel) stehen, hart auf
 * 'inhalt'. Hintergrund: Die App reduziert die Aufgaben-Typen in Ebene 2 auf
 * 'inhalt' (Brian-Aufgabe) und 'handlung' (Handlungsaufgabe). Die übrigen
 * Funktionalitäten leben mittlerweile im Lernpfad-Dashboard.
 *
 * Sicherheit:
 *   - Nur Admins dürfen die Migration auslösen.
 *   - Updates laufen mit Service-Role, damit RLS / locked_by-Guards den
 *     Massen-Update nicht blockieren.
 *
 * Antwort:
 *   { migrated: number, by_typ: { buendel, prozess, projekt_anker, auswahl_buendel } }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LEGACY_TYPEN = ['buendel', 'prozess', 'projekt_anker', 'auswahl_buendel'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rolle prüfen — Admin sowohl über User-Entity als auch Benutzer-Profil.
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const isAdmin = user.role === 'admin' || profile?.[0]?.rolle === 'Administrator';
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const byTyp = { buendel: 0, prozess: 0, projekt_anker: 0, auswahl_buendel: 0 };
    let migrated = 0;

    for (const typ of LEGACY_TYPEN) {
      const records = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({ aufgaben_typ: typ });
      for (const rec of records) {
        try {
          await base44.asServiceRole.entities.AllgemeineAufgabe.update(rec.id, { aufgaben_typ: 'inhalt' });
          byTyp[typ] += 1;
          migrated += 1;
        } catch (e) {
          console.warn('Konnte Aufgabe nicht migrieren', rec.id, e?.message);
        }
      }
    }

    return Response.json({ migrated, by_typ: byTyp });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});