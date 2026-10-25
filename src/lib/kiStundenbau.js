import { base44 } from '@/api/base44Client';
import { FOLIEN_VORLAGEN, vorlagenText, folieSchema } from '@/lib/folienVorlagen';
import { standardSatz } from '@/lib/standardFoliensaetze';
import { BAUREGELN } from '@/lib/foliensatzBauregeln';
import { CI_REGELN } from '@/lib/standardFolienRegeln';

// Stundenbau-Assistent (2026-10-25): Phase für Phase einen Foliensatz der Stunde bauen.
// 1. fragenZurPhase: alle offenen Fragen auf einmal. 2. bauePhase: Folien bauen, Unbeantwortetes entscheidet die KI selbst.
// 3. folieAusWunsch: eine einzelne (eingefügte) Folie nach Wunsch der Lehrkraft füllen.

const MODELL = 'claude_sonnet_4_6';

/** Grundsatz der gewählten Methode (Standardsatz oder gespeicherter Foliensatz), sonst null. */
// Zuerst der in der Methodengalerie gebaute Foliensatz (passendes Fach bevorzugt), dann der feste Standardsatz.
export async function methodenSatz(name, fach) {
  if (!name) return null;
  const [m] = await base44.entities.MethodenKatalog.filter({ name });
  const saetze = Object.entries(m?.grafik_vorlagen || {}).filter(([, x]) => x?.folien?.length);
  const v = saetze.find(([k]) => fach && k.startsWith(fach)) || saetze[0];
  if (v) return v[1].folien;
  const fest = standardSatz(name, 'digital') || standardSatz(name, 'analog');
  return fest?.folien?.length ? fest.folien : null;
}

/** Alle Entscheidungen für diese Phase, je mit einem konkreten Vorschlag des Assistenten. */
export async function vorschlaegeZurPhase(stunde, phase, vorlage) {
  const offen = (vorlage || []).flatMap((f) => CI_REGELN[f.standard]?.klaeren || f.entscheidungen || []);
  return base44.integrations.Core.InvokeLLM({
    model: MODELL,
    prompt: `Du bist der Stundenbau-Assistent für Lehrkräfte. Die Vorlage der Methode soll jetzt mit den Inhalten dieser Stunde gefüllt werden.
${kontext(stunde, phase, vorlage)}
${offen.length ? `Diese Punkte muss die Vorlage geklärt bekommen: ${[...new Set(offen)].join(' | ')}` : ''}
Schreibe eine kurze "einleitung" (1-2 Sätze, du-Form). Liste dann alle Entscheidungen (2 bis 7, ohne Dopplungen) als "fragen". Ordne jede Frage mit "folie" (1, 2, 3 …) der Folie der Vorlage zu, auf der sie wirkt. Mache zu JEDER Frage einen konkreten, fertigen Vorschlag passend zur Stunde (z. B. Wortlaut der Leitfrage, Motiv des Bildes, Zahl der Karten), damit die Lehrkraft nur noch zustimmen muss.`,
    response_json_schema: { type: 'object', properties: { einleitung: { type: 'string' }, fragen: { type: 'array', items: { type: 'object', properties: { folie: { type: 'number' }, frage: { type: 'string' }, vorschlag: { type: 'string' } } } } } },
  });
}

