import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAnthropicConfig, askAnthropicText } from '../../shared/anthropicClient.js';

/**
 * aufgabenFormatPlatzhalter
 * ─────────────────────────
 * Räumt die Unterrichtsinhalte aus einem Aufgabenformat heraus und setzt
 * Platzhalter an ihre Stelle.
 *
 * WOZU: Ein Format wird beim Bauen einer echten Aufgabe erfasst und trägt
 * deshalb deren Inhalte mit sich — Kurzgeschichten, Bruchzahlen, Vokabeln.
 * Als Vorlage ist das schädlich: Die Vorschau zeigt fremden Unterricht, und
 * bei der Wiederverwendung bleiben Reste des alten Inhalts stehen, weil das
 * Modell sie für Teil der Mechanik hält. Mit Platzhaltern ist auf einen Blick
 * erkennbar, wo Inhalt hingehört.
 *
 * Der Bau selbst wird nicht angefasst: Struktur, Gestaltung, Bedienung und
 * Rückmeldelogik bleiben Zeichen für Zeichen erhalten.
 *
 * Nur für Administratoren — das Ergebnis überschreibt ein Galerie-Format.
 *
 * Request  (POST): { id }
 * Response:        { fragment }
 */

const SYSTEM = `Du bereitest interaktive Übungsaufgaben zur Wiederverwendung vor.

Du bekommst ein HTML-Fragment einer fertigen Aufgabe. Ersetze ALLE unterrichtlichen INHALTE durch neutrale Platzhalter, und ändere sonst NICHTS.

ERSETZEN:
- Überschriften, Arbeitsaufträge, Erklärtexte → knappe neutrale Fassung ("Arbeitsauftrag", "Kurze Erklärung der Aufgabe")
- Aufgabendaten: Aussagen, Begriffe, Fragen, Antworten, Lesetexte, Zahlen, Namen, Jahreszahlen, Rückmeldetexte → sprechende Platzhalter ("Aussage 1", "Begriff A", "Beispieltext …", "Hinweis zu Aussage 1")
- Die Anzahl der Beispiele bleibt gleich, damit die Mechanik erkennbar bleibt.

NICHT ANTASTEN:
- HTML-Struktur, Klassennamen, IDs, Attribute
- den gesamten <style>-Block
- den gesamten <script>-Block, mit Ausnahme von Zeichenketten, die den Schülern angezeigt werden
- Beschriftungen von Knöpfen und Bedienelementen ("Prüfen", "Weiter", "Zurücksetzen")

Antworte mit NICHTS ausser dem vollständigen, geänderten Fragment. Keine Erklärung, keine Code-Zäune.`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur für Administratoren.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return Response.json({ error: 'id ist erforderlich.' }, { status: 400 });

    const format = await base44.asServiceRole.entities.AufgabenFormat.get(id);
    const fragment = String(format?.fragment || '').trim();
    if (!fragment) return Response.json({ error: 'Dieses Format hat kein Fragment.' }, { status: 400 });

    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) {
      return Response.json({ error: 'Kein Anthropic-Zugang hinterlegt oder ausgeschaltet.' }, { status: 503 });
    }

    const { text, abgeschnitten } = await askAnthropicText(cfg, {
      system: SYSTEM,
      prompt: fragment,
      maxTokens: 24000,
    });

    // Abgeschnitten heißt: halbes Fragment. Das darf NICHT gespeichert werden —
    // ein Bruchstück wäre als Vorlage schlimmer als der ursprüngliche Inhalt.
    if (abgeschnitten) {
      return Response.json({
        error: 'Die Aufgabe ist zu lang — das Ergebnis wäre unvollständig gewesen und wurde nicht gespeichert.',
      }, { status: 502 });
    }

    let neu = text.trim();
    const zaun = neu.match(/^```(?:html)?\s*([\s\S]*?)```$/i);
    if (zaun) neu = zaun[1].trim();

    if (!neu.includes('<div') || neu.length < fragment.length / 3) {
      return Response.json({
        error: 'Das Ergebnis sah nicht wie eine vollständige Aufgabe aus und wurde nicht gespeichert.',
      }, { status: 502 });
    }

    await base44.asServiceRole.entities.AufgabenFormat.update(id, { fragment: neu });
    return Response.json({ fragment: neu });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}