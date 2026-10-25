// Feinplanung (2026-10-19): Je Phase entscheiden, ob analog, digital oder gemischt umgesetzt wird.
import { kiAufruf } from '@/lib/kiStundenVorbereitung';

export const UMSETZUNGEN = [
  { key: 'analog', name: 'Nur Tafel', hinweis: 'Schüler brauchen ihr Gerät nicht, alles läuft vorne.' },
  { key: 'digital', name: 'Schüler arbeiten am Gerät', hinweis: 'Schüler bearbeiten die Aufgabe auf ihrem Gerät.' },
];

/** Altwert 'gemischt' (Tafel + Gerät) gilt als Arbeit am Gerät. */
export const normUmsetzung = (u) => (u === 'gemischt' ? 'digital' : u);

/** Vorschlag je Phase mit kurzer Begründung. */
export async function kiUmsetzungVorschlag({ assistent, einheit, entwurf }) {
  const r = await kiAufruf(assistent, `Du bist erfahrener Fachdidaktiker. Entscheide für jede Phase dieser Stunde (${einheit?.fach}, Jg. ${einheit?.jahrgangsstufe}), ob die Schüler ihr Gerät zum Bearbeiten brauchen. "analog" = nur Tafel: die Schüler arbeiten ohne Gerät (Gespräch, Papier, Blick nach vorne). "digital" = die Schüler bearbeiten die Aufgabe auf ihrem Tablet (auch interaktive Formen mit Tafel und Tablet). Digital nur, wenn es echten Mehrwert bringt (z. B. sofortige Rückmeldung, Differenzierung, Ergebnisse sammeln).
Phasen: ${JSON.stringify(entwurf.phasen.map(({ name, schueler, sozialform, methode }) => ({ name, schueler, sozialform, methode })))}
Gib "phasen" in derselben Reihenfolge zurück, je mit "umsetzung" (analog|digital) und "begruendung" (ein kurzer Satz, Du-Form).`, {
    type: 'object',
    properties: { phasen: { type: 'array', items: { type: 'object', properties: { umsetzung: { type: 'string', enum: UMSETZUNGEN.map((u) => u.key) }, begruendung: { type: 'string' } } } } },
    required: ['phasen'],
  });
  return r.phasen || [];
}