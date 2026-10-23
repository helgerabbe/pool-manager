import { base44 } from '@/api/base44Client';

const feld = {
  type: 'object',
  properties: {
    passt: { type: 'boolean' },
    aenderungen: { type: 'array', items: { type: 'object', properties: {
      art: { type: 'string', enum: ['ergaenzt', 'geaendert', 'entfernt'] }, text: { type: 'string' },
    } } },
    neuer_text: { type: 'string', description: 'Vollständiger neuer Text des Feldes (bei passt=true unverändert).' },
  },
};

/** Gleicht Entscheidungsbaum und Prüfregeln mit dem geplanten Foliensatz ab und schlägt Anpassungen vor. */
export async function kiAbgleich(m) {
  return Promise.race([
    base44.integrations.Core.InvokeLLM({
      prompt: `Du prüfst für die Unterrichtsmethode "${m.name}", ob der ENTSCHEIDUNGSBAUM DES ASSISTENTEN und die PRÜFREGELN zum geplanten Foliensatz passen, und umgekehrt.
Der Entscheidungsbaum enthält die Fragen, die der Assistent der Lehrkraft vor der Stunde stellt (je Frage Optionen und was daraufhin passiert), z. B. Partnerfindung (Sitznachbar, Lerntempo-Duett, offen lassen), Abschluss/Reflexion ja oder nein, Ergebnissicherung auf Papier oder digital.
Jede Entscheidung, die der Foliensatz voraussetzt (Varianten, Abfragen, Optionen), muss im Entscheidungsbaum vorkommen; Fragen ohne Folge im Foliensatz sind zu prüfen. Prüfregeln müssen zu den Folien, Zeiten und Stolpersteinen passen.
Bestehende passende Inhalte bleiben erhalten. Alltagsnahe Lehrersprache.

ENTSCHEIDUNGSBAUM:
${m.assistent_fragen || '(leer)'}

PRÜFREGELN:
${m.pruefregeln || '(leer)'}

METHODENBESCHREIBUNG:
${m.info_methodenbeschreiber || '(keine)'}

GROBÜBERSICHT DES FOLIENSATZES:
${m.foliensatz_status_quo ? (m.info_grafikassistent || '').replace(/^Genaue Daten:.*$/gm, '') : m.info_grobuebersicht || '(keine)'}

WÜNSCHE DER LEHRKRAFT:
${m.info_wuensche || '(keine)'}

STOLPERSTEINE:
${m.stolpersteine || '(keine)'}

Liefere für beide Felder: passt und die einzelnen Änderungen (je eine kurze Zeile). Den vollständigen neuen Text NUR, wenn passt=false; sonst neuer_text leer lassen.`,
      response_json_schema: { type: 'object', properties: { assistent_fragen: feld, pruefregeln: feld } },
    }),
    new Promise((_, nein) => setTimeout(() => nein(new Error('Zeitlimit')), 120000)),
  ]);
}