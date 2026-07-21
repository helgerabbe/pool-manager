import { base44 } from '@/api/base44Client';

/**
 * Gemeinsame Übernahme-Funktion: legt einen KI-Vorschlag (aus der
 * KI-Ideenbox oder dem Inspirations-Assistenten) als offenen Entwurf
 * in der Ideenkiste der Einheit ab.
 */
export async function speichereIdeeInKiste({ einheitId, titel, beschreibung, aufgabentypVorschlag }) {
  return base44.entities.AufgabenIdee.create({
    einheit_id: einheitId,
    titel: titel || 'Aufgaben-Idee',
    beschreibung: beschreibung || '',
    aufgabentyp_vorschlag: aufgabentypVorschlag || '',
    status: 'offen',
  });
}

/** Baut die Beschreibung aus den typischen Vorschlags-Feldern zusammen. */
export function baueIdeenBeschreibung(vorschlag, { themenfeldTitel, missionLabel } = {}) {
  let text = vorschlag.aufgabenstellung || '';
  if (vorschlag.required_materials) text += `\n\nMaterial: ${vorschlag.required_materials}`;
  if (vorschlag.didaktischer_hinweis) text += `\n\nDidaktischer Hinweis: ${vorschlag.didaktischer_hinweis}`;
  if (missionLabel) text += `\n\nAufgabenart/Mission: ${missionLabel}`;
  if (themenfeldTitel) text += `\n\nGedacht für Themenfeld: „${themenfeldTitel}"`;
  return text.trim();
}