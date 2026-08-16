import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Regieblatt-Assistent (MUG, 2026-08-16)
 * ──────────────────────────────────────
 * Die Lehrkraft beschreibt in EINEM Satz, was am bestehenden Stunden-Regieblatt
 * geändert werden soll ("füge zwischen Phase 3 und 4 eine digitale Aufgabe ein",
 * "tausche Phase 2 und 3", "mach aus Phase 5 eine analoge Sicherung").
 * Die KI liefert die KOMPLETTE neue Phasenfolge zurück; diese Funktion wendet
 * sie an: bestehende Phasen werden aktualisiert/umsortiert, neue angelegt,
 * entfernte gelöscht. Bereits gepflegte Inhalte (Material, Aktivität,
 * Brian-Felder) bleiben erhalten, weil nur die gelieferten Textfelder
 * überschrieben werden.
 *
 * payload: { stunde_id, anweisung }
 * returns: { antwort, zusammenfassung: { neu, geaendert, gelöscht } }
 */
const STANDARD_ANWEISUNG = {
  analog_input: 'Achtung: Du erhältst jetzt Informationen von deiner Lehrkraft. Hör gut zu und sei aufmerksam.',
  digital_input: 'Schau dir jetzt den folgenden Input in Ruhe an und mach dir Notizen.',
  analog_aufgabe: 'Du erhältst jetzt eine Aufgabe von deiner Lehrkraft. Was du zu tun hast, erklärt sie dir – bitte bearbeite die Aufgabe.',
  digital_aufgabe: 'Bearbeite jetzt die folgende Aufgabe. Los geht\u2019s!',
  analog_sicherung: 'Deine Lehrkraft fasst jetzt die wesentlichen Aspekte zusammen. Hör gut zu und ergänze deine Notizen.',
  digital_sicherung: 'Sichere jetzt dein Ergebnis mit der folgenden Aufgabe.',
};

