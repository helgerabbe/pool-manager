import { base44 } from '@/api/base44Client';

/**
 * Integrations-Assistent der Ideenkiste (Etappe 3):
 * 1. holeIntegrationsVorschlag — KI analysiert die Aufgaben-Idee gegen den
 *    AKTUELLEN Stand der Einheit (Themenfelder, Lernpakete, vorhandene
 *    Aufgaben) und schlägt konkret vor, wo und in welcher Form die Idee
 *    integriert werden soll.
 * 2. legeAufgabeAn — legt die Aufgabe bei Zustimmung tatsächlich an
 *    (Allgemeine Aufgabe Ebene 2 oder Anwendungs-/Projektaufgabe Ebene 3)
 *    und markiert die Idee als 'integriert'.
 *
 * Ebene-1-Inhalte (Lernpaket-Aktivitäten) werden bewusst NICHT automatisch
 * angelegt — dort empfiehlt die KI nur das passende Lernpaket und die
 * Aktivitätsform; die Ausarbeitung läuft über die Aufgaben-Werkstatt.
 */

export async function holeIntegrationsVorschlag({ einheit, idee, themenfelder, lernpakete, vorhandeneAufgaben }) {
  const tfListe = themenfelder.length > 0
    ? themenfelder.map((t) => `- id: ${t.id} | "${t.titel || t.name || 'Ohne Titel'}"`).join('\n')
    : '(keine Themenfelder angelegt)';
  const lpListe = lernpakete.length > 0
    ? lernpakete.map((p) => `- id: ${p.id} | "${p.titel_des_pakets}"`).join('\n')
    : '(keine Lernpakete angelegt)';
  const aufgabenListe = vorhandeneAufgaben.length > 0
    ? vorhandeneAufgaben.slice(0, 30).map((a) => `- [${a.anforderungsebene || 'Ebene ?'}] "${a.titel || 'Ohne Titel'}"`).join('\n')
    : '(noch keine Aufgaben vorhanden)';

  const prompt = `Du bist der Integrations-Assistent einer Unterrichtsplanungs-App. Eine Lehrkraft hat eine Aufgaben-Idee gesammelt und möchte sie jetzt in ihre Einheit integrieren. Analysiere die Idee gegen den AKTUELLEN Stand der Einheit und mache einen konkreten Platzierungsvorschlag.

EINHEIT: "${einheit?.titel_der_einheit}" (${einheit?.fach}, Jahrgang ${einheit?.jahrgangsstufe})

THEMENFELDER DER EINHEIT:
${tfListe}

LERNPAKETE DER EINHEIT:
${lpListe}

BEREITS VORHANDENE AUFGABEN (zur Vermeidung von Dubletten):
${aufgabenListe}

DIE AUFGABEN-IDEE:
Titel: ${idee.titel}
Beschreibung: ${idee.beschreibung || '(keine)'}
Notierter Aufgabenform-Vorschlag: ${idee.aufgabentyp_vorschlag || '(keiner)'}

MÖGLICHE INTEGRATIONSZIELE:
1. "allgemeine_aufgabe" (Ebene 2, Transfer): offene Aufgabe auf Einheitenebene mit KI-Tutor. Braucht: titel, aufgabenstellung (aus Schülersicht, vollständig ausformuliert), erwartungshorizont (was muss eine gute Antwort enthalten), mission_type (problem|entdeckung|recherche|anwendung|transfer|kreativitaet), schwierigkeitsgrad (1-3), optional themenfeld_id aus der Liste oben.
2. "projektaufgabe" (Ebene 3): produktorientierte Anwendungs- oder Projektaufgabe. Braucht: titel, aufgabenstellung, erwartungshorizont, aufgabentyp_projekt ("Anwendungsaufgabe" für kürzere fokussierte, "Projektaufgabe" für umfangreiche produktorientierte Aufgaben).
3. "lernpaket_empfehlung": Die Idee ist eine kurze, automatisch auswertbare Übung (Lückentext, Quiz, Zuordnung o. Ä.) und gehört in ein Lernpaket (Ebene 1). Diese Inhalte werden NICHT automatisch angelegt — empfiehl das passende lernpaket_id aus der Liste und beschreibe in empfehlung_text, welche Aktivitätsform die Lehrkraft dort anlegen soll.

DEINE AUFGABE:
- Wähle GENAU EIN Ziel und begründe die Wahl kurz und verständlich (begruendung).
- Fülle die für das Ziel nötigen Felder vollständig und hochwertig aus — die Aufgabenstellung soll direkt einsatzfähig sein und die Beschreibung der Lehrkraft treu umsetzen.
- Passt ein Themenfeld inhaltlich, gib dessen id an; sonst leer lassen.

Antworte ausschließlich als JSON.`;

  const materialUrls = (idee.material_urls || []).map((m) => m.url);
  return base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: materialUrls.length > 0 ? materialUrls : null,
    response_json_schema: {
      type: 'object',
      properties: {
        ziel: { type: 'string', enum: ['allgemeine_aufgabe', 'projektaufgabe', 'lernpaket_empfehlung'] },
        begruendung: { type: 'string' },
        titel: { type: 'string' },
        aufgabenstellung: { type: 'string' },
        erwartungshorizont: { type: 'string' },
        mission_type: { type: 'string', enum: ['problem', 'entdeckung', 'recherche', 'anwendung', 'transfer', 'kreativitaet'] },
        schwierigkeitsgrad: { type: 'integer', enum: [1, 2, 3] },
        themenfeld_id: { type: ['string', 'null'] },
        aufgabentyp_projekt: { type: 'string', enum: ['Anwendungsaufgabe', 'Projektaufgabe'] },
        lernpaket_id: { type: ['string', 'null'] },
        empfehlung_text: { type: ['string', 'null'] },
      },
      required: ['ziel', 'begruendung'],
    },
  });
}

