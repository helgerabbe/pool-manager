// Feinplanung (2026-10-19): Je Phase entscheiden, ob analog, digital oder gemischt umgesetzt wird.
import { kiAufruf } from '@/lib/kiStundenVorbereitung';

export const UMSETZUNGEN = [
  { key: 'analog', name: 'Analog' },
  { key: 'digital', name: 'Digital' },
  { key: 'gemischt', name: 'Gemischt' },
];

/** Vorschlag je Phase mit kurzer Begründung. */
export async function kiUmsetzungVorschlag({ assistent, einheit, entwurf }) {
  const r = await kiAufruf(assistent, `Du bist erfahrener Fachdidaktiker. Entscheide für jede Phase dieser Stunde (${einheit?.fach}, Jg. ${einheit?.jahrgangsstufe}), ob sie besser analog (Papier, Tafel, Gespräch), digital (Tablet, z. B. über Moodle oder interaktive Aufgaben) oder gemischt umgesetzt wird. Digital nur, wenn es echten Mehrwert bringt (z. B. sofortige Rückmeldung, Differenzierung, Ergebnisse sammeln).
Phasen: ${JSON.stringify(entwurf.phasen.map(({ name, schueler, sozialform, methode }) => ({ name, schueler, sozialform, methode })))}
Gib "phasen" in derselben Reihenfolge zurück, je mit "umsetzung" (analog|digital|gemischt) und "begruendung" (ein kurzer Satz, Du-Form).`, {
    type: 'object',
    properties: { phasen: { type: 'array', items: { type: 'object', properties: { umsetzung: { type: 'string', enum: UMSETZUNGEN.map((u) => u.key) }, begruendung: { type: 'string' } } } } },
    required: ['phasen'],
  });
  return r.phasen || [];
}