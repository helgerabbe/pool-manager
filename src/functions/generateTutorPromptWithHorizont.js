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

    // Lade die Aufgabe mit allen Details
    const aufgabe = await base44.entities.AllgemeineAufgabe.filter({ id: aufgabeId });
    if (!aufgabe || aufgabe.length === 0) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    const task = aufgabe[0];

    // Lade alle Lernziele der Einheit
    const themenfelder = await base44.entities.Themenfeld.filter({ einheit_id: task.einheit_id });
    const lernpakete = await base44.entities.Lernpakete.filter({ einheit_id: task.einheit_id });
    
    const lernziele = [];
    for (const lp of lernpakete) {
      const lz = await base44.entities.Lernziele.filter({ lernpaket_id: lp.id });
      lernziele.push(...lz);
    }

    // Lernlandkarte-Zusammenfassung
    const lernzieleText = lernziele
      .map(lz => `- ${lz.formulierung_fachsprache || lz.schueler_uebersetzung}`)
      .join('\n');

    // Baue den Tutor-Prompt zusammen
    const tutorPrompt = `Du bist ein geduldiger, erfahrener KI-Lernbegleiter (Tutor) für Schüler beim Lösen einer Projektaufgabe.

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
   - Verweise auf relevant Lernziele
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

Du schreibst Deutsch, verwendest kurze, verständliche Sätze, und passt dein Tempo dem Schüler an.`;

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