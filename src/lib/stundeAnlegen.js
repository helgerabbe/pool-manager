import { base44 } from '@/api/base44Client';
import { eindeutigeCodes, standardSchuelerAnweisung } from '@/lib/stundenPhasen';

/** Phasen-Art aus Phasenname + gewählter Umsetzung ableiten. */
function typVon(p) {
  const art = (p.umsetzung || '').startsWith('digital') ? 'digital' : 'analog';
  const name = (p.phase || '').toLowerCase();
  const teil = /sicherung|abschluss|reflexion/.test(name) ? 'sicherung' : /einstieg|input|einführung/.test(name) ? 'input' : 'aufgabe';
  return `${art}_${teil}`;
}

/** Legt aus der Feinplanung eine Unterrichtsstunde mit allen Phasen an. Liefert die Stunden-ID. */
export async function legeStundeAn({ unterrichtseinheitId, abschnitt, plan }) {
  const [me, einheit] = await Promise.all([base44.auth.me(), base44.entities.Unterrichtseinheit.get(unterrichtseinheitId)]);
  const codes = eindeutigeCodes(plan.phasen.length + 1);
  const stunde = await base44.entities.Unterrichtsstunde.create({
    unterrichtseinheit_id: unterrichtseinheitId,
    fach: einheit?.fach,
    jahrgangsstufe: einheit?.jahrgangsstufe,
    arbeitstitel: abschnitt?.titel || 'Neue Stunde',
    stundenziel: abschnitt?.lernziel || '',
    besitzer_email: me.email,
    notfall_code: codes[plan.phasen.length],
  });
  await base44.entities.StundenSequenz.bulkCreate(plan.phasen.map((p, i) => {
    const typ = typVon(p);
    const zugeordnet = (plan.materialien || []).filter((m) => m.phase === p.phase);
    const material = zugeordnet.map((m) => m.name);
    return {
      stunde_id: stunde.id,
      reihenfolge: i,
      phasenname: p.phase,
      typ,
      dauer_minuten: p.minuten,
      methode_sozialform: p.methode,
      lehrer_hinweis: [p.ablauf, p.begruendung && `Warum: ${p.begruendung}`, ...(p.hinweise || []).map((h) => `Hinweis: ${h}`)].filter(Boolean).join('\n'),
      material_hinweis: material.join(', '),
      material_urls: zugeordnet.filter((m) => m.file_uri).map((m) => ({ url: m.file_uri, name: m.name })),
      schueler_anweisung: standardSchuelerAnweisung(typ),
      tafel: [
        { id: crypto.randomUUID(), typ: 'ueberschrift', inhalt: p.phase },
        { id: crypto.randomUUID(), typ: 'text', inhalt: p.aktivitaet || '' },
      ],
      freischalt_code: codes[i],
      ...(typ.startsWith('digital') && p.aktivitaet_id ? { aktivitaet_id: p.aktivitaet_id, field_values: {} } : {}),
    };
  }));
  return stunde.id;
}