/** Legt die Aufgabe gemäß Vorschlag an und markiert die Idee als integriert. */
export async function legeAufgabeAn({ einheit, idee, vorschlag, themenfelder }) {
  const istProjekt = vorschlag.ziel === 'projektaufgabe';
  const erstesMaterial = (idee.material_urls || [])[0];

  const data = {
    einheit_id: einheit.id,
    aufgaben_typ: 'inhalt',
    anforderungsebene: istProjekt ? '3 - Projekt' : '2 - Transfer',
    titel: vorschlag.titel || idee.titel,
    aufgabenstellung: vorschlag.aufgabenstellung || idee.beschreibung || '',
    erwartungshorizont: vorschlag.erwartungshorizont || '',
    erstellungs_modus: 'ki',
    content_status: 'draft',
  };
  if (istProjekt) {
    data.aufgabentyp_projekt = vorschlag.aufgabentyp_projekt || 'Anwendungsaufgabe';
  } else {
    if (vorschlag.mission_type) data.mission_type = vorschlag.mission_type;
    if (vorschlag.schwierigkeitsgrad) data.schwierigkeitsgrad = vorschlag.schwierigkeitsgrad;
    if (vorschlag.themenfeld_id && themenfelder.some((t) => t.id === vorschlag.themenfeld_id)) {
      data.themenfeld_id = vorschlag.themenfeld_id;
    }
  }
  if (erstesMaterial) {
    data.aufgabenstellung_datei_url = erstesMaterial.url;
    data.aufgabenstellung_datei_name = erstesMaterial.name || 'Material';
  }

  const created = await base44.entities.AllgemeineAufgabe.create(data);

  const zielLabel = istProjekt
    ? `Als ${data.aufgabentyp_projekt} (Ebene 3) angelegt`
    : 'Als Allgemeine Aufgabe (Ebene 2) angelegt';
  const tfName = data.themenfeld_id
    ? themenfelder.find((t) => t.id === data.themenfeld_id)?.titel || themenfelder.find((t) => t.id === data.themenfeld_id)?.name
    : null;
  await base44.entities.AufgabenIdee.update(idee.id, {
    status: 'integriert',
    integriert_hinweis: tfName ? `${zielLabel} — Themenfeld „${tfName}"` : zielLabel,
    integriert_am: new Date().toISOString(),
  });

  return created;
}

/** Markiert eine Idee manuell als integriert (z. B. nach Lernpaket-Empfehlung). */
export async function markiereAlsIntegriert(idee, hinweis) {
  await base44.entities.AufgabenIdee.update(idee.id, {
    status: 'integriert',
    integriert_hinweis: hinweis || 'Manuell als integriert markiert',
    integriert_am: new Date().toISOString(),
  });
}