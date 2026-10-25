import { base44 } from '@/api/base44Client';

// Präsentationsmodus (2026-10-25): Live-Raum anlegen, beitreten, steuern.

const neuerCode = () => String(Math.floor(100000 + Math.random() * 900000));

/** Ablauf der Stunde als Schritte: zuerst die Phasen aus dem Stundenplaner, sonst das Regieblatt. */
export async function schritteDerStunde(stunde) {
  const phasen = stunde.planer_stand?.entwurf?.phasen || [];
  if (phasen.length) {
    return phasen.map((p) => ({
      titel: p.name, minuten: p.minuten, tafel: p.aktivitaet || '', sozialform: p.sozialform || '', methode: p.methode || '',
      tablet: p.sozialform && p.sozialform !== 'PL' ? 'Bearbeite den Auftrag an der Tafel.' : 'Lehrkraft erklärt – zuhören',
    }));
  }
  const seq = await base44.entities.StundenSequenz.filter({ stunde_id: stunde.id }, 'reihenfolge');
  return seq.map((s) => ({
    titel: s.phasenname, minuten: s.dauer_minuten, tafel: (s.tafel || []).map((b) => b.inhalt).filter(Boolean).join('\n') || s.lehrer_hinweis || '',
    tablet: s.schueler_anweisung || 'Lehrkraft erklärt – zuhören', sozialform: s.methode_sozialform || '', methode: '',
  }));
}

export async function raumStarten(stunde, email) {
  let code = neuerCode();
  while ((await base44.entities.LiveRaum.filter({ code, aktiv: true })).length) code = neuerCode();
  return base44.entities.LiveRaum.create({
    code, stunde_id: stunde.id, titel: stunde.arbeitstitel, lehrer_email: email,
    schritte: await schritteDerStunde(stunde), aktueller_schritt: -1, aktiv: true,
  });
}

export async function raumFinden(code) {
  const [raum] = await base44.entities.LiveRaum.filter({ code: code.trim(), aktiv: true });
  return raum || null;
}

export const melden = (raum, art, name) => base44.entities.LiveMeldung.create({
  raum_id: raum.id, lehrer_email: raum.lehrer_email, art, schritt: raum.aktueller_schritt, schueler_name: name || 'Schüler',
});

/** Hält einen Datensatz live aktuell (Echtzeit-Abo). */
export function raumAbonnieren(raumId, onRaum) {
  return base44.entities.LiveRaum.subscribe((e) => { if (e.id === raumId) onRaum(e.type === 'delete' ? null : e.data); });
}