import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  hatAssistentZugriff, tagInhalt, saeubereBlock, sseEvent,
} from '../../shared/assistentProtokoll.js';

/**
 * slideshowGeneratorChat
 * ──────────────────────
 * Dialog-Motor des Slideshow-Generators (Aktivität „Slideshow").
 *
 * Die Lehrkraft beschreibt im Gespräch, was die Folien erklären sollen; das
 * Modell baut daraus einen ERKLÄR-Foliensatz im Datenformat der App
 * (src/lib/slideshowVorlagen.js) und liefert ihn als JSON zurück. Die App
 * zeigt das Ergebnis sofort WYSIWYG an; ist die Lehrkraft zufrieden,
 * übernimmt sie die Folien in den normalen Editor.
 *
 * WICHTIG — kein PowerPoint: Diese Folien sind ERKLÄRFOLIEN. Nicht knappe
 * Stichpunkte für einen Vortrag, sondern ausformulierte, schülergerechte
 * Erklärungen, die man ohne Lehrkraft daneben verstehen kann.
 *
 * Protokoll (Antwortformat des Modells):
 *   <antwort>kurzer Satz an die Lehrkraft</antwort>
 *   <folien>[ … vollständiger Foliensatz als JSON-Array … ]</folien>
 *
 * Bewusst KEINE Patches wie beim Aufgabengenerator: Ein Foliensatz ist
 * strukturiertes JSON, kein langes HTML-Dokument — er ganz neu auszugeben
 * kostet wenig und kann nicht halb misslingen.
 *
 * Request  (POST): { nachricht, folien?, verlauf?, kontext?, bilder? }
 * Response (SSE):  event: chunk    → { text }
 *                  event: ergebnis → { antwort, folien, geaendert, warnungen, tokens }
 *                  event: fehler   → { error }
 *
 * Alles Anbieterspezifische steckt im Abschnitt `// ── ADAPTER ──`.
 */

const DEFAULT_MODELL = 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 16000;
const MAX_VERLAUF = 20;

/** Muss zu VORLAGEN in src/lib/slideshowVorlagen.js passen. */
const VORLAGEN_BESCHREIBUNG = `- "titel": Titelfolie. Slots: "titel" (Text), "untertitel" (Text).
- "text": Überschrift + ein großes Textfeld. Slots: "ueberschrift" (Text), "text" (Text). Das Arbeitspferd des Erklärens.
- "bild_text": Überschrift, Bild links, Text rechts. Slots: "ueberschrift", "bild" (Bild), "text" (Text).
- "text_bild": Überschrift, Text links, Bild rechts. Slots: "ueberschrift", "text" (Text), "bild" (Bild).
- "bild": Überschrift, großes Bild, Bildunterschrift. Slots: "ueberschrift", "bild" (Bild), "bildunterschrift" (Text).
- "zwei_spalten": Überschrift, zwei Textspalten nebeneinander. Slots: "ueberschrift", "links" (Text), "rechts" (Text). Gut für Gegenüberstellungen (vorher/nachher, Vorteil/Nachteil, richtig/falsch).`;

