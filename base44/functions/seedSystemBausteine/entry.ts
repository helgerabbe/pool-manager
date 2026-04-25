/**
 * seedSystemBausteine.js
 *
 * Idempotentes Seeding der vier Pflicht-System-Bausteine.
 * - Admin-only.
 * - Findet vorhandene Einträge per baustein_id und legt nur fehlende an.
 * - Aktualisiert keine bestehenden Felder (Schutz vor versehentlichem Reset
 *   einer manuell gepflegten Beschreibung). Falls explizit gewünscht
 *   `force=true` im Payload mitschicken, dann werden Titel/Icon/Texte
 *   überschrieben.
 *
 * Aufruf:
 *   await base44.functions.invoke('seedSystemBausteine', { force?: boolean })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PFLICHT_BAUSTEINE = [
  {
    baustein_id: 'sys_diagnose',
    titel: 'KI-Lerntyp-Diagnose',
    icon: 'message-circle',
    admin_beschreibung:
      'Brian führt mit dem Schüler ein kurzes Diagnose-Gespräch und ordnet ihn einem der vier Lerntypen zu.',
    export_instruktion:
      'Starte ein Diagnosegespräch mit dem Schüler, um seinen Lerntyp (Minimalist, Pragmatiker, Ehrgeizig, Passioniert) zu bestimmen. Ergebnis wird im Profil hinterlegt.',
    ist_aktiv: true,
    reihenfolge: 10,
  },
  {
    baustein_id: 'sys_landkarte',
    titel: 'Lernlandkarte sichten',
    icon: 'map',
    admin_beschreibung:
      'Schüler verschafft sich einen Überblick über die Lernziele und Themen der Einheit auf der Lernlandkarte.',
    export_instruktion:
      'Öffne die Lernlandkarte der aktuellen Einheit. Lies dir die Lernziele und Themenfelder durch und markiere dir, was dir bereits bekannt vorkommt.',
    ist_aktiv: true,
    reihenfolge: 20,
  },
  {
    baustein_id: 'sys_lehrer_check',
    titel: 'Lehrer-Check (Stoppschild)',
    icon: 'stop-circle',
    admin_beschreibung:
      'Sperrpunkt: Der Schüler muss vor dem Weiterarbeiten ein kurzes Gespräch oder eine Sichtprüfung mit der Lehrkraft absolvieren.',
    export_instruktion:
      'STOPP. Bevor du weitermachst, hole dir bitte eine kurze Bestätigung deiner Lehrkraft. Erst danach geht es weiter.',
    ist_aktiv: true,
    reihenfolge: 30,
  },
  {
    baustein_id: 'sys_zwischentest',
    titel: 'Zwischenprüfung / Diagnosetest',
    icon: 'clipboard-check',
    admin_beschreibung:
      'Standardisierter Diagnosetest, der den aktuellen Lernstand abfragt und Empfehlungen für den weiteren Pfad gibt.',
    export_instruktion:
      'Bearbeite den Zwischentest zu den bisher behandelten Lernzielen. Das Ergebnis bestimmt, welche Aufgaben dir als nächstes empfohlen werden.',
    ist_aktiv: true,
    reihenfolge: 40,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let force = false;
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch (_) {
      // No body / invalid JSON — proceed with defaults.
    }

    const existing = await base44.asServiceRole.entities.SystemBausteine.list();
    const existingByKey = new Map(existing.map((b) => [b.baustein_id, b]));

    const created = [];
    const updated = [];
    const skipped = [];

    for (const seed of PFLICHT_BAUSTEINE) {
      const found = existingByKey.get(seed.baustein_id);
      if (!found) {
        const rec = await base44.asServiceRole.entities.SystemBausteine.create(seed);
        created.push(rec.baustein_id);
      } else if (force) {
        await base44.asServiceRole.entities.SystemBausteine.update(found.id, seed);
        updated.push(seed.baustein_id);
      } else {
        skipped.push(seed.baustein_id);
      }
    }

    return Response.json({
      ok: true,
      created,
      updated,
      skipped,
      total: PFLICHT_BAUSTEINE.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});