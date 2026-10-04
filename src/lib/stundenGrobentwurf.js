import { kiAnfrage } from '@/lib/kiAnfrage';
import { kontextText, signiereMaterial, zielMinuten } from '@/lib/stundenKontext';

const SCHEMA = {
  type: 'object',
  properties: {
    modell: {
      type: 'object',
      properties: { name: { type: 'string' }, erklaerung: { type: 'string' }, schritte: { type: 'array', items: { type: 'string' } } },
    },
    phasen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titel: { type: 'string' }, minuten: { type: 'number' }, sozialform: { type: 'string' },
          art: { type: 'string' }, idee: { type: 'string' }, analyse: { type: 'string' },
        },
      },
    },
  },
};

/** Grobentwurf einer Stunde erzeugen bzw. nach Wunsch überarbeiten. */
export async function erstelleGrobentwurf({ ctx, pruefung, wahl, bisher, wunsch, internet }) {
  const file_urls = await signiereMaterial(ctx.rahmen.materialien);
  const entscheidungen = (pruefung?.entscheidungen || []).map((e, i) => `- ${e.frage} → ${wahl[i]}`).filter(() => pruefung?.ampel !== 'passt').join('\n');
  const prompt = `Du bist erfahrene Fachdidaktikerin und entwirfst den groben Ablauf einer Unterrichtsstunde.
${kontextText(ctx)}
${entscheidungen ? `Entscheidungen der Lehrkraft nach der Prüfung:\n${entscheidungen}` : ''}
${bisher ? `Bisheriger Entwurf:\n${JSON.stringify(bisher)}\nÜberarbeite ihn nach diesem Wunsch der Lehrkraft: ${wunsch || '-'}` : ''}
${internet ? 'Recherchiere im Internet nach bewährten Ideen und Materialien zu diesem Thema und baue die besten ein.' : ''}

Regeln:
- Die Minuten aller Phasen ergeben zusammen genau ${zielMinuten(ctx.rahmen, ctx.abschnitt)}.
- modell: Name des didaktischen Modells (z. B. "Erarbeitungsstunde mit induktivem Aufbau"), 2 Sätze Erklärung, die typischen Schritte dieses Modells.
- Je Phase: titel im Format "Phase: Kurztitel", sozialform (Plenum, Einzelarbeit, Partnerarbeit, Gruppenarbeit), art (z. B. Lehrkraft-Impuls, Digitale Entdeckung, Gemeinsame Sicherung, Digitale Übung), idee (1–2 Sätze, was passiert), analyse (didaktische Begründung: gedankliche Operation, Bedeutsamkeit, Methodenwahl).
- Deutsch, konkret, fachlich korrekt, schülerorientiert.`;
  return kiAnfrage({
    prompt,
    response_json_schema: SCHEMA,
    file_urls: file_urls.length ? file_urls : undefined,
    ...(internet ? { add_context_from_internet: true, model: 'gemini_3_flash' } : {}),
  });
}