const SYSTEM_PROMPT = `Du baust gemeinsam mit einer Lehrkraft einen ERKLÄR-FOLIENSATZ für Schüler:innen. Die Folien werden im Kurs Folie für Folie angezeigt; die Schüler:innen lesen sie ALLEIN, ohne dass jemand daneben sitzt und erklärt.

# DAS WICHTIGSTE: DAS SIND KEINE POWERPOINT-FOLIEN
Vergiss alles, was du über Präsentationsfolien weißt.
- KEINE Stichpunkte, keine Schlagwörter, keine "höchstens sechs Wörter pro Zeile"-Regel. Solche Folien sind ohne Vortrag wertlos.
- Stattdessen: AUSFORMULIERTE, vollständige Sätze, die eine Sache wirklich erklären. Eine Folie darf ein kurzer, gut gegliederter Erklärtext sein.
- Jede Folie muss für sich verständlich sein: Begriff nennen, erklären, an einem konkreten Beispiel zeigen.
- Fachbegriffe werden eingeführt, nicht vorausgesetzt: erst in Alltagssprache erklären, dann den Fachbegriff daneben stellen.
- Sprache: Deutsch, Du-Form, altersgerecht. Kurze Hauptsätze, aber vollständige Gedanken. Keine Schachtelsätze, kein Behördendeutsch.
- Lieber EINE Sache pro Folie richtig erklären als drei Sachen anreißen.

# UMFANG PRO FOLIE
Die Folie ist 960×540 groß, der Text wird NICHT gescrollt — was nicht passt, ist abgeschnitten. Halte dich daran:
- Textfeld "text" (Vorlage "text"): etwa 400 bis 900 Zeichen. Das sind ungefähr 4 bis 8 Sätze oder eine kurze Erklärung mit drei Aufzählungspunkten.
- Textfeld neben einem Bild oder eine Spalte in "zwei_spalten": etwa 200 bis 450 Zeichen.
- "titel", "ueberschrift", "untertitel", "bildunterschrift": ein kurzer Satz oder eine Zeile.
Wird es mehr, teile den Inhalt auf ZWEI Folien auf — niemals kleiner schreiben.

# AUFBAU DES FOLIENSATZES
Ein guter Satz hat 4 bis 10 Folien:
1. Eine Titelfolie mit dem Thema und einer Leitfrage als Untertitel.
2. Eine Folie, die anknüpft: Warum geht es hier um etwas? Woher kennen die Schüler:innen das?
3. Die Erklärfolien, Schritt für Schritt, jede baut auf der vorigen auf.
4. Mindestens eine Folie mit einem durchgerechneten oder durchgedachten BEISPIEL.
5. Eine Abschlussfolie, die das Wichtigste in eigenen Worten zusammenfasst ("Das musst du behalten").
Stelle Gegensätze und häufige Fehler in "zwei_spalten" gegenüber — das prägt sich ein.

# TEXTFORMATIERUNG
Der Text jedes Textfeldes ist HTML, aber nur mit diesen Mitteln:
- <b> für Fachbegriffe und Schlüsselaussagen (sparsam, höchstens zwei bis drei pro Folie).
- <i> für Beispiele oder eingeschobene Erläuterungen.
- <u> nur, wenn etwas wirklich hervorgehoben werden muss.
- <br> für Zeilenumbrüche, <ul><li>…</li></ul> für kurze Listen.
- KEINE anderen Tags, KEIN style-Attribut, KEINE Überschriften-Tags, KEINE Bilder im Text, KEIN Script.

# BILDER
- Du erfindest KEINE Bilder und keine Bild-Adressen.
- Nur wenn dir Bilder der Lehrkraft ausdrücklich genannt werden, darfst du sie verwenden: Setze dann in den Bild-Slot genau die angegebene Adresse, zeichengenau, und beschreibe im Text, was darauf zu sehen ist.
- Gibt es keine Bilder, benutze KEINE Vorlage mit Bild-Slot ("bild_text", "text_bild", "bild") — nimm "text", "zwei_spalten" oder "titel".

# VORLAGEN (feste Layouts — du erfindest keine neuen)
${VORLAGEN_BESCHREIBUNG}

# DATENFORMAT
<folien> enthält ein JSON-Array. Jede Folie:
{
  "vorlage": "text",
  "hintergrund": "#ffffff",
  "elemente": { "ueberschrift": { "html": "…" }, "text": { "html": "…" } },
  "einblenden": "sofort",
  "reihenfolge": ["ueberschrift", "text"]
}
Regeln:
- "vorlage": genau einer der oben genannten Werte.
- "elemente": nur Slots, die es in DIESER Vorlage gibt. Textslots als { "html": "…" }, Bildslots als { "url": "…" }.
- "hintergrund": heller Hex-Wert (#ffffff, #f1f5f9, #fef3c7, #dcfce7, #dbeafe, #ede9fe). Titel- und Abschlussfolie dürfen sich farblich abheben; sonst ruhig bleiben. Dunkle Farben nur für Titelfolien.
- "einblenden": "sofort" (Vorgabe) oder "nacheinander", wenn die Elemente der Folie einen Gedankengang aufbauen und einzeln erscheinen sollen.
- "reihenfolge": alle Slot-Namen dieser Folie in der Reihenfolge, in der sie erscheinen sollen.
- Keine weiteren Felder, keine Kommentare im JSON, keine ids.

# WIE DU ANTWORTEST
Antworte IMMER in diesem Format, ohne Markdown-Codefences:

<antwort>Ein bis drei Sätze an die Lehrkraft: was du gebaut oder geändert hast, oder eine Rückfrage, wenn dir etwas Wesentliches fehlt.</antwort>

<folien>
[ … ]
</folien>

Regeln:
- Baust oder änderst du den Foliensatz, gib IMMER den VOLLSTÄNDIGEN Satz aus — auch wenn nur eine Folie betroffen ist. Folien, die nicht angesprochen wurden, gibst du Zeichen für Zeichen unverändert wieder.
- Reine Rückfragen oder Erklärungen: nur <antwort>, ohne <folien>.

# GESPRÄCHSFÜHRUNG
Die Lehrkraft ist Fachfrau für ihren Unterricht, aber keine Programmiererin. Sprich über das, was die Schüler:innen lesen — nie über Code, JSON oder Technik. Frage nur nach, wenn ohne die Antwort wirklich nicht weitergebaut werden kann; sonst baue eine erste Fassung und frag danach, was noch fehlt.`;

