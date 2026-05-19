/**
 * generateTutorPrompt.js
 *
 * Generiert den Hidden-Prompt für eine KI-Tutor-Aufgabe.
 * Dieser Prompt wird beim Speichern automatisch generiert und mit der Aufgabe in Moodle exportiert.
 *
 * Optimierungen:
 * - Schema-Konsistenz: Nutzt Aufgabenbausteine statt MasterAufgabe
 * - Metadaten-Laden: Fach & Jahrgangsstufe über Relationen
 * - Differentielle Prompts: Unterscheidung Ebene 1 (Übung) vs. Ebene 3 (Projekt)
 * - Lernlandkarte für Projektaufgaben
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;

function isAdmin(user, profile) {
  return user?.role === 'admin' || user?.role === 'Administrator' || profile?.rolle === 'Administrator';
}

function isFachschaftForFach(profile, fach) {
  if (profile?.rolle !== 'Fachschaftsleitung') return false;
  const faecher = Array.isArray(profile.fachbereich_zustaendigkeit)
    ? profile.fachbereich_zustaendigkeit
    : [];
  return faecher.includes(fach);
}

async function hasUnitReadAccess(base44, user, einheit) {
  const [profiles, memberships] = await Promise.all([
    base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }),
    einheit?.id
      ? base44.asServiceRole.entities.EinheitMembers.filter({
          einheit_id: einheit.id,
          user_email: user.email,
        })
      : Promise.resolve([]),
  ]);

  const profile = profiles?.[0] || null;
  if (isAdmin(user, profile)) return true;
  if (einheit && isFachschaftForFach(profile, einheit.fach)) return true;
  return !!memberships?.[0];
}

async function listAllByFilter(entity, query, sort = 'created_date') {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { masterId } = body;

    if (!masterId) {
      return Response.json({ error: 'masterId is required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. Aufgabe laden (Aufgabenbausteine statt MasterAufgabe)
    // ─────────────────────────────────────────────────────────────────
    const master = await base44.entities.Aufgabenbausteine.get(masterId).catch(() => null);
    if (!master) {
      return Response.json({ error: 'Aufgabenbaustein nicht gefunden' }, { status: 404 });
    }

    const aufgabenstellung = master.aufgabentext_inhalt || '';
    const erwartungshorizont = master.erwartungshorizont_ki_prompt || '';

    if (!aufgabenstellung || !erwartungshorizont) {
      return Response.json({
        error: 'Aufgabenstellung und Erwartungshorizont sind erforderlich',
      }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Metadaten laden: Lernpaket → Einheit (Fach, Jahrgangsstufe)
    // ─────────────────────────────────────────────────────────────────
    let fach = 'unbekannt';
    let jahrgangsstufe = 'unbekannt';
    let einheitId = null;

    if (master.lernpaket_id) {
      const lernpaket = await base44.asServiceRole.entities.Lernpakete.get(master.lernpaket_id).catch(() => null);
      if (lernpaket && lernpaket.einheit_id) {
        einheitId = lernpaket.einheit_id;
        const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId).catch(() => null);
        if (!(await hasUnitReadAccess(base44, user, einheit))) {
          return Response.json({ error: 'Forbidden: keine Berechtigung für diese Einheit' }, { status: 403 });
        }
        if (einheit) {
          fach = einheit.fach || 'unbekannt';
          jahrgangsstufe = einheit.jahrgangsstufe || 'unbekannt';
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. Ebene-Erkennung: Unterscheide Ebene 1 vs. Ebene 3
    // ─────────────────────────────────────────────────────────────────
    const anforderungsebene = master.anforderungsebene || '1 - Basis';
    const isProjectTask = anforderungsebene === '3 - Projekt';

    // ─────────────────────────────────────────────────────────────────
    // 4. Basis-Prompt mit Kontext
    // ─────────────────────────────────────────────────────────────────
    let tutorPrompt = `SYSTEM-PROMPT FÜR MOODLE KI-TUTOR:

Du agierst als Lernbegleiter im Fach ${fach} für die Jahrgangsstufe ${jahrgangsstufe}.

AUFGABE DES SCHÜLERS:
${aufgabenstellung}

ERWARTUNGSHORIZONT:
${erwartungshorizont}
`;

    // ─────────────────────────────────────────────────────────────────
    // 5. Differenzierte Anweisungen je Ebene
    // ─────────────────────────────────────────────────────────────────
    if (isProjectTask && einheitId) {
      // Ebene 3: Lade Lernziele der Einheit (Lernlandkarte)
      const lernziele = await listAllByFilter(
        base44.asServiceRole.entities.Lernziele,
        { lernpaket_id: master.lernpaket_id }
      ).catch(() => []);

      const lernzieleString = lernziele
        .map(z => `- ${z.formulierung_fachsprache || z.schueler_uebersetzung || '(kein Titel)'}`)
        .join('\n') || '(keine Lernziele hinterlegt)';

      tutorPrompt += `
LERNZIELE DER LERNLANDKARTE:
${lernzieleString}

DEINE AUFGABE - PROZESSORIENTIERTE BEGLEITUNG:
1. Der Schüler arbeitet an einem Projekt. Du begleitest ihn, indem du seine Fortschritte und Zwischenergebnisse gegen den Erwartungshorizont und die Lernziele spiegelst.
2. Stelle keine Fragen, wenn der Schüler nicht aktiv nach Hilfe fragt. Evaluiere stattdessen: Welche Lernziele hat der Schüler schon erreicht? Wo könnte er weiter gehen?
3. Gib keine direkten Lösungen vor, sondern stelle Leitfragen, die dem Schüler helfen, den Erwartungshorizont selbstständig zu erreichen.
4. Beziehe dich in deinen Rückmeldungen explizit auf die Lernziele der Lernlandkarte.
5. Sei ermutigend und würdige Teilerfolge.

TONALITÄT:
- Beratend und unterstützend
- Klar und verständlich
- Fokussiert auf selbstständige Problemlösung
- Verwende Sprache, die der Jahrgangsstufe ${jahrgangsstufe} entspricht`;
    } else {
      // Ebene 1: Direkte Feedback-Logik
      tutorPrompt += `
DEINE AUFGABE - DIREKTE ÜBERPRÜFUNG UND FEEDBACK:
1. Analysiere die Schülereingabe und vergleiche sie mit dem Erwartungshorizont.
2. Gib SOFORT Feedback, ob die Antwort korrekt, teilweise korrekt oder falsch ist.
3. Bei falscher oder unvollständiger Antwort: Nenne den KONKRETEN FEHLER oder was FEHLT.
4. Gib IMMER einen hilfreichen Tipp, ohne die korrekte Lösung direkt zu verraten.
5. Sei konstruktiv und ermutigend. Dein Ton soll lernunterstützend sein, nicht kritisierend.

TONALITÄT:
- Respektvoll und ermunternd
- Klar und verständlich
- Fokussiert auf Verbesserung, nicht auf Kritik
- Verwende einfache Sprache, die der Jahrgangsstufe ${jahrgangsstufe} entspricht`;
    }

    return Response.json({
      tutorPrompt,
      metadata: {
        fach,
        jahrgangsstufe,
        ebene: anforderungsebene,
        isProjectTask,
      },
      status: 'success',
    });
  } catch (error) {
    console.error('[generateTutorPrompt] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});