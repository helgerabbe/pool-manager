/**
 * lib/brianLernpaketDialoge.js
 *
 * Sammelt die Brian-Dialoge, die INNERHALB von Lernpaketen liegen.
 *
 * Warum eigene Datei: Ein Brian-Gespräch kann an drei Stellen entstehen —
 * als allgemeine Aufgabe, als Schritt einer Folge (beides in lib/brianDialoge)
 * und als KI-Tutor-Aktivität in einem Lernpaket. Die dritte Stelle hat ein
 * anderes Datenmodell (LernpaketPhaseAktivitaet + MasterAufgabe.field_values),
 * fällt im Export-Center aber in dieselbe Liste. Auch diese Gespräche müssen
 * in Brian angelegt werden — vorher fehlten sie dort vollständig.
 *
 * Der Übertragungsstand lebt in MasterAufgabe.field_values:
 *   brian_url, brian_dialog_id, brian_sync_status, brian_synced_at
 * Die URL ist der Nachweis, dass das Gespräch in Brian wirklich existiert,
 * und wird über field_values automatisch in den Moodle-Payload durchgereicht.
 */

/** Erkennt die KI-Tutor-Aktivität am Namen der Aufgabenart. */
export function istKiTutorAktivitaet(katalogEintrag) {
  const name = (katalogEintrag?.name || '').toLowerCase();
  return name.includes('ki-tutor');
}

/**
 * @param {object} args
 * @param {Array} args.aktivitaeten  LernpaketPhaseAktivitaet[]
 * @param {Array} args.masterAufgaben MasterAufgabe[]
 * @param {Map}   args.katalogById   Map<aktivitaet_id, AktivitaetenKatalog>
 * @param {Map}   args.lernpaketById Map<lernpaket_id, Lernpakete>
 * @returns {Array} Dialoge im gleichen Format wie sammleBrianDialoge
 */
export function sammleBrianDialogeAusLernpaketen({
  aktivitaeten = [],
  masterAufgaben = [],
  katalogById = new Map(),
  lernpaketById = new Map(),
}) {
  const kiTutorAktivitaeten = new Map();
  for (const pa of aktivitaeten) {
    if (pa?.sync_status === 'to_delete') continue;
    if (istKiTutorAktivitaet(katalogById.get(pa?.aktivitaet_id))) {
      kiTutorAktivitaeten.set(pa.id, pa);
    }
  }

  const dialoge = [];
  for (const m of masterAufgaben) {
    if (m?.sync_status === 'to_delete') continue;
    const aktivitaet = kiTutorAktivitaeten.get(m?.activity_id);
    if (!aktivitaet) continue;

    const fv = m.field_values || {};
    const lernpaket = lernpaketById.get(m.lernpaket_id) || null;
    const aufgabenstellung = (fv.aufgabenstellung || '').trim();
    const erwartungshorizont = (fv.erwartungshorizont || '').trim();

    dialoge.push({
      key: `master:${m.id}`,
      quelle: 'lernpaket_master',
      masterId: m.id,
      // Für Anzeige/Filter im Cockpit: das Lernpaket ist hier die „Aufgabe".
      aufgabe: {
        id: lernpaket?.id || m.lernpaket_id,
        einheit_id: lernpaket?.einheit_id || null,
        titel: lernpaket?.titel_des_pakets || 'Lernpaket',
        anforderungsebene: '1 - Basis',
        // Freigabe lebt auf Lernpaket-Ebene.
        content_status: lernpaket?.content_status || 'draft',
        updated_date: m.updated_date,
      },
      schrittId: null,
      schrittNummer: null,
      titel: m.titel?.trim() || `KI-Tutor-Aufgabe in „${lernpaket?.titel_des_pakets || 'Lernpaket'}"`,
      felder: { learner_instruction: aufgabenstellung },
      segmente: [
        { label: '1. Aufgabenstellung (für Lernende)', value: aufgabenstellung },
        { label: '2. Erwartungshorizont (intern)', value: erwartungshorizont },
        { label: '3. Tutor-Prompt (intern)', value: m.tutor_prompt || '' },
      ],
      sync_status: fv.brian_sync_status || 'new',
      synced_at: fv.brian_synced_at || null,
      dialog_id: fv.brian_dialog_id || null,
      url: fv.brian_url || null,
      bereit: !!(aufgabenstellung && erwartungshorizont),
    });
  }

  return dialoge;
}