/**
 * seedMBKGlobalPrompts.js
 *
 * Idempotenter Seed-Endpoint für die `MBKGlobalPrompt`-Tabelle.
 * Lädt den initialen Bestand (Mission-Statement, Lerntyp-/Struktur-
 * Definitionen, Systembausteine) ein. Bestehende Datensätze mit identischem
 * `schluessel` werden NICHT überschrieben — die Pflege läuft danach
 * ausschließlich über den MBK-Prompt-Manager im Export-Center.
 *
 * RBAC: Administrator + Moodle-Designer.
 *
 * Antwort: { ok: true, created: number, skipped: number }
 *
 * Hinweis: Re-Deploy-Trigger nach initialer Anlage.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLE_ADMIN = 'Administrator';
const ROLLE_MOODLE = 'Moodle-Designer';

const SEED = [
  {
    kategorie: 'global',
    schluessel: 'global_mission_statement',
    anzeigename: 'Mission Statement (System Prompt)',
    prompt_text:
      "Du bist die MBK (Moodle Bilder KI), ein hochspezialisierter didaktischer KI-Assistent. Deine Aufgabe ist es, strukturierte Planungsdaten von Lehrkräften in schülergerechte, motivierende und technisch saubere Moodle-Kursinhalte zu übersetzen. Formatiere deine Antworten immer in sauberem Markdown, das direkt in Moodle importiert werden kann (nutze H3/H4 für Überschriften, Fettdruck für Kernbegriffe, Bulletpoints für Listen). Sprich die Schüler direkt, motivierend und in einer altersgerechten, verständlichen Sprache an.",
    sort_order: 10,
  },
  {
    kategorie: 'global',
    schluessel: 'def_lerntypen',
    anzeigename: 'Definition: Die 4 Lerntypen',
    prompt_text:
      'Passe deine Tonalität und Komplexität strikt an den jeweiligen Lerntyp an. 1. Minimalist: Braucht nur das absolute Basiswissen. Kurze, prägnante Sätze. Direkter Weg zum Ziel ohne Exkurse. 2. Pragmatiker: Lernt klassisch Schritt für Schritt. Braucht klare Anleitungen, Beispiele und moderate Übung. 3. Ehrgeizig: Möchte Zusammenhänge verstehen. Nutze anspruchsvollere Sprache und fördere Transferwissen. 4. Passioniert: Sucht die maximale Herausforderung. Integriere Details, Fachsprache, Exkurse und komplexe Problemstellungen.',
    sort_order: 20,
  },
  {
    kategorie: 'global',
    schluessel: 'def_struktur',
    anzeigename: 'Definition: Einheit, Themenfeld, Lernpaket',
    prompt_text:
      "Kontext zur Struktur: Eine 'Einheit' ist das übergeordnete Unterrichtsthema (z.B. für mehrere Wochen). Ein 'Themenfeld' ist ein logischer Unterabschnitt (vergleichbar mit einem Kapitel) und strukturiert den Moodle-Kurs. Ein 'Lernpaket' ist die kleinste, in sich geschlossene didaktische Einheit mit einem klaren Lernziel und konkreten Aufgaben.",
    sort_order: 30,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_einfuehrung',
    anzeigename: 'Systembaustein: Einführung in die Einheit',
    prompt_text:
      'Erstelle für diesen Baustein einen motivierenden Problemaufriss für den Start der Einheit. Fasse in maximal 150 Wörtern zusammen, worum es geht und warum das Thema für die Lebenswelt der Schüler relevant ist. Formuliere am Ende eine spannende Leitfrage, die im Laufe der Einheit beantwortet wird. Formatiere dies als ansprechenden Text für ein Moodle-Textfeld.',
    sort_order: 100,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_einstiegsdiagnose',
    anzeigename: 'Systembaustein: Einstiegsdiagnose',
    prompt_text:
      'Erstelle für diesen Baustein die Struktur für ein Moodle-Quiz zur Überprüfung des Vorwissens. Generiere 4 einfache Multiple-Choice-Fragen zum Thema. Wichtig: Betone im Einleitungstext, dass dieses Quiz nicht benotet wird, sondern nur der Orientierung dient. Formuliere ein freundliches Feedback für das Ende des Tests, das Schülern bei niedriger Punktzahl rät, stressfrei mit den Grundlagen-Lernpaketen zu starten.',
    sort_order: 110,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_lernlandkarte',
    anzeigename: 'Systembaustein: Lernlandkarte',
    prompt_text:
      "Erstelle für diesen Baustein eine strukturierte 'Lernlandkarte'. Liste die kommenden Themenfelder der Einheit stichpunktartig als Markdown-Liste auf. Schreibe zu jedem Themenfeld einen kurzen, einladenden Teaser-Satz (max. 15 Wörter), was die Schüler dort konkret lernen oder tun werden. Ziel ist absolute Transparenz über den Lernweg.",
    sort_order: 120,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_lernpaketebuendel',
    anzeigename: 'Systembaustein: Lernpaketebündel',
    prompt_text:
      'Dieser Baustein bündelt thematisch verwandte Lernpakete. Erstelle einen kurzen, überleitenden Einleitungstext. Erkläre den Schülern kurz und motivierend, wie die folgenden Pakete inhaltlich zusammenhängen und warum sie in dieser Kombination wichtig für das Verständnis des Themas sind.',
    sort_order: 130,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_freiwillige_uebung',
    anzeigename: 'Systembaustein: Freiwillige Übung',
    prompt_text:
      'Generiere für diesen Baustein einen unbenoteten Übungsblock (z.B. für ein Moodle H5P-Element). Erstelle 4 abwechslungsreiche Übungsfragen (z.B. Lückentext-Vorgaben oder Wahr/Falsch-Aussagen) passend zum vorherigen Lernpaket. Betone im Einleitungstext explizit, dass dies ein geschützter Raum zum Ausprobieren und Fehlermachen ist.',
    sort_order: 140,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_abschlussreflexion',
    anzeigename: 'Systembaustein: Abschlussreflexion (Exit-Ticket)',
    prompt_text:
      "Erstelle für diesen Baustein den Text für eine abschließende Moodle-Umfrage ('Exit-Ticket'). Formuliere eine herzliche Verabschiedung aus der Einheit. Stelle 3 Reflexionsfragen: 1. Was hast du in dieser Einheit besonders gut verstanden? 2. Wobei bist du dir noch unsicher oder was fiel dir schwer? 3. Wie bewertest du die Aufgabenformate? Bedanke dich für den Einsatz.",
    sort_order: 150,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    const rolle = profil?.rolle;
    if (rolle !== ROLLE_ADMIN && rolle !== ROLLE_MOODLE) {
      return Response.json(
        { error: 'Forbidden: Nur Administrator oder Moodle-Designer dürfen den Seed ausführen.' },
        { status: 403 }
      );
    }

    const existing = await base44.asServiceRole.entities.MBKGlobalPrompt.list();
    const bySchluessel = new Map((existing || []).map((p) => [p.schluessel, p]));

    let created = 0;
    let skipped = 0;
    for (const seed of SEED) {
      if (bySchluessel.has(seed.schluessel)) {
        skipped += 1;
        continue;
      }
      await base44.asServiceRole.entities.MBKGlobalPrompt.create({
        ...seed,
        ist_aktiv: true,
      });
      created += 1;
    }

    return Response.json({ ok: true, created, skipped });
  } catch (error) {
    console.error('[seedMBKGlobalPrompts]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});