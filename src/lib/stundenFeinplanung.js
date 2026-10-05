import { base44 } from '@/api/base44Client';
import { kontextText, signiereMaterial } from '@/lib/stundenKontext';
import { kiAnfrage } from '@/lib/kiAnfrage';

const PHASE = {
  type: 'object',
  properties: {
    phase: { type: 'string' }, minuten: { type: 'number' }, methode: { type: 'string' },
    umsetzung: { type: 'string' }, aktivitaet: { type: 'string' }, katalog_aktivitaet: { type: 'string' }, ablauf: { type: 'string' }, begruendung: { type: 'string' },
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

const OPTIONEN = { D: ['digital'], 'D(A)': ['digital', 'analog'], 'A(D)': ['analog', 'digital'], 'A(+D)': ['analog mit digitaler Unterstützung'], A: ['analog'] };

const ladeKataloge = () => Promise.all([
  base44.entities.MethodenKatalog.filter({ ist_aktiv: true }, 'reihenfolge', 200),
  base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'name', 200),
]);

const katalogText = (methoden) => methoden.map((m) =>
  `- ${m.name} [${m.modus}; ${(m.phasen || []).join('/')}; ${(m.sozialformen || []).join('/')}; ${m.dauer_min || '?'}–${m.dauer_max || '?'} Min.]: ${m.kurzbeschreibung || ''}${m.poolzeit_aktivitaeten?.length ? ` · digitale Bausteine: ${m.poolzeit_aktivitaeten.join(', ')}` : ''}`).join('\n');

const aktivitaetenText = (akt) => akt.map((a) => `- ${a.name} (${a.phase}): ${(a.beschreibung || '').slice(0, 140)}`).join('\n');

const gleich = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

/** Umsetzung aus dem Methoden-Modus, digitale Bausteine aus dem Aktivitätenkatalog ableiten. */
function anreichern(p, methoden, akt) {
  const m = methoden.find((x) => gleich(x.name, p.methode));
  const optionen = m ? OPTIONEN[m.modus] : [p.umsetzung || 'analog'];
  const passend = akt.filter((a) => (m?.poolzeit_aktivitaeten || []).some((n) => gleich(n, a.name)));
  const auswahl = (passend.length ? passend : akt).map((a) => ({ id: a.id, name: a.name }));
  const treffer = akt.find((a) => gleich(a.name, p.katalog_aktivitaet)) || akt.find((a) => a.id === p.aktivitaet_id) || passend[0];
  return {
    ...p, optionen, umsetzung: optionen.includes(p.umsetzung) ? p.umsetzung : optionen[0], hinweise: p.hinweise || [],
    katalog_auswahl: auswahl, aktivitaet_id: treffer?.id || '',
  };
}

const REGELN = `Regeln je Phase:
- methode: GENAU der Name einer Methode aus dem Katalog unten.
- umsetzung: 'digital' oder 'analog' (bei Modus F: 'analog mit digitaler Unterstützung').
- aktivitaet: was die Schüler konkret bearbeiten (z. B. "Bild mit Impulsfrage", "Offene Aufgabe (interaktive Konstruktion)").
- katalog_aktivitaet: nur bei digitaler Umsetzung GENAU der Name eines Bausteins aus dem Aktivitätenkatalog unten (bevorzugt einer der bei der Methode genannten digitalen Bausteine), sonst leer.
- ablauf: 1–2 Sätze, wir-Form, wie die Phase konkret läuft. begruendung: 1 Satz, warum diese Methode hier passt.
- phase und minuten übernimmst du aus dem Grobentwurf.`;

/** Komplette Feinplanung aus dem Grobentwurf. */
export async function erstelleFeinplanung({ ctx, entwurf, internet }) {
  const [[methoden, akt], file_urls] = await Promise.all([ladeKataloge(), signiereMaterial(ctx.rahmen.materialien)]);
  const prompt = `Du bist erfahrene Fachdidaktikerin und machst aus einem Grobentwurf eine Feinplanung.
${kontextText(ctx)}
Grobentwurf:
${JSON.stringify(entwurf.phasen)}

${REGELN}
materialien: alle Materialien, die sicher verwendet werden – das von der Lehrkraft angehängte Material (herkunft 'lehrkraft', mit Dateiname: ${(ctx.rahmen.materialien || []).map((m) => m.name).join(', ') || 'keines'})${internet ? ' und konkret im Internet gefundenes Material (herkunft "internet", mit Quelle im Namen)' : ''}, jeweils mit der Phase.
${internet ? 'Recherchiere im Internet nach passenden Materialien und Aufgabenideen.' : ''}

Methodenkatalog:
${katalogText(methoden)}

Aktivitätenkatalog (digitale Bausteine):
${aktivitaetenText(akt)}`;
  const res = await kiAnfrage({
    prompt, response_json_schema: SCHEMA, file_urls: file_urls.length ? file_urls : undefined,
    ...(internet ? { add_context_from_internet: true, model: 'gemini_3_flash' } : {}),
  });
  return { phasen: (res.phasen || []).map((p) => anreichern(p, methoden, akt)), materialien: mitDateien(res.materialien || [], ctx.rahmen.materialien || []) };
}

/** Hochgeladene Dateien der Lehrkraft an die Materialliste hängen (fehlende ergänzen). */
function mitDateien(liste, uploads) {
  const ergebnis = liste.map((m) => ({ ...m, file_uri: uploads.find((u) => gleich(u.name, m.name))?.file_uri }));
  uploads.filter((u) => !ergebnis.some((m) => m.file_uri === u.file_uri))
    .forEach((u) => ergebnis.push({ name: u.name, herkunft: 'lehrkraft', phase: '', file_uri: u.file_uri }));
  return ergebnis;
}

/** Eine einzelne Phase nach dem Wunsch der Lehrkraft neu planen. */
export async function planePhaseNeu({ ctx, plan, index, wunsch }) {
  const [methoden, akt] = await ladeKataloge();
  const alt = plan.phasen[index];
  const prompt = `Du bist erfahrene Fachdidaktikerin. Plane EINE Phase einer Unterrichtsstunde neu.
${kontextText(ctx)}
Gesamte Feinplanung: ${JSON.stringify(plan.phasen.map(({ optionen, katalog_auswahl, ...p }) => p))}
Neu zu planen: Phase ${index + 1} (${alt.phase}, ${alt.minuten} Min.) – bisher: ${JSON.stringify(alt)}
Wunsch der Lehrkraft: ${wunsch}
Bisherige Hinweise der Lehrkraft zu dieser Phase: ${(alt.hinweise || []).join(' | ') || '-'}

${REGELN}

Methodenkatalog:
${katalogText(methoden)}

Aktivitätenkatalog (digitale Bausteine):
${aktivitaetenText(akt)}`;
  const neu = await kiAnfrage({ prompt, response_json_schema: PHASE });
  return anreichern({ ...neu, hinweise: alt.hinweise }, methoden, akt);
}