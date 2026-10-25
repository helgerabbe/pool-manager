// Stundenbaukasten (2026-10-25): Unterrichtsstunde.stundenbau = { version: 2, fundament, bausteine, vorschlaege, offen, phasen (Altbestand, bleibt erhalten) }.
// Baustein: { id, art: 'methode'|'inhalt'|'uebung', titel, methode, beschreibung, minuten, geraet: 'tafel'|'geraet', sozialform, folien, annahmen, vorlage }.

export const ARTEN = {
  methode: { label: 'Methode', farbe: 'bg-primary/10 text-primary border-primary/30' },
  inhalt: { label: 'Inhaltsfolie', farbe: 'bg-accent/10 text-accent border-accent/30' },
  uebung: { label: 'Übung', farbe: 'bg-chart-3/10 text-chart-3 border-chart-3/30' },
  standard: { label: 'Standardfolie', farbe: 'bg-chart-4/10 text-chart-4 border-chart-4/30' },
};

import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { istFreieMethode } from '@/lib/freieMethode';

/** Echte Methode? Freie Methode = Kiste ohne Methode. */
export const hatMethode = (b) => b.art === 'methode' && !istFreieMethode(b);

/** Name der Standardfolie, sonst der Folientitel. */
export const folienName = (f) => {
  const s = STANDARD_FOLIEN.find((x) => (f.vorlage === 'standard' ? x.key === f.standard : !x.ci && x.folie?.vorlage === f.vorlage));
  return s?.name || f.titel || '';
};

/** Methoden mit Einschub-Platzhalter werden zu zwei Blöcken: davor und danach. */
export const amEinschubTeilen = (b) => {
  const i = b.folien.findIndex((f) => f.standard === 'einschub');
  if (i < 0) return [b];
  return [{ ...b, folien: b.folien.slice(0, i) }, { ...b, id: neueId(), titel: `${b.titel} – Abschluss`, minuten: null, folien: b.folien.slice(i + 1) }];
};

export const neueId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const neuerBaustein = (art, daten = {}) => ({ id: neueId(), art, titel: '', beschreibung: '', minuten: null, geraet: 'tafel', folien: [], annahmen: [], ...daten });

export const summeMinuten = (bausteine) => (bausteine || []).reduce((s, b) => s + (Number(b.minuten) || 0), 0);

/** Fundament aus der bisherigen Planung (Thema, Ziel, Kernaufgaben). */
export function fundamentAusPlanung(stunde) {
  const v = stunde.planer_stand?.v || {};
  const u = v.uebungen || {};
  const aufgabe = (x) => ({ titel: x.titel || '', text: x.text || x.aufgabe || x.beschreibung || '' });
  return {
    thema: v.anker?.thema || stunde.arbeitstitel || '',
    ziel: v.ziel?.haupt || stunde.stundenziel || '',
    kernaufgaben: (u.kern || []).map(aufgabe),
    teilaufgaben: (u.vorstufen || []).map(aufgabe),
    materialien: [],
    leitplanken: '',
  };
}

/** Überführt eine Stunde ins neue Modell. Nichts geht verloren: Altphasen bleiben unter `phasen`, Unzuordenbares landet in `offen`. */
export function ueberfuehren(stunde) {
  const alt = stunde.stundenbau || {};
  const phasen = stunde.planer_stand?.entwurf?.phasen || [];
  const staende = alt.phasen || {};
  const bausteine = phasen.map((p, i) => neuerBaustein(p.methode ? 'methode' : 'inhalt', {
    titel: p.name || `Abschnitt ${i + 1}`, methode: p.methode || '', beschreibung: p.aktivitaet || '',
    minuten: p.minuten || null, sozialform: p.sozialform || '', geraet: p.umsetzung === 'analog' ? 'tafel' : p.umsetzung ? 'geraet' : 'tafel',
    folien: staende[i]?.folien || [], annahmen: staende[i]?.annahmen || [], vorlage: !!staende[i]?.vorlage,
  }));
  const offen = Object.entries(staende).filter(([i, s]) => Number(i) >= phasen.length && s?.folien?.length)
    .map(([i, s]) => ({ titel: `Alte Phase ${Number(i) + 1}`, folien: s.folien }));
  return { ...alt, version: 2, fundament: fundamentAusPlanung(stunde), bausteine, vorschlaege: [], offen, ueberfuehrt_am: new Date().toISOString() };
}

/** Baustein als „Phase“ für die bestehende KI-Logik (kiStundenbau). */
export const alsPhase = (b) => ({ name: b.titel, methode: b.art === 'methode' ? b.methode : '', minuten: b.minuten, sozialform: b.sozialform, aktivitaet: b.beschreibung, umsetzung: b.geraet === 'geraet' ? 'digital' : 'analog' });

/** Stunde mit dem aktuellen Fundament und Ablauf als Kontext für die KI. */
export function kiStunde(stunde, bk) {
  const ps = stunde.planer_stand || {};
  const v = ps.v || {};
  return { ...stunde, stundenziel: bk.fundament.ziel, planer_stand: { ...ps, v: { ...v, anker: { ...(v.anker || {}), thema: bk.fundament.thema }, ziel: { ...(v.ziel || {}), haupt: bk.fundament.ziel } }, entwurf: { phasen: bk.bausteine.map(alsPhase) } } };
}

export const fundamentText = (f) => [
  `Thema: ${f.thema}`, f.ziel && `Ziel: ${f.ziel}`,
  f.kernaufgaben?.length && `Kernaufgaben: ${f.kernaufgaben.map((a) => a.titel).join('; ')}`,
  f.teilaufgaben?.length && `Mögliche Teilaufgaben: ${f.teilaufgaben.map((a) => a.titel).join('; ')}`,
  f.materialien?.length && `Materialien: ${f.materialien.map((m) => m.name).join(', ')}`,
  f.leitplanken && `Didaktische Leitplanken: ${f.leitplanken}`,
].filter(Boolean).join('\n');