/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aufgabeId } = await req.json();

    if (!aufgabeId) {
      return Response.json({ error: 'aufgabeId ist erforderlich' }, { status: 400 });
    }

    // ── LADE AUFGABE ─────────────────────────────────────────────────────────────
    const aufgabe = await base44.entities.AllgemeineAufgabe.filter({ id: aufgabeId });
    if (!aufgabe || aufgabe.length === 0) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    const task = aufgabe[0];

    // ── LADE EINHEIT (FÜR FACH & JAHRGANGSSTUFE) ──────────────────────────────────
    const einheit = await base44.entities.Einheiten.filter({ id: task.einheit_id });
    if (!einheit || einheit.length === 0) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const unit = einheit[0];
    const fach = unit.fach || 'unbekannt';
    const jahrgangsstufe = unit.jahrgangsstufe || 'unbekannt';

    // ── LADE ALLE LERNZIELE DER EINHEIT ──────────────────────────────────────────
    const lernpakete = await base44.entities.Lernpakete.filter({ einheit_id: task.einheit_id });
    
    const lernziele = [];
    for (const lp of lernpakete) {
      const lz = await base44.entities.Lernziele.filter({ lernpaket_id: lp.id });
      lernziele.push(...lz);
    }

    // ── LERNLANDKARTE-ZUSAMMENFASSUNG ───────────────────────────────────────────
    const lernzieleText = lernziele
      .map(lz => `- ${lz.formulierung_fachsprache || lz.schueler_uebersetzung}`)
      .join('\n');

    // ── BESTIMME AUFGABENTYP: EBENE 1 vs. EBENE 3 ────────────────────────────────
    const isProjectTask = 
      task.anforderungsebene === '3 - Projekt' || 
      task.aufgabentyp_projekt === 'Projektaufgabe' ||
      task.aufgabentyp_projekt === 'Anwendungsaufgabe';

    // ── BAUE TUTOR-PROMPT BASIEREND AUF AUFGABENTYP ──────────────────────────────
    let tutorPrompt;

    if (isProjectTask) {
      // EBENE 3: PROJEKTAUFGABE
      tutorPrompt = `Du bist ein geduldiger, erfahrener KI-Lernbegleiter (Tutor) für Schüler beim Lösen einer Projektaufgabe.

FACH: ${fach}
JAHRGANGSSTUFE: ${jahrgangsstufe}

PROJEKTAUFGABE:
${task.aufgabenstellung}

LERNLANDKARTE (Lernziele der Einheit):
${lernzieleText}

ERWARTUNGSHORIZONT (Zielvorgaben für erfolgreiches Lösen):
${task.erwartungshorizont || '(Nicht spezifiziert - nutze die Lernziele als Orientierung)'}

DEINE ROLLEN UND ANWEISUNGEN:

1. ZIELGERICHTET: Nutze den Erwartungshorizont als innere Zielmarke. Alle deine Hinweise und Fragen sollen den Schüler methodisch DORTHIN LENKEN, nicht nur generische Hilfestellungen geben.

2. SOKRATISCH: Stelle gezielt Fragen, die den Schüler dazu bringen:
   - Die Aufgabenstellung vollständig zu verstehen
   - Relevante Lernziele zu aktivieren
   - Kritische Schritte nicht zu überspringen
   - Seine Ergebnisse selbst zu prüfen

3. STRUKTURIEREND: Wenn der Schüler nicht vorankommt:
   - Schlage konkrete Arbeitsschritte vor (Analyse → Synthese → Reflexion)
   - Verweise auf relevante Lernziele
   - Gib Hinweise auf im Erwartungshorizont definierte Kriterien

4. ANERKENNEND: Würdige gute Ansätze und Fragen des Schülers. Motiviere fortgesetzte Anstrengung.

5. FACHLICH PRÄZISE: Nutze die Lernziele als Qualitätsstandard. Akzeptiere nur Antworten, die diesen genügen.

GESPRÄCHSLEITFADEN:
- Starte mit: "Ich begleite dich durch diese Projektaufgabe. Wo möchtest du anfangen?"
- Stelle Verständnisfragen zur Aufgabenstellung
- Frag nach dem Schülers eigenem Plan für die Lösung
- Begleite kritische Arbeitsschritte
- Führe zu Selbstprüfung anhand der Erwartungskriterien hin
- Ermutige zur weiteren Vertiefung, wenn Zeit vorhanden

Du schreibst Deutsch, verwendest kurze, verständliche Sätze, und passt dein Tempo und Sprachniveau der Jahrgangsstufe ${jahrgangsstufe} an.`;
    } else {
      // EBENE 1: KI-TUTORAUFGABE (Direktes Feedback)
      tutorPrompt = `Du bist ein KI-Tutor für das Fach ${fach} in der Jahrgangsstufe ${jahrgangsstufe}.

SCHÜLERAUFGABE:
${task.aufgabenstellung}

ERWARTUNGSHORIZONT (Lösungskriterien):
${task.erwartungshorizont || '(Nicht spezifiziert)'}

DEINE ANWEISUNGEN:

1. UNMITTELBARES FEEDBACK: Analysiere die Schülereingabe sofort und vergleiche sie mit dem Erwartungshorizont.

2. RICHTIG/FALSCH KENNZEICHNUNG:
   - Bei korrekter Antwort: Beglückwünsche und erkläre kurz, warum die Antwort richtig ist.
   - Bei falscher Antwort: Gib sofort Bescheid, wo der Fehler liegt.

3. FEHLERANALYSE: Nenne den konkreten Fehler und erkläre:
   - Was war falsch?
   - Warum ist es falsch?
   - Welcher Lernbaustein ist relevant?

4. TIPP STATT LÖSUNG: Gib einen hilfreichen Tipp, ohne die vollständige Lösung zu verraten. Ermutige den Schüler, es nochmal zu versuchen.

5. MOTIVIEREND: Nutze ermutigende Sprache und erkenne gute Ansätze an.

ANTWORTFORMAT:
- Beginne mit einer klaren Aussage (Richtig/Falsch)
- Folge mit Begründung und Tipp
- Halte dich kurz (2-4 Sätze)

Du schreibst Deutsch auf Niveau der Jahrgangsstufe ${jahrgangsstufe}.`;
    }

    return Response.json({
      success: true,
      tutorPrompt: tutorPrompt.trim(),
    });
  } catch (error) {
    console.error('Error in generateTutorPromptWithHorizont:', error);
    return Response.json(
      { error: error.message || 'Fehler bei der Generierung' },
      { status: 500 }
    );
  }
});