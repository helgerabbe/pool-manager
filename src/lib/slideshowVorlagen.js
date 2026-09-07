/**
 * slideshowVorlagen.js
 *
 * Aktivität „Slideshow" (2026-09-07): Datenmodell, feste Folien-Vorlagen und
 * Helfer — EINE Quelle für Editor, Schüler-Player, Vorschau, Vollständigkeits-
 * prüfung und die Moodle-Runtime (plugin_slideshow).
 *
 * Datenmodell in field_values:
 *   aufgabentext: string (optional)
 *   slides: [{
 *     id, vorlage: <VORLAGEN.key>, hintergrund: '#rrggbb',
 *     elemente: { <slotKey>: { html } | { url } },
 *     einblenden: 'sofort' | 'nacheinander',
 *     reihenfolge: [slotKey, …]      // Reihenfolge des Einblendens
 *   }]
 *
 * Jede Folie ist eine feste Fläche von 960×540 (Tablet-Querformat) und wird
 * überall per CSS-Skalierung eingepasst — so ist WYSIWYG garantiert.
 */

export const SLIDE_W = 960;
export const SLIDE_H = 540;

export const SCHRIFTGROESSEN = [
  { key: 'xs', label: 'Klein', px: 18 },
  { key: 's', label: 'Normal', px: 22 },
  { key: 'm', label: 'Groß', px: 28 },
  { key: 'l', label: 'Sehr groß', px: 36 },
  { key: 'xl', label: 'Riesig', px: 48 },
];

export const HINTERGRUND_FARBEN = [
  { wert: '#ffffff', label: 'Weiß' },
  { wert: '#f1f5f9', label: 'Hellgrau' },
  { wert: '#fef3c7', label: 'Sand' },
  { wert: '#dcfce7', label: 'Mint' },
  { wert: '#dbeafe', label: 'Himmel' },
  { wert: '#fce7f3', label: 'Rosé' },
  { wert: '#ede9fe', label: 'Lavendel' },
  { wert: '#1e3a5f', label: 'Dunkelblau' },
  { wert: '#1e293b', label: 'Anthrazit' },
];

const UEBERSCHRIFT = {
  key: 'ueberschrift', art: 'text', label: 'Überschrift', platzhalter: 'Überschrift',
  groesse: 'l', fett: true, box: { left: 60, top: 40, width: 840, height: 80 },
};

