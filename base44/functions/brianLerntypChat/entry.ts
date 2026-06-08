import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * brianLerntypChat
 *
 * Simuliert das Gespräch mit dem KI-Lernbegleiter „Brian", in dem der Schüler
 * Unterstützung bei der Lerntyp-Wahl bekommt. Bekommt den bisherigen
 * Gesprächsverlauf + optional den von der Lehrkraft hinterlegten Leitfaden
 * (onboarding_konfiguration.lerntyp_diagnose) und antwortet als Brian.
 *
 * Eingabe:
 *   - einheitId
 *   - verlauf: [{ rolle: 'user'|'assistant', text }]
 *   - leitfaden: optionale Leitfragen-Struktur aus dem Snapshot
 *
 * Ausgabe: { antwort }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, verlauf = [], leitfaden = null } = await req.json();

    let titel = '';
    let fach = '';
    if (einheitId) {
      const liste = await base44.entities.Einheiten.filter({ id: einheitId });
      const e = Array.isArray(liste) ? liste[0] : null;
      titel = e?.titel_der_einheit || '';
      fach = e?.fach || '';
    }

    const leitfragen = Array.isArray(leitfaden?.gespraechs_leitfaden)
      ? leitfaden.gespraechs_leitfaden.map((g, i) => `${i + 1}. ${g.frage} (Ziel: ${g.ziel})`).join('\n')
      : '';

    const verlaufText = (Array.isArray(verlauf) ? verlauf : [])
      .map((m) => `${m.rolle === 'user' ? 'Schüler' : 'Brian'}: ${m.text}`)
      .join('\n');

    const prompt = `Du bist Brian, ein warmherziger, geduldiger KI-Lernbegleiter. Du hilfst einem Schüler herauszufinden, welcher LERNTYP für die Einheit "${titel}" (Fach: ${fach}) zu ihm passt.

Die vier Lerntypen: Minimalist (kompakt, schnell), Pragmatiker (effizient, ausgewogen), Ehrgeizig (vertiefen, mehr üben), Passioniert (mit Begeisterung in die Tiefe).

${leitfragen ? `Orientiere dich locker an diesen Leitfragen (eine nach der anderen, nicht alle auf einmal):\n${leitfragen}\n` : ''}
REGELN:
- Sehr schülergerecht, freundlich, kurz (max. 2–3 Sätze pro Antwort). Direkte Ansprache ("du").
- Stelle IMMER nur EINE Frage auf einmal und reagiere zuerst kurz auf die letzte Antwort des Schülers.
- Sprich noch KEINE finale Empfehlung aus – das passiert separat am Ende. Sammle nur freundlich Hinweise.
- Wenn der Schüler nichts mehr sagen mag, bestätige ermutigend.

BISHERIGES GESPRÄCH:
${verlaufText || '(Das Gespräch beginnt gerade. Begrüße den Schüler herzlich und stelle deine erste Frage.)'}

Antworte jetzt als Brian (nur deine nächste Gesprächsnachricht, ohne Namenspräfix):`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });

    const antwort = typeof result === 'string' ? result : (result?.text || result?.antwort || String(result));

    return Response.json({ antwort });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});