/** Schreibt einen Vorschlag nach dem (gesprochenen) Wunsch der Lehrkraft um. */
export async function vorschlagAnpassen(stunde, frage, vorschlag, wunsch) {
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Stunde: ${stunde.arbeitstitel}. Frage: ${frage}
Bisheriger Vorschlag: ${vorschlag}
Die Lehrkraft möchte es anders (frei gesprochen): ${wunsch}
Formuliere den neuen Vorschlag kurz und fertig, genau im Sinne der Lehrkraft.`,
    response_json_schema: { type: 'object', properties: { vorschlag: { type: 'string' } } },
  });
  return r.vorschlag || wunsch;
}

// Nur die Textfelder gehen an die KI, damit das Füllen schnell bleibt.
const TEXTFELDER = ['titel', 'untertitel', 'satz', 'frage', 'auftrag', 'hinweis', 'inhalt', 'methodisch', 'minuten', 'sozialform'];
const kurz = (f) => Object.fromEntries(TEXTFELDER.filter((k) => f[k] !== undefined && f[k] !== '').map((k) => [k, f[k]]).concat([['standard', f.standard]]));

/** Füllt die Vorlage: gleiche Folien, gleiche Reihenfolge, nur Inhalte der Stunde. */
export async function fuelleVorlage(stunde, phase, vorlage, entscheidungen) {
  const r = await base44.integrations.Core.InvokeLLM({
    model: MODELL,
    prompt: `Du bist der Stundenbau-Assistent. Fülle die Vorlage mit den Inhalten dieser Stunde.
${kontext(stunde, phase, vorlage)}
Entscheidungen der Lehrkraft: ${entscheidungen}
Vorlage (JSON): ${JSON.stringify(vorlage.map(kurz))}
Gib GENAU ${vorlage.length} Folien in derselben Reihenfolge zurück. "vorlage" und "standard" jeder Folie bleiben unverändert, nur die Texte werden an die Stunde angepasst. Schülersprache.
${BAUREGELN}`,
    response_json_schema: { type: 'object', properties: { folien: { type: 'array', items: folieSchema } } },
  });
  return vorlage.map((v, i) => ({ ...v, ...(r.folien?.[i] || {}), vorlage: v.vorlage, standard: v.standard, folientyp: v.folientyp, id: v.id, phase: phase.name, status: 'fertig' }));
}

const kurzFolie = (f) => `${f.vorlage}${f.standard ? `:${f.standard}` : ''} „${f.titel || ''}“`;

const kontext = (stunde, phase, satz) => {
  const v = stunde.planer_stand?.v || {};
  const alle = stunde.planer_stand?.entwurf?.phasen || [];
  return `Stunde: ${stunde.arbeitstitel} (${stunde.fach || ''}, Jahrgang ${stunde.jahrgangsstufe || ''})
Thema: ${v.anker?.thema || ''}
Stundenziel: ${v.ziel?.haupt || stunde.stundenziel || ''}
Ablauf der Stunde: ${alle.map((p, i) => `${i + 1}. ${p.name} (${p.minuten} Min.)`).join(' · ')}
JETZT ZU BAUEN: Phase „${phase.name}“, ${phase.minuten || '?'} Min., Sozialform ${phase.sozialform || '-'}, Methode ${phase.methode || 'keine'}.
Was die Schüler tun: ${phase.aktivitaet || ''}
${satz ? `Standard-Foliensatz der Methode (Grundlage, Reihenfolge übernehmen, nur Inhalte anpassen): ${satz.map(kurzFolie).join(' · ')}` : 'Für diese Phase gibt es keinen Standard-Foliensatz der Methode.'}`;
};

export async function fragenZurPhase(stunde, phase) {
  const satz = await methodenSatz(phase.methode);
  return base44.integrations.Core.InvokeLLM({
    model: MODELL,
    prompt: `Du bist der Stundenbau-Assistent für Lehrkräfte. Du baust gleich die Folien (Tafel + Schüler-Tablet) für eine Phase.
${kontext(stunde, phase, satz)}
Schreibe zuerst eine kurze "einleitung" (2-3 Sätze, du-Form): was du gleich baust und auf welcher Grundlage (Methode, Standardsatz, Inhalte der Stunde).
Stelle dann ALLE Fragen, die du vor dem Bau noch geklärt haben musst, als Liste (2 bis 5, kurz, konkret, je eine Sache, z. B. Material, Leitfrage, Beispiele, Zeit, Sozialform). Keine Fragen, deren Antwort schon oben steht.`,
    response_json_schema: { type: 'object', properties: { einleitung: { type: 'string' }, fragen: { type: 'array', items: { type: 'string' } } } },
  });
}

const fertig = (f, phase, i) => ({ ...f, id: `f${Date.now()}${i}${Math.random().toString(36).slice(2, 6)}`, status: 'fertig', phase: phase.name,
  vorlage: FOLIEN_VORLAGEN[f.vorlage] ? f.vorlage : 'fokus', folientyp: FOLIEN_VORLAGEN[f.vorlage]?.folientyp || 'inhalt' });

export async function bauePhase(stunde, phase, fragen, antworten) {
  const satz = await methodenSatz(phase.methode, stunde.fach);
  const r = await base44.integrations.Core.InvokeLLM({
    model: MODELL,
    prompt: `Du bist der Stundenbau-Assistent. Baue jetzt den Foliensatz für diese eine Phase.
${kontext(stunde, phase, satz)}
Deine Fragen: ${fragen.map((f, i) => `${i + 1}. ${f}`).join(' ')}
Antworten der Lehrkraft (frei gesprochen, evtl. nach Nummern): ${antworten || '(keine)'}
Wo die Lehrkraft nichts oder „weiß nicht“ geantwortet hat: entscheide selbst sinnvoll und nenne jede solche Entscheidung kurz in "annahmen" (sie kann es später ändern). Brich niemals ab.
Baue 1 bis 6 Folien in Unterrichtsreihenfolge. Inhalte konkret zum Thema, Schülersprache.
${BAUREGELN}
VORLAGEN (wähle je Folie genau eine, nicht "entwurf"):
${vorlagenText()}`,
    response_json_schema: { type: 'object', properties: { folien: { type: 'array', items: folieSchema }, annahmen: { type: 'array', items: { type: 'string' } } } },
  });
  return { folien: (r.folien || []).map((f, i) => fertig(f, phase, i)), annahmen: r.annahmen || [] };
}

export async function folieAusWunsch(stunde, phase, art, wunsch, folien) {
  const r = await base44.integrations.Core.InvokeLLM({
    model: MODELL,
    prompt: `Du bist der Stundenbau-Assistent. Baue GENAU EINE Folie, die die Lehrkraft in die Phase einfügt.
${kontext(stunde, phase, null)}
Bisherige Folien dieser Phase: ${folien.map(kurzFolie).join(' · ') || 'keine'}
Gewünschte Art: ${art}. Was auf der Folie zu sehen sein soll: ${wunsch}
${BAUREGELN}
VORLAGEN (wähle die passendste, nicht "entwurf"):
${vorlagenText()}`,
    response_json_schema: folieSchema,
  });
  return fertig(r, phase, 0);
}