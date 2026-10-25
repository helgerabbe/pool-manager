import { base44 } from '@/api/base44Client';
import { methodenSatz, fuelleVorlage, bauePhase, folieAusWunsch } from '@/lib/kiStundenbau';
import { neuerBaustein, alsPhase, kiStunde, fundamentText } from '@/lib/stundenbaukasten';

const baustein = { type: 'object', properties: { art: { type: 'string', enum: ['methode', 'inhalt', 'uebung'] }, titel: { type: 'string' }, methode: { type: 'string' }, beschreibung: { type: 'string' }, minuten: { type: 'number' }, geraet: { type: 'string', enum: ['tafel', 'geraet'] } } };

/** Lädt die Vorlage-Folien einer Methode in einen Baustein. */
export async function mitVorlage(b, fach) {
  if (b.art !== 'methode' || !b.methode) return b;
  const satz = await methodenSatz(b.methode, fach);
  return { ...b, folien: (satz || []).map((f, i) => ({ ...f, id: `${b.id}v${i}`, phase: b.titel })), vorlage: !!satz?.length };
}

/** Vorschlag des Assistenten: ganzer Ablauf (wunsch leer) oder einzelne Bausteine nach Wunsch. */
export async function vorschlagen(stunde, bk, wunsch) {
  const methoden = await base44.entities.MethodenKatalog.filter({ quelle: 'methode', ist_aktiv: true }, 'name', 300);
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Du bist ein erfahrener Unterrichtsplaner. Fach ${stunde.fach || ''}, Jahrgang ${stunde.jahrgangsstufe || ''}.
STUNDENFUNDAMENT:
${fundamentText(bk.fundament)}
BISHERIGER ABLAUF: ${bk.bausteine.map((b, i) => `${i + 1}. ${b.titel} (${b.art}${b.methode ? `, ${b.methode}` : ''})`).join(' · ') || 'leer'}
${wunsch ? `WUNSCH DER LEHRKRAFT: ${wunsch}\nSchlage 1 bis 3 Bausteine vor, die diesen Wunsch erfüllen.` : 'Schlage einen vollständigen, schlüssigen Stundenablauf mit 4 bis 7 Bausteinen vor.'}
Bausteinarten: "methode" (Methode aus der Liste, Namen exakt übernehmen), "inhalt" (Lehrkraft präsentiert/erklärt), "uebung" (konkrete Schüleraufgabe, gern aus den Kern-/Teilaufgaben).
Methoden: ${methoden.map((m) => m.name).join(', ')}
"minuten" nur als grober Richtwert. "geraet": "tafel" = nur Tafel, "geraet" = Schüler arbeiten am Gerät. "beschreibung": 1 Satz, was passiert.`,
    response_json_schema: { type: 'object', properties: { bausteine: { type: 'array', items: baustein } } },
  });
  return Promise.all((r.bausteine || []).map((x) => mitVorlage(neuerBaustein(x.art, { ...x, methode: x.art === 'methode' ? x.methode : '' }), stunde.fach)));
}

/** Füllt einen Baustein mit Folien zu Fundament und Stunde. */
export async function fuellen(stunde, bk, b) {
  const s = kiStunde(stunde, bk);
  const phase = alsPhase(b);
  if (b.art === 'methode') {
    if (b.vorlage && b.folien.length) return { ...b, vorlage: false, folien: await fuelleVorlage(s, phase, b.folien, 'Entscheide alles selbst passend zum Stundenfundament.') };
    const r = await bauePhase(s, phase, [], '');
    return { ...b, vorlage: false, ...r };
  }
  const f = await folieAusWunsch(s, phase, b.art === 'uebung' ? 'Übungsaufgabe für die Schüler' : 'Inhaltsfolie, die Lehrkraft erklärt', b.beschreibung || b.titel, b.folien);
  return { ...b, folien: [...b.folien, f] };
}