import { base44 } from '@/api/base44Client';
import { kontextText, signiereMaterial } from '@/lib/stundenKontext';

const PHASE = {
  type: 'object',
  properties: {
    phase: { type: 'string' }, minuten: { type: 'number' }, methode: { type: 'string' },
    umsetzung: { type: 'string' }, aktivitaet: { type: 'string' }, ablauf: { type: 'string' }, begruendung: { type: 'string' },
  },
};
const SCHEMA = {
  type: 'object',
  properties: {
    phasen: { type: 'array', items: PHASE },
    materialien: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, herkunft: { type: 'string', enum: ['lehrkraft', 'internet'] }, phase: { type: 'string' } } },
    },
  },
};

const OPTIONEN = { D: ['digital'], 'D(A)': ['digital', 'analog'], 'A(D)': ['analog', 'digital'], F: ['analog mit digitaler Unterstützung'], A: ['analog'] };

const ladeMethoden = () => base44.entities.MethodenKatalog.filter({ ist_aktiv: true }, 'reihenfolge', 200);

const katalogText = (methoden) => methoden.map((m) =>
  `- ${m.name} [${m.modus}; ${(m.phasen || []).join('/')}; ${(m.sozialformen || []).join('/')}; ${m.dauer_min || '?'}–${m.dauer_max || '?'} Min.]: ${m.kurzbeschreibung || ''}`).join('\n');

/** Umsetzungsmöglichkeiten aus dem Modus der Katalog-Methode ableiten. */
function anreichern(p, methoden) {
  const m = methoden.find((x) => x.name.toLowerCase() === (p.methode || '').toLowerCase());
  const optionen = m ? OPTIONEN[m.modus] : [p.umsetzung || 'analog'];
  return { ...p, optionen, umsetzung: optionen.includes(p.umsetzung) ? p.umsetzung : optionen[0], hinweise: p.hinweise || [] };
}

const REGELN = `Regeln je Phase:
- methode: GENAU der Name einer Methode aus dem Katalog unten.
- umsetzung: 'digital' oder 'analog' (bei Modus F: 'analog mit digitaler Unterstützung').
- aktivitaet: was die Schüler konkret bearbeiten (z. B. "Bild mit Impulsfrage", "Offene Aufgabe (interaktive Konstruktion)").
- ablauf: 1–2 Sätze, wir-Form, wie die Phase konkret läuft. begruendung: 1 Satz, warum diese Methode hier passt.
- phase und minuten übernimmst du aus dem Grobentwurf.`;

/** Komplette Feinplanung aus dem Grobentwurf. */
export async function erstelleFeinplanung({ ctx, entwurf, internet }) {
  const [methoden, file_urls] = await Promise.all([ladeMethoden(), signiereMaterial(ctx.rahmen.materialien)]);
  const prompt = `Du bist erfahrene Fachdidaktikerin und machst aus einem Grobentwurf eine Feinplanung.
${kontextText(ctx)}
Grobentwurf:
${JSON.stringify(entwurf.phasen)}

${REGELN}
materialien: alle Materialien, die sicher verwendet werden – das von der Lehrkraft angehängte Material (herkunft 'lehrkraft', mit Dateiname: ${(ctx.rahmen.materialien || []).map((m) => m.name).join(', ') || 'keines'})${internet ? ' und konkret im Internet gefundenes Material (herkunft "internet", mit Quelle im Namen)' : ''}, jeweils mit der Phase.
${internet ? 'Recherchiere im Internet nach passenden Materialien und Aufgabenideen.' : ''}

Methodenkatalog:
${katalogText(methoden)}`;
  const res = await base44.integrations.Core.InvokeLLM({
    prompt, response_json_schema: SCHEMA, file_urls: file_urls.length ? file_urls : undefined,
    ...(internet ? { add_context_from_internet: true, model: 'gemini_3_flash' } : {}),
  });
  return { phasen: (res.phasen || []).map((p) => anreichern(p, methoden)), materialien: res.materialien || [] };
}

/** Eine einzelne Phase nach dem Wunsch der Lehrkraft neu planen. */
export async function planePhaseNeu({ ctx, plan, index, wunsch }) {
  const methoden = await ladeMethoden();
  const alt = plan.phasen[index];
  const prompt = `Du bist erfahrene Fachdidaktikerin. Plane EINE Phase einer Unterrichtsstunde neu.
${kontextText(ctx)}
Gesamte Feinplanung: ${JSON.stringify(plan.phasen.map(({ optionen, ...p }) => p))}
Neu zu planen: Phase ${index + 1} (${alt.phase}, ${alt.minuten} Min.) – bisher: ${JSON.stringify(alt)}
Wunsch der Lehrkraft: ${wunsch}
Bisherige Hinweise der Lehrkraft zu dieser Phase: ${(alt.hinweise || []).join(' | ') || '-'}

${REGELN}

Methodenkatalog:
${katalogText(methoden)}`;
  const neu = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: PHASE });
  return anreichern({ ...neu, hinweise: alt.hinweise }, methoden);
}