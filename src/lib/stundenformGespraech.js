// Anschluss des Planungsgesprächs an Stundenform + Informationsprofile (2026-11-04).
import { base44 } from '@/api/base44Client';
import { BASIS, INFORMATIONS_PROFILE, STUFEN } from '@/lib/informationsProfile';

export const STATUS_NAME = { herausgehoert: 'herausgehört', empfohlen: 'empfohlen', vorlaeufig: 'vorläufig', festgelegt: 'festgelegt' };

export const STUNDENFORM_SCHEMA = {
  type: 'object',
  properties: {
    form: { type: 'string', enum: Object.keys(INFORMATIONS_PROFILE) },
    variante: { type: 'string' },
    status: { type: 'string', enum: ['herausgehoert', 'empfohlen'] },
    alternativen: { type: 'array', items: { type: 'string' } },
    begruendung: { type: 'string' },
    absicht: { type: 'string' },
  },
};

const liste = (l) => l.map((i) => `${i.feld} (${i.frage})`).join('; ');

/** Profiltext für den Prompt. */
export function profileText(stundenform) {
  const formen = Object.entries(INFORMATIONS_PROFILE).map(([key, p]) => [
    `## ${p.name} (form "${key}")`,
    ...['mindest', 'gut', 'vertieft'].map((s) => `${STUFEN[s]}: ${liste(p[s])}`),
    `Varianten erkennen: ${Object.entries(p.erkennen).map(([v, t]) => `"${v}" = ${t}`).join(' | ')}`,
    `Gehört NICHT ins Gespräch, kommt später: ${p.spaeter.join(', ')}`,
  ].join('\n'));
  const sf = stundenform?.form
    ? `AKTUELLE STUNDENFORM: ${stundenform.form}${stundenform.variante ? ` / ${stundenform.variante}` : ''}, Status ${STATUS_NAME[stundenform.status] || stundenform.status}.${stundenform.status === 'festgelegt' ? ' Von der Lehrkraft festgelegt: NICHT mehr ändern oder infrage stellen.' : stundenform.status === 'vorlaeufig' ? ' Die Lehrkraft plant vorläufig damit weiter: nur bei klarem Widerspruch neu empfehlen.' : ''}`
    : 'AKTUELLE STUNDENFORM: noch nicht erkannt.';
  return `INFORMATIONSPROFILE (was du je Stundenform wissen musst)
Für alle Formen: ${['mindest', 'gut', 'vertieft'].map((s) => `${STUFEN[s]}: ${liste(BASIS[s])}`).join(' / ')}
${formen.join('\n')}
${sf}
REGELN ZUR STUNDENFORM:
- Höre aus Ziel, Stundentyp und Gespräch heraus, welche Form und Variante gemeint ist. Schicke "stundenform" mit, sobald du eine Arbeitsannahme hast oder sie sich ändert (status "herausgehoert"); hast du genug für eine begründete Empfehlung, status "empfohlen" mit "begruendung" und ggf. 1–2 "alternativen".
- Frage NUR nach Informationen, die für die Mindest- bzw. gute Grundlage der Form fehlen und nicht schon im Kontext stehen. Höchstens eine Frage auf einmal, nie Fragebogen.
- Halte in "absicht" fest, was die Lehrkraft mit der Stunde vor allem will, in ihren Worten.
- Die Kernschritte folgen der Phasenfolge der Variante.`;
}

/** Stundenform an der Stunde speichern (Status der Lehrkraft bleibt erhalten, außer sie wird bewusst gesetzt). */
export async function stundenformSpeichern(stundeId, alt, neu) {
  const behalten = ['vorlaeufig', 'festgelegt'].includes(alt?.status) && !['vorlaeufig', 'festgelegt'].includes(neu.status)
    && alt.form === neu.form && alt.variante === neu.variante;
  const sf = { ...alt, ...neu, ...(behalten ? { status: alt.status } : {}), geaendert_am: new Date().toISOString() };
  if (stundeId) await base44.entities.Unterrichtsstunde.update(stundeId, { stundenform: sf });
  return sf;
}