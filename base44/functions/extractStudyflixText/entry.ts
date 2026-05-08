/**
 * extractStudyflixText.js
 *
 * AP2 / MBK-Integration §1.4 — Text-Extraktor für Studyflix-Artikelseiten.
 *
 * Lädt eine Studyflix-URL server-seitig, extrahiert den Artikeltitel und den
 * eigentlichen Lerninhalt (server-gerendertes HTML, kein JS-Rendering nötig)
 * und liefert einen sauberen, MBK-tauglichen Text zurück.
 *
 * Sicherheits-/Hygienemaßnahmen:
 *   - Whitelist: nur studyflix.de-Hosts werden akzeptiert (kein SSRF).
 *   - Auth: nur eingeloggte Nutzer dürfen die Function aufrufen.
 *   - Aggressiver Cleanup: Player-Artefakte, Werbe-Blöcke und Sprungmarken
 *     werden entfernt. H2/H3-Struktur bleibt erhalten (für die MBK).
 *
 * Returns:
 *   { titel, text, quelle_url } bei Erfolg
 *   { error: '...' } mit Status 4xx/5xx bei Fehlern
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Cleanup-Patterns ─────────────────────────────────────────────────────
//
// Studyflix rendert den Video-Player mehrfach inline ins HTML. Diese Phrasen
// tauchen daher als reine Text-Artefakte im extrahierten Markdown auf und
// müssen aggressiv rausgeworfen werden, sonst verseuchen sie die MBK-Eingabe.
const PLAYER_NOISE_PATTERNS = [
  /15 Sekunden zurück springen.*?$/gim,
  /15 Sekunden vorwärts springen.*?$/gim,
  /Wiedergabe starten oder stoppen/gi,
  /Stumm schalten/gi,
  /Ton einschalten/gi,
  /Vollbild/gi,
  /Video-Player wird geladen\.?/gi,
  /This is a modal window\.?/gi,
  /Aktueller Zeitpunkt.*?$/gim,
  /Geladen:\s*\d+\.\d+%/gi,
  /Wiedergabegeschwindigkeit/gi,
  /HLS playlist request error.*?$/gim,
  /^Werbung\s*$/gim,
  /^Webseite öffnen\s*$/gim,
  /^Pause\s*$/gim,
  /^Wiedergabe\s*$/gim,
  /^\d+x(?:,\s*ausgewählt)?\s*$/gim, // "1x", "1x, ausgewählt", "0.5x" etc.
  /^Dauer\s+-?:?-?\s*$/gim,
  /^Dauer:\s*\d+:\d+\s*$/gim,
  /Sammle Sterne für jedes geschaute Video!?/gi,
];

// "direkt ins Video springen" + Zeitstempel-Marker (z.B. "02:15") in Klammern.
const TIMESTAMP_PATTERNS = [
  /direkt ins Video springen/gi,
  /\[\s*\d{1,2}:\d{2}\s*\]/g,
  /^\d{1,2}:\d{2}\s*$/gm, // einzelne Zeile mit nur "MM:SS"
];

// ── HTML-Parsing-Helpers ─────────────────────────────────────────────────

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Wandelt einen HTML-Block in strukturierten Plain-Text um.
 * - h2/h3 → "## " / "### " (für MBK lesbar)
 * - p/li → einzelne Absätze / Bulletpoints
 * - alle anderen Tags werden entfernt
 */
function htmlToStructuredText(html) {
  let s = html;

  // <script>/<style> komplett entfernen
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Headlines markieren (vor allgemeinem Tag-Strip)
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // Listen-Items als Bulletpoints
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');

  // Absätze und Zeilenumbrüche
  s = s.replace(/<\/p>/gi, '\n\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // Alle restlichen Tags entfernen
  s = s.replace(/<[^>]+>/g, '');

  // Entitäten dekodieren
  s = decodeEntities(s);

  return s;
}

function applyPatterns(text, patterns) {
  let s = text;
  for (const p of patterns) s = s.replace(p, '');
  return s;
}

function collapseWhitespace(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l, i, arr) => {
      // Maximal eine Leerzeile am Stück
      if (l === '' && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n')
    .trim();
}

/**
 * Schneidet den eigentlichen Artikel aus dem Studyflix-HTML aus.
 * Strategie: Wir suchen den ersten <h1> (Artikeltitel) und nehmen alles bis
 * zum ersten Marker, der den eigentlichen Artikel beendet (z. B.
 * "Beliebte Inhalte", "Weitere Inhalte", "Was ist dein nächster Schritt").
 */
function extractArticleSection(html) {
  // Titel (erster h1 nach dem Player-Block)
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titel = h1Match ? decodeEntities(h1Match[1].replace(/<[^>]+>/g, '')).trim() : '';

  // Artikel-Bereich: ab erstem <h1> bis zum ersten "Stop-Marker"
  const startIdx = h1Match ? html.indexOf(h1Match[0]) : 0;
  let endIdx = html.length;
  const stopMarkers = [
    /Beliebte Inhalte aus dem Bereich/i,
    /Weitere Inhalte:/i,
    /Was ist dein nächster Schritt/i,
    /Nächstes Video anschauen/i,
    /<footer/i,
  ];
  for (const m of stopMarkers) {
    const match = html.slice(startIdx).match(m);
    if (match) {
      const candidate = startIdx + match.index;
      if (candidate < endIdx) endIdx = candidate;
    }
  }
  const articleHtml = html.slice(startIdx, endIdx);
  return { titel, articleHtml };
}

// ── URL-Validierung ──────────────────────────────────────────────────────

function isStudyflixUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    return u.hostname === 'studyflix.de' || u.hostname === 'www.studyflix.de';
  } catch {
    return false;
  }
}

// ── Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json().catch(() => ({}));
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL fehlt.' }, { status: 400 });
    }
    if (!isStudyflixUrl(url)) {
      return Response.json(
        { error: 'Automatischer Text-Import aktuell nur für Studyflix-URLs verfügbar.' },
        { status: 400 }
      );
    }

    // HTML laden mit User-Agent-Header (sonst antworten manche CDNs mit 403)
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PoolManagerBot/1.0; +https://base44.app)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return Response.json(
        { error: `Studyflix antwortet mit HTTP ${upstream.status}.` },
        { status: 502 }
      );
    }

    const html = await upstream.text();

    // Artikel extrahieren
    const { titel, articleHtml } = extractArticleSection(html);
    if (!titel) {
      return Response.json(
        { error: 'Studyflix-Seitenstruktur hat sich geändert: Artikeltitel nicht gefunden.' },
        { status: 502 }
      );
    }

    // HTML → strukturierter Text
    let text = htmlToStructuredText(articleHtml);
    text = applyPatterns(text, PLAYER_NOISE_PATTERNS);
    text = applyPatterns(text, TIMESTAMP_PATTERNS);
    text = collapseWhitespace(text);

    // Quellenangabe-Block für die MBK voranstellen.
    // Format laut Entscheidung: "Quelle: [Titel] ([URL])\n\n---\n\n[Text]"
    const composed = `Quelle: ${titel} (${url})\n\n---\n\n${text}`;

    if (composed.length < 80) {
      return Response.json(
        { error: 'Konnte keinen verwertbaren Text aus der Studyflix-Seite extrahieren.' },
        { status: 502 }
      );
    }

    // Schema-Limit für `transkript` ist 50.000 Zeichen — sicherheitshalber kappen.
    const MAX_LEN = 50000;
    const final = composed.length > MAX_LEN ? composed.slice(0, MAX_LEN) : composed;

    return Response.json({
      titel,
      text: final,
      quelle_url: url,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});