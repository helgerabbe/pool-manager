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
    baustein_id: 'sys_landkarte',
    titel: 'Lernlandkarte sichten',
    icon: 'map',
    typ: 'baustein',
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
    typ: 'baustein',
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
    typ: 'baustein',
    admin_beschreibung:
      'Standardisierter Diagnosetest, der den aktuellen Lernstand abfragt und Empfehlungen für den weiteren Pfad gibt.',
    export_instruktion:
      'Bearbeite den Zwischentest zu den bisher behandelten Lernzielen. Das Ergebnis bestimmt, welche Aufgaben dir als nächstes empfohlen werden.',
    ist_aktiv: true,
    reihenfolge: 40,
  },
  {
    baustein_id: 'sys_themenfeld_intro',
    titel: 'Einführung in das Themenfeld',
    icon: 'info',
    typ: 'baustein',
    admin_beschreibung:
      'Kurze Einführung in das jeweilige Themenfeld – worum geht es, was sind die Schwerpunkte.',
    export_instruktion:
      'Gib dem Schüler eine kurze, motivierende Einführung in das aktuelle Themenfeld: worum geht es, welche Schwerpunkte erwarten ihn.',
    ist_aktiv: true,
    reihenfolge: 45,
  },
  // ── Dashboards V2: Lernlandkarten-Varianten ──────────────────────────
  {
    baustein_id: 'sys_map_reduced',
    titel: 'Lernlandkarte (verringerte Version)',
    icon: 'map',
    typ: 'baustein',
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
    typ: 'baustein',
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
    typ: 'baustein',
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
    typ: 'baustein',
    admin_beschreibung:
      'Hinweis auf einen externen Test (z. B. Classtime, Kahoot). Der eigentliche Test findet außerhalb der App statt.',
    export_instruktion:
      'Verweise den Schüler auf einen externen Test (z. B. Classtime). Die Bearbeitung erfolgt außerhalb der Plattform; nach Abschluss kehrt der Schüler hierher zurück.',
    ist_aktiv: true,
    reihenfolge: 55,
  },
  // ── Bündel (typ='buendel'): 1:n-Container, die andere Bausteine/Aufgaben
  //    aufnehmen. Die IDs tragen aus historischen Gründen noch das
  //    `sys_platzhalter_`-Präfix, sind aber KEINE Platzhalter mehr, sondern
  //    eine eigene, dauerhafte Systembaustein-Art. ────────────────────────
  {
    baustein_id: 'sys_platzhalter_moodle_buendel',
    titel: 'Lernpaket-Bündel',
    icon: 'package',
    typ: 'buendel',
    baustein_modus: 'bundle_1ton',
    accepted_types: ['lernpaket'],
    admin_beschreibung:
      'Bündel: nimmt ein oder mehrere Lernpakete auf. Die enthaltenen Pakete werden im Schülerpfad nacheinander bearbeitet.',
    export_instruktion:
      'Bündel aus einem oder mehreren Lernpaketen. Der Schüler bearbeitet die enthaltenen Pakete in der vorgegebenen Reihenfolge.',
    ist_aktiv: true,
    reihenfolge: 160,
  },
  {
    baustein_id: 'sys_platzhalter_brian_buendel',
    titel: 'Aufgaben-Bündel (X von Y)',
    icon: 'package-check',
    typ: 'buendel',
    baustein_modus: 'bundle_1ton',
    accepted_types: ['auswahl_buendel'],
    admin_beschreibung:
      'Bündel: nimmt mehrere Aufgaben auf, von denen der Schüler eine festgelegte Anzahl (X von Y) bearbeiten muss.',
    export_instruktion:
      'Bündel aus mehreren Aufgaben. Der Schüler wählt aus dem Angebot eine festgelegte Anzahl (X von Y) aus und bearbeitet sie.',
    ist_aktiv: true,
    reihenfolge: 170,
  },
  {
    baustein_id: 'sys_projektbuendel',
    titel: 'Projekt-Bündel',
    icon: 'rocket',
    typ: 'buendel',
    baustein_modus: 'bundle_1ton',
    accepted_types: ['projekt'],
    admin_beschreibung:
      'Bündel: nimmt eine oder mehrere Projektaufgaben (Ebene 3) auf, die der Schüler frei wählen kann.',
    export_instruktion:
      'Bündel aus Projektaufgaben. Der Schüler wählt frei aus dem Angebot und bearbeitet die gewählten Projekte.',
    ist_aktiv: true,
    reihenfolge: 175,
  },
  // ── Feedback-Sektor (Schüler-Rückmeldung am Ende der Einheit) ────────
  // Statischer Anker, kein Drop-Target. Wird im Schüler-Frontend zu einem
  // kleinen Ticketing-Formular: „Was war gut, was nicht, was können wir
  // besser machen?" Antworten fließen ins Feedback-Postfach der Lehrkraft.
  {
    baustein_id: 'sys_feedback',
    titel: 'Schüler-Feedback zur Einheit',
    icon: 'message-square',
    typ: 'baustein',
    admin_beschreibung:
      'Ticketing-Formular am Ende der Einheit: Schüler melden zurück, was gut lief, was nicht und was verbessert werden kann. Lehrkraft erhält die Tickets im Feedback-Postfach.',
    export_instruktion:
      'Biete dem Schüler ein kurzes Feedback-Formular an: 1) Was lief gut? 2) Was lief nicht so gut? 3) Was können wir verbessern? Die Antworten werden als Feedback-Ticket an die Lehrkraft übermittelt.',
    ist_aktiv: true,
    reihenfolge: 999,
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

    // ── Aufräumen: veraltete echte 1:1-Platzhalter + Onboarding-Bausteine
    //    aus der DB entfernen. Bündel-IDs (sys_platzhalter_*_buendel) bleiben
    //    erhalten — sie sind jetzt typ='buendel'. Onboarding-Bausteine sind in
    //    den Generate-Funktionen + OnboardingTab hart codiert und werden nicht
    //    mehr aus den SystemBausteinen gezogen.
    const VERALTETE_IDS = new Set([
      'sys_platzhalter_handlung',
      'sys_platzhalter_basispaket',
      'sys_platzhalter_ebene2',
      'sys_platzhalter_projekt',
      'sys_platzhalter_info',
      'sys_platzhalter_reflexion',
      'sys_platzhalter_zwischentest',
      // Onboarding-Bausteine: jetzt hart codiert im OnboardingTab + Generate-
      // Funktionen, daher aus dem Pool entfernt.
      'sys_sec0_overview',
      'sys_sec0_qblock',
      'sys_diagnose_entry',
      'sys_diagnose',
    ]);
    const deleted = [];
    for (const b of existing) {
      if (VERALTETE_IDS.has(b.baustein_id)) {
        await base44.asServiceRole.entities.SystemBausteine.delete(b.id);
        deleted.push(b.baustein_id);
      }
    }

    const seedKeys = new Set(PFLICHT_BAUSTEINE.map((s) => s.baustein_id));
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
        // typ nachziehen, falls bei Bestands-Bausteinen noch nicht gesetzt
        // (idempotent, auch ohne force) — leichter Migrationsschritt.
        if (!found.typ) {
          const typ = seed.typ || 'baustein';
          await base44.asServiceRole.entities.SystemBausteine.update(found.id, { typ });
          updated.push(`${seed.baustein_id} (typ)`);
        } else {
          skipped.push(seed.baustein_id);
        }
      }
    }

    return Response.json({
      ok: true,
      created,
      updated,
      deleted,
      skipped,
      total: PFLICHT_BAUSTEINE.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});