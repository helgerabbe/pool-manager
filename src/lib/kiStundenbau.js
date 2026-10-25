import { base44 } from '@/api/base44Client';
import { FOLIEN_VORLAGEN, vorlagenText, folieSchema } from '@/lib/folienVorlagen';
import { standardSatz } from '@/lib/standardFoliensaetze';
import { BAUREGELN } from '@/lib/foliensatzBauregeln';

// Stundenbau-Assistent (2026-10-25): Phase für Phase einen Foliensatz der Stunde bauen.
// 1. fragenZurPhase: alle offenen Fragen auf einmal. 2. bauePhase: Folien bauen, Unbeantwortetes entscheidet die KI selbst.
// 3. folieAusWunsch: eine einzelne (eingefügte) Folie nach Wunsch der Lehrkraft füllen.

const MODELL = 'claude_sonnet_4_6';

/** Grundsatz der gewählten Methode (Standardsatz oder gespeicherter Foliensatz), sonst null. */
export async function methodenSatz(name) {
  if (!name) return null;
  const fest = standardSatz(name, 'digital') || standardSatz(name, 'analog');
  if (fest?.folien?.length) return fest.folien;
  const [m] = await base44.entities.MethodenKatalog.filter({ name });
  const v = Object.values(m?.grafik_vorlagen || {}).find((x) => x?.folien?.length);
  return v?.folien || null;
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
  const satz = await methodenSatz(phase.methode);
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