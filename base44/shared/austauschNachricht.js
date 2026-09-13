/**
 * shared/austauschNachricht.js
 *
 * Das Nachrichtenformat des gemeinsamen Briefkastens `austausch/` im
 * Repository (vereinbart mit dem Kursbau am 10.09.2026, Format 'austausch-1').
 * Eine Nachricht ist eine Markdown-Datei mit flachem YAML-Kopf:
 *
 *   ---
 *   format: austausch-1
 *   von: mbk | pm
 *   an: pm | mbk
 *   betreff: …
 *   erzeugt_am: ISO
 *   antwortet_auf: <dateiname> | null
 *   status: offen | beantwortet | erledigt
 *   braucht_malte: true | false
 *   ---
 *   Fließtext
 *
 * Spielregeln aus austausch/README.md, die hier durchgesetzt werden:
 *   · Eine abgelegte Nachricht wird nicht mehr geändert — nur ihr `status`.
 *   · Antworten sind IMMER eine neue Datei mit `antwortet_auf`.
 *   · Fehlender/unbekannter Status gilt als 'offen'.
 */

export const AUSTAUSCH_ORDNER = 'austausch';

const STATUS = new Set(['offen', 'beantwortet', 'erledigt']);

export function parseNachricht(text = '', dateiname = '') {
  const s = String(text || '');
  const m = s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const kopf = {};
  let body = s;
  if (m) {
    body = m[2];
    for (const zeile of m[1].split(/\r?\n/)) {
      const t = zeile.match(/^([a-z_]+):\s*(.*)$/i);
      if (t) kopf[t[1]] = t[2].trim();
    }
  }
  const status = STATUS.has(kopf.status) ? kopf.status : 'offen';
  return {
    datei: dateiname,
    von: kopf.von || '',
    an: kopf.an || '',
    betreff: kopf.betreff || dateiname,
    erzeugt_am: kopf.erzeugt_am || '',
    antwortet_auf: kopf.antwortet_auf && kopf.antwortet_auf !== 'null' ? kopf.antwortet_auf : null,
    status,
    braucht_malte: kopf.braucht_malte === 'true',
    text: body.trim(),
  };
}

/** Setzt ausschließlich die Status-Zeile im Kopf um (Text bleibt unangetastet). */
export function setzeStatus(text = '', neuerStatus = 'beantwortet') {
  const s = String(text || '');
  if (/^status:\s*.*$/m.test(s)) return s.replace(/^status:\s*.*$/m, `status: ${neuerStatus}`);
  return s.replace(/^---\r?\n/, `---\nstatus: ${neuerStatus}\n`);
}

export function slugifyThema(thema = '') {
  return String(thema || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function baueDateiname({ datum, von, an, thema }) {
  return `${datum}-${von}-an-${an}-${slugifyThema(thema) || 'nachricht'}.md`;
}

export function baueNachricht({ von, an, betreff, erzeugtAm, antwortetAuf, brauchtMalte, text }) {
  return `---
format: austausch-1
von: ${von}
an: ${an}
betreff: ${String(betreff || '').replace(/\r?\n/g, ' ').trim()}
erzeugt_am: ${erzeugtAm}
antwortet_auf: ${antwortetAuf || 'null'}
status: offen
braucht_malte: ${brauchtMalte ? 'true' : 'false'}
---

${String(text || '').trim()}
`;
}