function neuerCode(belegt) {
  let code = '';
  do {
    code = String(Math.floor(100 + Math.random() * 900));
  } while (belegt.has(code));
  belegt.add(code);
  return code;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stunde_id, anweisung } = await req.json().catch(() => ({}));
    if (!stunde_id || !anweisung?.trim()) {
      return Response.json({ error: 'stunde_id und anweisung sind erforderlich.' }, { status: 400 });
    }

    const stunde = await base44.asServiceRole.entities.Unterrichtsstunde.get(stunde_id);
    if (!stunde) return Response.json({ error: 'Unterrichtsstunde nicht gefunden.' }, { status: 404 });

    const phasen = await base44.asServiceRole.entities.StundenSequenz.filter(
      { stunde_id },
      'reihenfolge',
      100,
    );

    const katalog = (await base44.asServiceRole.entities.AktivitaetenKatalog
      .filter({ is_active: true }, 'name', 200)
      .catch(() => []))
      .map((k) => `- ${k.name}`)
      .join('\n');

    const bestand = phasen
      .map((p, i) => `${i + 1}. [id: ${p.id}] "${p.phasenname || '(ohne Namen)'}" | typ: ${p.typ} | ${p.dauer_minuten || '?'} Min | Ablauf: ${(p.lehrer_hinweis || '').slice(0, 300)} | Methode: ${p.methode_sozialform || '-'} | Material: ${p.material_hinweis || '-'}`)
      .join('\n');

    const prompt = `Du bist didaktischer Assistent und passt das bestehende Stunden-Regieblatt EINER Unterrichtsstunde an.

Rahmen: Fach ${stunde.fach || 'unbekannt'}, Jahrgangsstufe ${stunde.jahrgangsstufe || 'unbekannt'}, Titel "${stunde.arbeitstitel || ''}".

Bestehende Phasen in dieser Reihenfolge:
${bestand || '(noch keine Phasen)'}

Änderungswunsch der Lehrkraft:
"""
${anweisung.trim()}
"""

Gib die KOMPLETTE neue Phasenfolge zurück (Feld "phasen", in der gewünschten Reihenfolge):
- Bestehende Phasen, die bleiben: übernimm sie MIT ihrer "id" und ihren bisherigen Inhalten unverändert, sofern der Wunsch sie nicht betrifft.
- Neue Phasen: OHNE "id", vollständig ausgearbeitet (phasenname, typ, dauer_minuten, lehrer_hinweis mit 2-4 Sätzen konkretem Ablauf, methode_sozialform, material_hinweis).
- Phasen, die entfernt werden sollen: einfach weglassen. Lass niemals eine Phase weg, die die Lehrkraft nicht entfernen wollte.
- typ (genau einer): "analog_input", "digital_input", "analog_aufgabe", "digital_aufgabe", "brian_aufgabe" (offene Aufgabe im Dialog mit dem KI-Tutor), "analog_sicherung", "digital_sicherung".
- Bei NEUEN "digital_*"-Phasen darfst du zusätzlich ki_aktivitaet setzen: der EXAKTE Name einer passenden Aufgabenart aus dieser Liste (sonst leerer String):
${katalog || '- (keine Aufgabenarten verfügbar)'}

Antworte außerdem im Feld "antwort" in maximal 3 Sätzen auf Deutsch, was du geändert hast.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          antwort: { type: 'string' },
          phasen: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                phasenname: { type: 'string' },
                typ: {
                  type: 'string',
                  enum: [
                    'analog_input',
                    'digital_input',
                    'analog_aufgabe',
                    'digital_aufgabe',
                    'brian_aufgabe',
                    'analog_sicherung',
                    'digital_sicherung',
                  ],
                },
                dauer_minuten: { type: 'number' },
                lehrer_hinweis: { type: 'string' },
                methode_sozialform: { type: 'string' },
                material_hinweis: { type: 'string' },
                ki_aktivitaet: { type: 'string' },
              },
              required: ['phasenname'],
            },
          },
        },
        required: ['antwort', 'phasen'],
      },
    });

    const neueFolge = Array.isArray(result?.phasen) ? result.phasen : [];
    if (neueFolge.length === 0) {
      return Response.json({ antwort: result?.antwort || 'Ich konnte den Wunsch nicht umsetzen.', zusammenfassung: { neu: 0, geaendert: 0, geloescht: 0 } });
    }

    const belegteCodes = new Set(phasen.map((p) => p.freischalt_code).filter(Boolean));
    const vorhanden = new Map(phasen.map((p) => [p.id, p]));
    const behaltenIds = new Set();
    let neu = 0;
    let geaendert = 0;

    for (let i = 0; i < neueFolge.length; i++) {
      const eintrag = neueFolge[i];
      const alt = eintrag.id ? vorhanden.get(eintrag.id) : null;

      if (alt) {
        behaltenIds.add(alt.id);
        const patch = { reihenfolge: i };
        if (eintrag.phasenname) patch.phasenname = eintrag.phasenname;
        if (eintrag.typ) patch.typ = eintrag.typ;
        if (typeof eintrag.dauer_minuten === 'number') patch.dauer_minuten = eintrag.dauer_minuten;
        if (eintrag.lehrer_hinweis) patch.lehrer_hinweis = eintrag.lehrer_hinweis;
        if (eintrag.methode_sozialform) patch.methode_sozialform = eintrag.methode_sozialform;
        if (eintrag.material_hinweis) patch.material_hinweis = eintrag.material_hinweis;
        await base44.asServiceRole.entities.StundenSequenz.update(alt.id, patch);
        geaendert++;
        continue;
      }

      const typ = eintrag.typ || 'analog_input';
      await base44.asServiceRole.entities.StundenSequenz.create({
        stunde_id,
        reihenfolge: i,
        phasenname: eintrag.phasenname || `Phase ${i + 1}`,
        typ,
        dauer_minuten: typeof eintrag.dauer_minuten === 'number' ? eintrag.dauer_minuten : undefined,
        lehrer_hinweis: eintrag.lehrer_hinweis || '',
        methode_sozialform: eintrag.methode_sozialform || '',
        material_hinweis: eintrag.material_hinweis || '',
        schueler_anweisung: STANDARD_ANWEISUNG[typ] || '',
        freischalt_code: neuerCode(belegteCodes),
        is_complete: false,
      });
      neu++;
    }

    const zuLoeschen = phasen.filter((p) => !behaltenIds.has(p.id));
    for (const p of zuLoeschen) {
      await base44.asServiceRole.entities.StundenSequenz.delete(p.id);
    }

    return Response.json({
      antwort: result?.antwort || '',
      zusammenfassung: { neu, geaendert, geloescht: zuLoeschen.length },
    });
  } catch (error) {
    console.error('[regieblattAssistent] Error:', error);
    return Response.json({ error: error.message || 'Interner Fehler' }, { status: 500 });
  }
}