// ═══════════════════════════════════════════════════════════════════════
// Hilfsfunktionen
// ═══════════════════════════════════════════════════════════════════════

/** Slot-Namen je Vorlage — muss zu src/lib/slideshowVorlagen.js passen. */
const VORLAGEN_SLOTS: Record<string, { key: string; art: 'text' | 'bild' }[]> = {
  titel: [{ key: 'titel', art: 'text' }, { key: 'untertitel', art: 'text' }],
  text: [{ key: 'ueberschrift', art: 'text' }, { key: 'text', art: 'text' }],
  bild_text: [{ key: 'ueberschrift', art: 'text' }, { key: 'bild', art: 'bild' }, { key: 'text', art: 'text' }],
  text_bild: [{ key: 'ueberschrift', art: 'text' }, { key: 'text', art: 'text' }, { key: 'bild', art: 'bild' }],
  bild: [{ key: 'ueberschrift', art: 'text' }, { key: 'bild', art: 'bild' }, { key: 'bildunterschrift', art: 'text' }],
  zwei_spalten: [{ key: 'ueberschrift', art: 'text' }, { key: 'links', art: 'text' }, { key: 'rechts', art: 'text' }],
};

const ERLAUBTE_TAGS = /<(?!\/?(?:b|i|u|br|ul|ol|li|strong|em|span)\b)[^>]*>/gi;

/** Nur die erlaubten Auszeichnungen behalten — alles andere fällt weg. */
function saeubereHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(ERLAUBTE_TAGS, '')
    .trim();
}

/**
 * Liest den <folien>-Block als geprüften Foliensatz.
 *
 * Bewusst streng: Eine Folie mit unbekannter Vorlage oder ohne Inhalt wird
 * VERWORFEN, nicht repariert — ein stillschweigend zurechtgebogener
 * Foliensatz wäre schlimmer als eine fehlende Folie. Bild-Adressen müssen zu
 * den hochgeladenen Bildern gehören; erfundene Adressen werden entfernt.
 */
function leseFolien(text, erlaubteBildUrls: Set<string>) {
  const roh = tagInhalt(text, 'folien');
  if (!roh) return { folien: null, warnungen: [] };

  let liste;
  try {
    liste = JSON.parse(saeubereBlock(roh));
  } catch (_e) {
    return { folien: null, warnungen: ['Der Foliensatz war nicht lesbar. Bitte noch einmal nachfragen.'] };
  }
  if (!Array.isArray(liste)) {
    return { folien: null, warnungen: ['Der Foliensatz hatte nicht die erwartete Form.'] };
  }

  const warnungen: string[] = [];
  const folien: any[] = [];

  liste.forEach((f: any, i: number) => {
    const vorlage = String(f?.vorlage || '').trim();
    const slots = VORLAGEN_SLOTS[vorlage];
    if (!slots) {
      warnungen.push(`Folie ${i + 1} hatte ein unbekanntes Layout und wurde ausgelassen.`);
      return;
    }

    const elemente: Record<string, any> = {};
    slots.forEach((slot) => {
      const wert = f?.elemente?.[slot.key];
      if (!wert) return;
      if (slot.art === 'bild') {
        const url = String(wert.url || '').trim();
        if (!url) return;
        if (!erlaubteBildUrls.has(url)) {
          warnungen.push(`Auf Folie ${i + 1} wurde ein Bild eingesetzt, das es nicht gibt — der Platz ist jetzt leer.`);
          return;
        }
        elemente[slot.key] = { url };
      } else {
        const html = saeubereHtml(wert.html ?? wert.text ?? '');
        if (html) elemente[slot.key] = { html };
      }
    });

    if (Object.keys(elemente).length === 0) {
      warnungen.push(`Folie ${i + 1} war leer und wurde ausgelassen.`);
      return;
    }

    const hintergrund = /^#[0-9a-f]{6}$/i.test(String(f?.hintergrund || '').trim())
      ? String(f.hintergrund).trim()
      : '#ffffff';
    const gewuenschteFolge = Array.isArray(f?.reihenfolge) ? f.reihenfolge.map(String) : [];
    const reihenfolge = slots
      .map((s) => s.key)
      .sort((a, b) => {
        const ia = gewuenschteFolge.indexOf(a);
        const ib = gewuenschteFolge.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });

    folien.push({
      id: `ki${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 7)}`,
      vorlage,
      hintergrund,
      elemente,
      einblenden: f?.einblenden === 'nacheinander' ? 'nacheinander' : 'sofort',
      reihenfolge,
    });
  });

  if (folien.length === 0) {
    return { folien: null, warnungen: [...warnungen, 'Es kam keine brauchbare Folie zurück.'] };
  }
  return { folien, warnungen };
}

