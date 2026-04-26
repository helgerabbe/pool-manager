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
  // ── Magic-Raster Platzhalter (Phase 1) ───────────────────────────────
  // Diese vier Bausteine fungieren als Drop-Zonen-Erinnerungen in
  // Standard-Vorlagen. Sie werden vor dem Export entfernt und tragen
  // deshalb eine warnende export_instruktion.
  {
    baustein_id: 'sys_platzhalter_handlung',
    titel: 'Ggf. handlungsorientierte Aufgabe (optional)',
    icon: 'hand',
    admin_beschreibung:
      'Optionaler Platzhalter: Hier kann – muss aber nicht – eine handlungsorientierte Aufgabe eingefügt werden. Visuell als fakultativ gekennzeichnet.',
    export_instruktion:
      'OPTIONALER PLATZHALTER – kann durch eine handlungsorientierte Aufgabe ersetzt werden. Wenn nicht benötigt, vor Freigabe entfernen.',
    ist_aktiv: true,
    reihenfolge: 100,
  },
  {
    baustein_id: 'sys_platzhalter_basispaket',
    titel: 'Platzhalter: Basispaket / Bündel',
    icon: 'layers',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später ein Bündel (mehrere Lernpakete der Ebene 1) eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch eine echte Bündel-Aufgabe ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 110,
  },
  {
    baustein_id: 'sys_platzhalter_ebene2',
    titel: 'Platzhalter: Inhaltliche Aufgabe (Ebene 2)',
    icon: 'file-text',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später eine inhaltliche Transfer-Aufgabe (Ebene 2) eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch eine echte Ebene-2-Aufgabe ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 120,
  },
  {
    baustein_id: 'sys_platzhalter_projekt',
    titel: 'Platzhalter: Projekt-Aufgabe (Ebene 3)',
    icon: 'star',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später ein Projekt-Anker auf eine Ebene-3-Projektaufgabe eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch eine echte Projekt-Aufgabe ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 130,
  },
  {
    baustein_id: 'sys_platzhalter_info',
    titel: 'Einführung in das Themenfeld',
    icon: 'info',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später eine Einführung in das Themenfeld (Infoseite oder Prozess-Aufgabe) eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch eine echte Einführung (Infoseite oder Prozess-Aufgabe) ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 140,
  },
  {
    baustein_id: 'sys_platzhalter_reflexion',
    titel: 'Platzhalter: Reflexionsaufgabe',
    icon: 'message-circle',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später eine Reflexionsaufgabe (Selbsteinschätzung, Lernrückblick) eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch eine echte Reflexionsaufgabe ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 150,
  },
  // ── Dashboards V2: Sektion-0-Bausteine ───────────────────────────────
  {
    baustein_id: 'sys_sec0_overview',
    titel: 'Kurze Einführung in die Einheit',
    icon: 'book-open',
    admin_beschreibung:
      'Einfache Sprache: Schüler bekommt eine kompakte Übersicht der Einheit. Bestätigung per Button („Verstanden").',
    export_instruktion:
      'Zeige dem Schüler eine kurze Übersicht der Einheit in einfacher Sprache. Der Schüler bestätigt das Lesen per Klick auf den „Verstanden"-Button, bevor es weitergeht.',
    ist_aktiv: true,
    reihenfolge: 5,
  },
  {
    baustein_id: 'sys_sec0_qblock',
    titel: 'Freiwilliger Fragenblock für die Einstiegsdiagnose',
    icon: 'help-circle',
    admin_beschreibung:
      'Optionale Eingangsfragen, die der Schüler an die KI stellen kann, bevor er mit der Einheit beginnt.',
    export_instruktion:
      'Biete dem Schüler einen freiwilligen Fragenblock an. Er darf offene Fragen zur Einheit stellen; die KI beantwortet sie kurz und verständlich. Überspringbar.',
    ist_aktiv: true,
    reihenfolge: 7,
  },
  // ── Dashboards V2: Lernlandkarten-Varianten ──────────────────────────
  {
    baustein_id: 'sys_map_reduced',
    titel: 'Lernlandkarte (verringerte Version)',
    icon: 'map',
    admin_beschreibung:
      'Reduzierte Lernlandkarte – nur die wichtigsten Lernziele und Themen werden angezeigt. Wird später per KI dynamisch generiert.',
    export_instruktion:
      'Zeige eine reduzierte Version der Lernlandkarte mit den Kern-Lernzielen der Einheit. Der Schüler verschafft sich einen Überblick.',
    ist_aktiv: true,
    reihenfolge: 22,
  },
  {
    baustein_id: 'sys_map_full',
    titel: 'Lernlandkarte (vollständige Version)',
    icon: 'map',
    admin_beschreibung:
      'Vollständige Lernlandkarte mit allen Lernzielen, Themen und Verknüpfungen. Wird später per KI dynamisch generiert.',
    export_instruktion:
      'Zeige die vollständige Lernlandkarte mit allen Lernzielen und Themenfeldern der Einheit. Der Schüler verschafft sich einen detaillierten Überblick.',
    ist_aktiv: true,
    reihenfolge: 24,
  },
  // ── Dashboards V2: Prüfungs-/Test-Bausteine ──────────────────────────
  {
    baustein_id: 'sys_exam_register',
    titel: 'Anmeldung zur schriftlichen Arbeit',
    icon: 'pencil',
    admin_beschreibung:
      'Anmelde-Hinweis: Schüler bestätigt seine Bereitschaft für die schriftliche Arbeit.',
    export_instruktion:
      'Fordere den Schüler auf, sich zur schriftlichen Arbeit anzumelden, sobald er sich bereit fühlt. Die Anmeldung erfolgt per Bestätigung.',
    ist_aktiv: true,
    reihenfolge: 50,
  },
  {
    baustein_id: 'sys_external_test',
    titel: 'Externer Test (z. B. Classtime)',
    icon: 'external-link',
    admin_beschreibung:
      'Hinweis auf einen externen Test (z. B. Classtime, Kahoot). Der eigentliche Test findet außerhalb der App statt.',
    export_instruktion:
      'Verweise den Schüler auf einen externen Test (z. B. Classtime). Die Bearbeitung erfolgt außerhalb der Plattform; nach Abschluss kehrt der Schüler hierher zurück.',
    ist_aktiv: true,
    reihenfolge: 55,
  },
  // ── Dashboards V2: Bündel-Platzhalter ────────────────────────────────
  {
    baustein_id: 'sys_platzhalter_moodle_buendel',
    titel: 'Platzhalter für ein oder mehrere Lernpakete',
    icon: 'package',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später ein oder mehrere Lernpakete (aufgaben_typ=buendel mit lernpaket_logik) eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch ein oder mehrere echte Lernpakete ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 160,
  },
  {
    baustein_id: 'sys_platzhalter_zwischentest',
    titel: 'Platzhalter für einen Zwischentest',
    icon: 'clipboard-check',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später ein Lernpaket eingefügt werden, das als Zwischentest (test_only) dient.',
    export_instruktion:
      'PLATZHALTER – muss durch ein echtes Zwischentest-Lernpaket ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 165,
  },
  {
    baustein_id: 'sys_platzhalter_brian_buendel',
    titel: 'Platzhalter: Brian-Bündel (X von Y)',
    icon: 'package-check',
    admin_beschreibung:
      'Drop-Zone-Erinnerung: Hier soll später ein Brian-Bündel (aufgaben_typ=auswahl_buendel mit erforderliche_anzahl) eingefügt werden.',
    export_instruktion:
      'PLATZHALTER – muss durch ein echtes Brian-Bündel mit X-von-Y-Auswahl ersetzt werden, bevor der Pfad freigegeben wird.',
    ist_aktiv: true,
    reihenfolge: 170,
  },
  // ── Sektor 0: Einstiegsdiagnose ──────────────────────────────────────
  {
    baustein_id: 'sys_diagnose_entry',
    titel: 'Einstiegsdiagnose',
    icon: 'clipboard-check',
    admin_beschreibung:
      'Kurze Eingangsdiagnose zur Bestimmung des individuellen Startpunkts in der Einheit. Ergebnisse fließen in die Pfad-Empfehlung ein.',
    export_instruktion:
      'Bearbeite eine kurze Einstiegsdiagnose, um deinen Startpunkt in der Einheit zu bestimmen.',
    ist_aktiv: true,
    reihenfolge: 8,
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