export const VORLAGEN = [
  {
    key: 'titel', label: 'Titelfolie',
    slots: [
      { key: 'titel', art: 'text', label: 'Titel', platzhalter: 'Titel der Präsentation', groesse: 'xl', fett: true, align: 'center', box: { left: 80, top: 160, width: 800, height: 120 } },
      { key: 'untertitel', art: 'text', label: 'Untertitel', platzhalter: 'Untertitel oder Leitfrage', groesse: 'm', align: 'center', box: { left: 140, top: 300, width: 680, height: 90 } },
    ],
  },
  {
    key: 'text', label: 'Überschrift + Text',
    slots: [
      UEBERSCHRIFT,
      { key: 'text', art: 'text', label: 'Text', platzhalter: 'Dein Text …', groesse: 's', box: { left: 60, top: 140, width: 840, height: 350 } },
    ],
  },
  {
    key: 'bild_text', label: 'Bild links, Text rechts',
    slots: [
      UEBERSCHRIFT,
      { key: 'bild', art: 'bild', label: 'Bild', box: { left: 60, top: 140, width: 400, height: 350 } },
      { key: 'text', art: 'text', label: 'Text', platzhalter: 'Dein Text …', groesse: 's', box: { left: 500, top: 140, width: 400, height: 350 } },
    ],
  },
  {
    key: 'text_bild', label: 'Text links, Bild rechts',
    slots: [
      UEBERSCHRIFT,
      { key: 'text', art: 'text', label: 'Text', platzhalter: 'Dein Text …', groesse: 's', box: { left: 60, top: 140, width: 400, height: 350 } },
      { key: 'bild', art: 'bild', label: 'Bild', box: { left: 500, top: 140, width: 400, height: 350 } },
    ],
  },
  {
    key: 'bild', label: 'Großes Bild',
    slots: [
      UEBERSCHRIFT,
      { key: 'bild', art: 'bild', label: 'Bild', box: { left: 60, top: 130, width: 840, height: 320 } },
      { key: 'bildunterschrift', art: 'text', label: 'Bildunterschrift', platzhalter: 'Bildunterschrift', groesse: 'xs', align: 'center', box: { left: 60, top: 462, width: 840, height: 50 } },
    ],
  },
  {
    key: 'zwei_spalten', label: 'Zwei Spalten',
    slots: [
      UEBERSCHRIFT,
      { key: 'links', art: 'text', label: 'Linke Spalte', platzhalter: 'Linke Spalte …', groesse: 's', box: { left: 60, top: 140, width: 400, height: 350 } },
      { key: 'rechts', art: 'text', label: 'Rechte Spalte', platzhalter: 'Rechte Spalte …', groesse: 's', box: { left: 500, top: 140, width: 400, height: 350 } },
    ],
  },
  {
    // Überschrift + Unterüberschrift, darunter zwei Textspalten und rechts ein Bild.
    key: 'zwei_spalten_bild', label: 'Zwei Spalten + Bild',
    slots: [
      { ...UEBERSCHRIFT, box: { left: 60, top: 36, width: 840, height: 66 } },
      { key: 'unterueberschrift', art: 'text', label: 'Unterüberschrift', platzhalter: 'Unterüberschrift', groesse: 'm', fett: true, box: { left: 60, top: 108, width: 840, height: 52 } },
      { key: 'links', art: 'text', label: 'Linke Spalte', platzhalter: 'Linke Spalte …', groesse: 'xs', box: { left: 60, top: 176, width: 270, height: 320 } },
      { key: 'rechts', art: 'text', label: 'Rechte Spalte', platzhalter: 'Rechte Spalte …', groesse: 'xs', box: { left: 350, top: 176, width: 270, height: 320 } },
      { key: 'bild', art: 'bild', label: 'Bild', box: { left: 640, top: 176, width: 260, height: 320 } },
    ],
  },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function getVorlage(key) {
  return VORLAGEN.find((v) => v.key === key) || VORLAGEN[1];
}

export function neueFolie(vorlageKey = 'text') {
  const v = getVorlage(vorlageKey);
  return {
    id: uid(),
    vorlage: v.key,
    hintergrund: '#ffffff',
    elemente: {},
    einblenden: 'sofort',
    reihenfolge: v.slots.map((s) => s.key),
  };
}

/**
 * Verwandte Slots: Beim Vorlagenwechsel wandert der Inhalt in den nächsten
 * passenden Platz, wenn die neue Vorlage den alten Slot nicht kennt (z. B.
 * „text" → „links"). Erste Übereinstimmung gewinnt.
 */
const VERWANDTE_SLOTS = {
  ueberschrift: ['titel', 'text'],
  titel: ['ueberschrift'],
  unterueberschrift: ['untertitel', 'text', 'links'],
  untertitel: ['bildunterschrift', 'text', 'links'],
  text: ['links', 'rechts', 'untertitel', 'bildunterschrift'],
  links: ['text', 'rechts'],
  rechts: ['text', 'links'],
  bildunterschrift: ['untertitel', 'text'],
  bild: [],
};

/**
 * Vorlage wechseln — VERLUSTFREI: Alle bisherigen Elemente bleiben im
 * Datensatz erhalten, auch wenn die neue Vorlage den Platz nicht hat. Sie
 * werden nur nicht angezeigt und kehren zurück, sobald wieder eine Vorlage mit
 * diesem Platz gewählt wird. Nichts, was die Lehrkraft geschrieben oder
 * hochgeladen hat, darf durch einen Layoutwechsel verschwinden.
 *
 * Zusätzlich wandert Inhalt in verwandte Plätze, damit der Wechsel nach dem
 * Schreiben sichtbar etwas bewirkt statt scheinbar alles zu leeren.
 */
export function folieMitVorlage(folie, vorlageKey) {
  const v = getVorlage(vorlageKey);
  const alt = { ...(folie?.elemente || {}) };
  const elemente = { ...alt };
  const vergeben = new Set();

  v.slots.forEach((s) => {
    if (alt[s.key]) { vergeben.add(s.key); return; }
    const quelle = (VERWANDTE_SLOTS[s.key] || [])
      .find((k) => alt[k] && !vergeben.has(k)
        && (s.art === 'bild' ? !!alt[k].url : !!textAusHtml(alt[k].html)));
    if (quelle) {
      elemente[s.key] = alt[quelle];
      vergeben.add(quelle);
    }
  });

  return { ...folie, vorlage: v.key, elemente, reihenfolge: v.slots.map((s) => s.key) };
}

/** Slots der Folie in Einblende-Reihenfolge (fehlende Slots hinten angehängt). */
export function slotsInReihenfolge(folie) {
  const v = getVorlage(folie?.vorlage);
  const byKey = new Map(v.slots.map((s) => [s.key, s]));
  const order = Array.isArray(folie?.reihenfolge) ? folie.reihenfolge : [];
  const sorted = order.map((k) => byKey.get(k)).filter(Boolean);
  v.slots.forEach((s) => { if (!sorted.includes(s)) sorted.push(s); });
  return sorted;
}

export function textAusHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function slotHatInhalt(folie, slot) {
  const e = folie?.elemente?.[slot.key];
  if (!e) return false;
  return slot.art === 'bild' ? !!e.url : textAusHtml(e.html) !== '';
}

export function folieHatInhalt(folie) {
  return slotsInReihenfolge(folie).some((s) => slotHatInhalt(folie, s));
}

export function istDunkel(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export function textFarbeFuer(hex) {
  return istDunkel(hex) ? '#f8fafc' : '#1e293b';
}

export function schriftPx(key) {
  return (SCHRIFTGROESSEN.find((g) => g.key === key) || SCHRIFTGROESSEN[1]).px;
}

/** Minimale Bereinigung der Lehrkraft-HTML (kein Script, keine Event-Handler). */
export function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}