/** Kurzfassung des bisherigen Satzes für den Verlauf (ohne ids). */
function folienFuerModell(folien: any[]) {
  return (folien || []).map((f) => ({
    vorlage: f.vorlage,
    hintergrund: f.hintergrund,
    elemente: f.elemente,
    einblenden: f.einblenden,
    reihenfolge: f.reihenfolge,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await hatAssistentZugriff(base44, user))) {
      return Response.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const nachricht = String(body.nachricht || '').trim();
    const bisherige = Array.isArray(body.folien) ? body.folien : [];
    const verlauf = Array.isArray(body.verlauf) ? body.verlauf.slice(-MAX_VERLAUF) : [];
    const kontext = body.kontext && typeof body.kontext === 'object' ? body.kontext : {};
    const bilder = (Array.isArray(body.bilder) ? body.bilder : [])
      .filter((b: any) => b?.url)
      .slice(0, 12);

    if (!nachricht) return Response.json({ error: 'nachricht ist erforderlich.' }, { status: 400 });

    // ── Zugang laden ───────────────────────────────────────────────────
    const settings = await base44.asServiceRole.entities.Systemeinstellungen
      .filter({ schluessel: 'anthropic_connector' })
      .catch(() => []);
    let cfg: any = {};
    try { cfg = JSON.parse(settings?.[0]?.wert_text || '{}'); } catch (_e) { cfg = {}; }

    const apiKey = String(cfg.api_key || '').trim() || Deno.env.get('ANTHROPIC_API_KEY') || '';
    const modell = String(cfg.modell || '').trim() || DEFAULT_MODELL;
    if (!apiKey) return Response.json({ error: 'Kein Anthropic-Zugang hinterlegt.' }, { status: 503 });
    if (cfg.aktiv === false) return Response.json({ error: 'Anthropic-Zugang ist ausgeschaltet.' }, { status: 503 });

    // ── Nachrichten zusammenstellen ────────────────────────────────────
    const kontextZeilen = [
      kontext.fach ? `Fach: ${kontext.fach}` : null,
      kontext.jahrgangsstufe ? `Jahrgang: ${kontext.jahrgangsstufe}` : null,
      kontext.einheit ? `Einheit: ${kontext.einheit}` : null,
      kontext.lernpaket ? `Lernpaket: ${kontext.lernpaket}` : null,
      kontext.lernziele ? `Lernziele: ${kontext.lernziele}` : null,
      kontext.aufgabentext ? `Arbeitsauftrag an die Schüler:innen: ${kontext.aufgabentext}` : null,
    ].filter(Boolean);

    const messages: any[] = [];
    if (kontextZeilen.length) {
      messages.push({
        role: 'user',
        content: `RAHMEN DIESES FOLIENSATZES (nicht wörtlich auf die Folien schreiben):\n${kontextZeilen.join('\n')}`,
      });
      messages.push({ role: 'assistant', content: '<antwort>Verstanden, ich habe den Rahmen.</antwort>' });
    }

    for (const m of verlauf) {
      if (!m?.role || !m?.content) continue;
      messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
    }

    const bilderBlock = bilder.length
      ? `BILDER DER LEHRKRAFT (${bilder.length}) — nur diese Adressen darfst du in Bild-Slots einsetzen, zeichengenau:\n`
        + bilder.map((b: any, i: number) => `${i + 1}. ${b.label || `Bild ${i + 1}`}\n   Adresse: ${b.url}`).join('\n')
        + '\n\nDu siehst die Bilder nicht. Verlasse dich auf die Bezeichnung und schreibe nur, was daraus hervorgeht — erfinde keine Bildinhalte.\n\n---\n\n'
      : 'Es liegen KEINE Bilder vor. Benutze deshalb nur Vorlagen ohne Bild-Slot.\n\n---\n\n';

    const bisherBlock = bisherige.length
      ? `BISHERIGER FOLIENSATZ (Stand, auf den sich Änderungen beziehen):\n${JSON.stringify(folienFuerModell(bisherige), null, 1)}\n\n---\n\n`
      : '';

    const letzte = `${bisherBlock}${bilderBlock}WUNSCH DER LEHRKRAFT:\n${nachricht}`;
    messages.push({ role: 'user', content: letzte });

    // ═══════════════════════════════════════════════════════════════════
    // ── ADAPTER: Anthropic Messages API (anbieterspezifisch) ───────────
    // ═══════════════════════════════════════════════════════════════════
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: modell,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      let detail = '';
      try {
        const err = await upstream.json();
        detail = err?.error?.message ? ` ${err.error.message}` : '';
      } catch (_e) { /* ignorieren */ }
      return Response.json(
        { error: `KI nicht erreichbar (HTTP ${upstream.status}).${detail}` },
        { status: 502 },
      );
    }

    const erlaubteBildUrls = new Set(bilder.map((b: any) => String(b.url)));

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const reader = upstream.body!.getReader();

        let roh = '';
        let puffer = '';
        let sichtbar = '';
        const tokens: any = { input: null, output: null };
        let stopGrund: string | null = null;

        const sendeAntwortText = () => {
          const offen = roh.match(/<antwort>([\s\S]*?)(<\/antwort>|$)/i);
          if (!offen) return;
          const jetzt = offen[1].split(/<folien>/i)[0];
          if (jetzt.length > sichtbar.length) {
            const neu = jetzt.slice(sichtbar.length);
            sichtbar = jetzt;
            controller.enqueue(enc.encode(sseEvent('chunk', { text: neu })));
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            puffer += dec.decode(value, { stream: true });

            const zeilen = puffer.split('\n');
            puffer = zeilen.pop() || '';

            for (const zeile of zeilen) {
              if (!zeile.startsWith('data:')) continue;
              const nutzlast = zeile.slice(5).trim();
              if (!nutzlast || nutzlast === '[DONE]') continue;
              let ev: any;
              try { ev = JSON.parse(nutzlast); } catch (_e) { continue; }

              if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                roh += ev.delta.text;
                sendeAntwortText();
              } else if (ev.type === 'message_start') {
                tokens.input = ev.message?.usage?.input_tokens ?? null;
              } else if (ev.type === 'message_delta') {
                tokens.output = ev.usage?.output_tokens ?? null;
                stopGrund = ev.delta?.stop_reason ?? stopGrund;
              } else if (ev.type === 'error') {
                controller.enqueue(enc.encode(sseEvent('fehler', {
                  error: ev.error?.message || 'Fehler beim Erzeugen.',
                })));
              }
            }
          }

          const antwort = tagInhalt(roh, 'antwort') || 'Fertig.';
          // Abgeschnitten: <folien> begonnen, aber nie geschlossen. Ein halber
          // Foliensatz darf NICHT durchgehen.
          const abgeschnitten = /<folien>/i.test(roh) && !/<\/folien>/i.test(roh);

          if (abgeschnitten || stopGrund === 'max_tokens') {
            controller.enqueue(enc.encode(sseEvent('ergebnis', {
              antwort,
              folien: null,
              geaendert: false,
              warnungen: ['Die Antwort war zu lang und wurde abgeschnitten — der Foliensatz wurde nicht fertig. Bitten Sie um weniger Folien oder lassen Sie das Thema in zwei Teilen bauen.'],
              tokens,
            })));
          } else {
            const res = leseFolien(roh, erlaubteBildUrls);
            controller.enqueue(enc.encode(sseEvent('ergebnis', {
              antwort,
              folien: res.folien,
              geaendert: !!res.folien,
              warnungen: res.warnungen,
              tokens,
            })));
          }
        } catch (err: any) {
          controller.enqueue(enc.encode(sseEvent('fehler', { error: err.message })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});