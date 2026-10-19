// Aufbereitung (2026-10-19): je Phase Impuls, Arbeitsauftrag und Material, passend zur gewählten Umsetzung.
import { kiAufruf } from '@/lib/kiStundenVorbereitung';

export const AUFBEREITUNG_FELDER = [
  { key: 'impuls', titel: 'Impuls der Lehrkraft' },
  { key: 'arbeitsauftrag', titel: 'Arbeitsauftrag für die Schüler' },
  { key: 'material', titel: 'Material' },
];

export async function kiAufbereitung({ assistent, einheit, anker, entwurf }) {
  const r = await kiAufruf(assistent, `Du bist erfahrener Fachdidaktiker und bereitest eine fertig geplante Stunde für den Unterricht auf (${einheit?.fach}, Jg. ${einheit?.jahrgangsstufe}, Einheit "${einheit?.titel}").
${anker?.thema ? `Thema: ${anker.thema}` : ''}${anker?.inhalt ? `\nKonkreter Inhalt: ${anker.inhalt}` : ''}
Phasen: ${JSON.stringify(entwurf.phasen.map(({ name, minuten, lehrer, schueler, sozialform, methode, umsetzung }) => ({ name, minuten, lehrer, schueler, sozialform, methode, umsetzung })))}

Gib "phasen" in derselben Reihenfolge zurück, je mit:
- "impuls": was die Lehrkraft wörtlich sagt oder zeigt (1–3 Sätze)
- "arbeitsauftrag": ausformulierter Arbeitsauftrag in Schülersprache mit Operator (leer, wenn die Schüler nichts selbst bearbeiten)
- "material": konkretes Material passend zur Umsetzung (analog z. B. Arbeitsblatt mit Inhalt, digital z. B. interaktive Aufgabe mit Inhalt); kurz, aber inhaltlich ausformuliert.`, {
    type: 'object',
    properties: { phasen: { type: 'array', items: { type: 'object', properties: { impuls: { type: 'string' }, arbeitsauftrag: { type: 'string' }, material: { type: 'string' } } } } },
    required: ['phasen'],
  });
  return r.phasen || [];
}