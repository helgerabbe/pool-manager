/**
 * unterrichtInhalteRecherche — Schritt 1 der Unterrichtsplanung.
 * Recherche (gemeinsamer Kern) + Material der Lehrkraft → kurze Liste
 * möglicher Unterrichtsinhalte. Kein Pamphlet: je Inhalt ein Satz Beschreibung
 * und ein Satz Begründung. Payload: { planung_id }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { unwrapLLM } from '../../shared/llmUtils.js';
import { recherchiereFundament } from '../../shared/didaktikRecherche.js';
import { ladePlanung, materialUrls } from '../../shared/unterrichtsPlanung.js';

const INHALTE_SCHEMA = {
  type: 'object',
  properties: {
    inhalte: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          beschreibung: { type: 'string' },
          begruendung: { type: 'string' },
          empfohlen: { type: 'boolean' },
          minuten: { type: 'number' },
          kc: { type: 'boolean' },
          kc_bezug: { type: 'string' },
        },
        required: ['titel', 'beschreibung'],
      },
    },
  },
  required: ['inhalte'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { planung, ue, fehler } = await ladePlanung(base44, user, body?.planung_id);
    if (fehler) return fehler;
    const thema = planung.thema || ue?.titel;
    if (!thema || !ue) return Response.json({ error: 'Thema fehlt.' }, { status: 400 });

    const fundament = await recherchiereFundament(base44, {
      fach: ue.fach,
      jahrgangsstufe: ue.jahrgangsstufe,
      thema,
      vorgaben: planung.vorgaben,
      zweck: 'für den lehrergesteuerten Klassenunterricht',
    });
    if (!fundament) {
      return Response.json({ error: 'Die Recherche hat kein verwertbares Ergebnis geliefert. Bitte erneut versuchen.' }, { status: 502 });
    }

    const dateien = await materialUrls(base44, planung);
    const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: JSON.stringify({
        rolle: 'Du bist Fachdidaktik-Expertin und hilfst einer Lehrkraft, eine Unterrichtseinheit zu planen. Antworte nur mit JSON nach Schema, auf Deutsch.',
        kontext: { fach: ue.fach, jahrgangsstufe: ue.jahrgangsstufe, thema, wuensche: planung.vorgaben || '', recherche: fundament },
        auftrag: 'Erstelle die Liste MÖGLICHER Unterrichtsinhalte dieser Einheit. Die Lehrkraft wählt danach selbst aus.',
        regeln: [
          '8–16 Inhalte, in sinnvoller didaktischer Reihenfolge (nach den recherchierten Zugängen).',
          'titel: kurz und konkret (z. B. "Groß- und Kleinschreibung von Nomen").',
          'beschreibung: EIN Satz, was die Schüler hier lernen.',
          'begruendung: EIN Satz, warum der Inhalt dazugehört (Kerncurriculum, Stolperstein, Voraussetzung …).',
          'empfohlen: true für den Kern, den das Kerncurriculum verlangt oder ohne den die Einheit nicht trägt; false für Vertiefungen und Ergänzungen.',
          'kc: true NUR, wenn das Kerncurriculum Niedersachsen (Fach, Jahrgang/Doppeljahrgang) diesen Inhalt bzw. diese Kompetenz verbindlich vorgibt. Sonst false.',
          'kc_bezug: bei kc=true kurz die KC-Vorgabe (Kompetenzbereich + erwartete Kompetenz in wenigen Worten); sonst leer.',
          'Alle verbindlichen KC-Vorgaben zum Thema müssen als eigene Inhalte mit kc=true in der Liste stehen.',
          'minuten: grob geschätzter Unterrichtszeitbedarf (Vielfache von 20).',
          'Liegen Materialien der Lehrkraft bei (Buchseiten, Arbeitsblätter, Folien), richte Inhalte und Begriffe daran aus.',
        ],
      }),
      model: 'claude-sonnet-5',
      ...(dateien.length ? { file_urls: dateien } : {}),
      response_json_schema: INHALTE_SCHEMA,
    });
    const liste = unwrapLLM(antwort)?.inhalte || [];
    if (!liste.length) return Response.json({ error: 'Die Inhaltsliste war leer. Bitte erneut versuchen.' }, { status: 502 });

    const inhalte = liste.map((i) => ({
      id: crypto.randomUUID(),
      titel: String(i.titel || ''),
      beschreibung: String(i.beschreibung || ''),
      begruendung: String(i.begruendung || ''),
      empfohlen: !!i.empfohlen,
      minuten: Number(i.minuten) || 0,
      kc: !!i.kc,
      kc_bezug: String(i.kc_bezug || ''),
      prioritaet: i.empfohlen || i.kc ? 'muss' : 'vielleicht',
    }));

    const aktualisiert = await base44.asServiceRole.entities.UnterrichtsPlanung.update(planung.id, {
      thema, fundament, inhalte, verlauf: [], gespraech: [],
    });
    return Response.json({ planung: aktualisiert });
  } catch (error) {
    console.error('[unterrichtInhalteRecherche]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}