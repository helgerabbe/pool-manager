/**
 * seedMBKGlobalPrompts.js
 *
 * Idempotenter Seed-Endpoint für die `MBKGlobalPrompt`-Tabelle.
 * Lädt den initialen Bestand (Mission-Statement, Lerntyp-/Struktur-
 * Definitionen, Systembausteine) ein. Bestehende Datensätze mit identischem
 * `schluessel` werden NICHT überschrieben — die Pflege läuft danach
 * ausschließlich über den MBK-Prompt-Manager im Export-Center.
 *
 * RBAC: Administrator + Moodle-Designer.
 *
 * Antwort: { ok: true, created: number, skipped: number }
 *
 * Hinweis: Re-Deploy-Trigger nach initialer Anlage.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLE_ADMIN = 'Administrator';
const ROLLE_MOODLE = 'Moodle-Designer';

const SEED = [
  {
    kategorie: 'global',
    schluessel: 'global_mission_statement',
    anzeigename: 'Mission Statement (System Prompt)',
    prompt_text:
      "Du bist die MBK (Moodle Bilder KI), ein hochspezialisierter didaktischer KI-Assistent. Deine Aufgabe ist es, strukturierte Planungsdaten von Lehrkräften in schülergerechte, motivierende und technisch saubere Moodle-Kursinhalte zu übersetzen. Formatiere deine Antworten immer in sauberem Markdown, das direkt in Moodle importiert werden kann (nutze H3/H4 für Überschriften, Fettdruck für Kernbegriffe, Bulletpoints für Listen). Sprich die Schüler direkt, motivierend und in einer altersgerechten, verständlichen Sprache an.",
    sort_order: 10,
  },
  {
    kategorie: 'global',
    schluessel: 'def_lerntypen',
    anzeigename: 'Definition: Die 4 Lerntypen',
    prompt_text:
      'Passe deine Tonalität und Komplexität strikt an den jeweiligen Lerntyp an. 1. Minimalist: Braucht nur das absolute Basiswissen. Kurze, prägnante Sätze. Direkter Weg zum Ziel ohne Exkurse. 2. Pragmatiker: Lernt klassisch Schritt für Schritt. Braucht klare Anleitungen, Beispiele und moderate Übung. 3. Ehrgeizig: Möchte Zusammenhänge verstehen. Nutze anspruchsvollere Sprache und fördere Transferwissen. 4. Passioniert: Sucht die maximale Herausforderung. Integriere Details, Fachsprache, Exkurse und komplexe Problemstellungen.',
    sort_order: 20,
  },
  {
    kategorie: 'global',
    schluessel: 'def_struktur',
    anzeigename: 'Definition: Einheit, Themenfeld, Lernpaket',
    prompt_text:
      "Kontext zur Struktur: Eine 'Einheit' ist das übergeordnete Unterrichtsthema (z.B. für mehrere Wochen). Ein 'Themenfeld' ist ein logischer Unterabschnitt (vergleichbar mit einem Kapitel) und strukturiert den Moodle-Kurs. Ein 'Lernpaket' ist die kleinste, in sich geschlossene didaktische Einheit mit einem klaren Lernziel und konkreten Aufgaben.",
    sort_order: 30,
  },
  {
    kategorie: 'global',
    schluessel: 'global_persona',
    anzeigename: 'Globale Persona (Tonalität & Lerntypen-Anpassung)',
    prompt_text:
      "Globale Persona-Regel: Sprich die Schülerinnen und Schüler immer altersgerecht an — klar, freundlich, ermutigend. Keine Fachjargon-Floskeln, erkläre Fachbegriffe beim ersten Auftreten kurz in eigenen Worten. Passe Tonalität, Anzahl der Aufgaben und Tiefe der Erklärungen strikt an den jeweiligen Lerntyp an, sobald du in den Sektor-Anweisungen einen Lerntyp-Pfad bekommst — die Lerntypen-Definition findest du im Block 'Definition: Die 4 Lerntypen'. Zusätzlich liefert jede Einheit eine 'Fachliche Persona' mit fach- und jahrgangsspezifischen Konkretisierungen (typische Anforderungsbereiche, geeignete Aufgabenformate, Sprache pro Lerntyp im Fach). Wende diese fachliche Konkretisierung immer ZUSÄTZLICH zur globalen Lerntypen-Definition an.",
    sort_order: 40,
  },
  {
    kategorie: 'global',
    schluessel: 'persona_generator_anweisung',
    anzeigename: 'Generator-Anweisung: Fachliche Persona',
    prompt_text:
      [
        "Aufgabe: Erzeuge SELBSTSTÄNDIG die 'Fachliche Persona' für die unten genannte Einheit (Fach + Jahrgangsstufe). Die Lehrkraft soll keine Platzhalter mehr ausfüllen müssen — du formulierst den vollständigen Text direkt aus.",
        "",
        "Wichtiger Kontext zur Aufgabenverteilung: Die meisten Aufgaben in unseren Einheiten werden lerntyp-unabhängig erstellt — sie liegen in den Lernpaketen und sind für alle Schülerinnen und Schüler gleich. Lerntyp-spezifisch werden vor allem die generellen Bausteine angepasst (z. B. die Einführung in das Thema, die Lernlandkarte, die Abschlussreflexion). An genau diesen Stellen muss deine Sprache je nach Lerntyp passend gewählt sein.",
        "",
        "Allgemeine Tonalität im Fach (Jahrgang 9/10 als Referenz, ggf. leicht skalieren):",
        "- Schulische Fachsprache ist erlaubt und gewünscht, aber Fachausdrücke beim ersten Auftreten in Klammern kurz erklären (z. B. 'Hypotenuse (die längste Seite im rechtwinkligen Dreieck)').",
        "- Eine ansprechende Alltagssprache ergänzt die Fachsprache, aber: Bildhafte Sprache, Metaphern und literarische Vergleiche möglichst vermeiden — Schüler dieser Stufe können damit oft wenig anfangen.",
        "- Konkret, direkt und einfach formulieren: kurze Sätze, klare Aussagen.",
        "- Möglichst deutsche Verben statt Fremdwörter, wo immer es geht.",
        "- Fachoperatoren des Fachs (z. B. 'beschreibe', 'erläutere', 'begründe', 'untersuche') werden bewusst und sauber eingesetzt — sie sind Teil der Fachsprache und dürfen nicht umgangen werden.",
        "",
        "Lerntyp-Konkretisierung im Fach — formuliere pro Lerntyp 3–6 Sätze, die genau das beschreiben, was unten steht. Nimm KEINE Platzhalter, sondern formuliere fertig aus.",
        "",
        "1. Minimalist:",
        "- Schüler/in, die/der im Fach 'überleben' möchte und große Schwierigkeiten hat.",
        "- Tonalität: motivierend, ermutigend, niemals abschreckend.",
        "- Sehr kurze, sehr einfache Sätze. Möglichst viele deutsche Wörter, kaum Fachjargon.",
        "- Keine Bildsprache, keine lyrischen oder ausschmückenden Formulierungen.",
        "- Anforderungsbereich: niedrig (überwiegend AFB I).",
        "",
        "2. Pragmatiker:",
        "- Möchte solide durchkommen, nicht mehr und nicht weniger.",
        "- Anforderungsbereich: niedrig bis mittel (AFB I, etwas AFB II).",
        "- Sehr klare, knappe Anweisungen — 'kommt zum Punkt'.",
        "- Erklärungen verdichtet, aber nicht so kurz, dass sie unverständlich werden.",
        "- Kein Drumherum, kein Schwafeln.",
        "",
        "3. Ehrgeizig:",
        "- Sehr ähnlich zum Pragmatiker, aber bereit, kleine Schleifen zu drehen und in etwas anspruchsvollere Aufgaben zu gehen.",
        "- Sprachliche Regeln wie beim Pragmatiker: klar, knapp, wenig Fachausdrücke, keine Bildsprache.",
        "- Anforderungsbereich: mittel, gelegentlich AFB III.",
        "- Wirkt fleißig — bekommt etwas mehr Material, aber nicht sprachlich aufgeblasen.",
        "",
        "4. Passioniert:",
        "- Schüler/in, der/die mit dem Fach gut zurechtkommt.",
        "- Geht gezielt in höhere Anforderungsbereiche (AFB II/III).",
        "- Fachausdrücke dürfen genutzt werden — beim ersten Auftreten trotzdem kurz erklären.",
        "- Sprache darf etwas dichter und anspruchsvoller sein, bleibt aber direkt und konkret (keine Metaphern).",
        "",
        "Ausgabeformat (genau so liefern):",
        "### Allgemeine Tonalität in diesem Fach",
        "<3–6 Sätze, fertig formuliert, fach-/jahrgangsspezifisch>",
        "",
        "### Minimalist (<Fach>)",
        "<fertige Konkretisierung>",
        "",
        "### Pragmatiker (<Fach>)",
        "<fertige Konkretisierung>",
        "",
        "### Ehrgeizig (<Fach>)",
        "<fertige Konkretisierung>",
        "",
        "### Passioniert (<Fach>)",
        "<fertige Konkretisierung>",
        "",
        "Wichtig: KEINE Platzhalter wie '<hier eintragen>' und keine Rückfragen an die Lehrkraft. Du gibst den vollständigen, einsatzbereiten Persona-Text aus.",
      ].join('\n'),
    sort_order: 45,
  },
  {
    kategorie: 'global',
    schluessel: 'global_leere_aktivitaeten',
    anzeigename: 'Konvention: Leere Aktivitäten = KI-Auftrag',
    prompt_text: [
      "Wichtige Konvention zum Umgang mit leeren Aktivitäten und leeren Master-Aufgaben:",
      "",
      "Wenn eine Aktivität (z. B. Lückentext, Miniquiz, Begriffspaare, Erklärtext, Sortieraufgabe) im Erstellungspaket OHNE konkrete Inhalte ankommt — also der Aktivitätstyp ist gesetzt, aber die Felder (`field_values`) sind leer bzw. die Master-Aufgaben enthalten keine ausformulierten Inhalte —, dann ist das KEIN Datenfehler und KEIN Hinweis darauf, etwas zu verweigern.",
      "",
      "Es ist ein expliziter Auftrag der Lehrkraft an dich: 'An dieser Stelle soll diese Art von Aktivität entstehen — bitte erstelle den fachlich passenden Inhalt selbstständig nach bestem Wissen und Gewissen.'",
      "",
      "Grundlage für deine Ausarbeitung sind:",
      "- die Lernziele des umgebenden Lernpakets,",
      "- der Titel und die Gesamtziele der Einheit,",
      "- die Lernlandkarte (Themenfelder + benachbarte Lernpakete),",
      "- die Fachliche Persona (Tonalität, Fachsprache, Operatoren),",
      "- die Bearbeitungsregel des aktuellen Lerntyps (Sektor-Anweisung).",
      "",
      "Formuliere die Inhalte fachlich sauber, altersgerecht und passend zum Aktivitätstyp aus. Frage NICHT nach. Verweigere NICHT mit Verweis auf eine 'Fallback-Directive'. Setze KEINE Platzhalter wie 'Aufgabe noch nicht ausgearbeitet' — das gilt nur für AllgemeineAufgaben (Ebene 2/3), die explizit als unfertig markiert sind, nicht für leere Aktivitäten in Lernpaketen.",
      "",
      "Abgrenzung: Ein komplett leeres Lernpaket (keine Lernziele UND keine Aktivitäten) wird im Pool-Manager bereits per Pre-Flight-Check geblockt und erreicht dich gar nicht erst. Wenn ein Lernpaket dich erreicht, hat es mindestens Lernziele oder Aktivitäten — oder beides.",
    ].join('\n'),
    sort_order: 50,
  },
  // ── AP2 / MBK-Integration §2.1: Globale Steuerungsregeln, die in jedem
  //    C-Global-Payload an die MBK eingewoben werden. Editierbar im
  //    Prompt-Manager — die hier hinterlegten Texte sind der Default-Stand
  //    für eine frische Schul-Installation.
  {
    kategorie: 'global',
    schluessel: 'operatoren_liste',
    anzeigename: 'Operatoren-Liste pro Lerntyp',
    prompt_text: [
      'Erlaubte Operator-Verben pro Lerntyp (Anforderungsbereich AFB I–III). Beim Formulieren von Aufgabenstellungen IMMER aus dieser Liste wählen — keine Synonyme erfinden, keine Operatoren mischen.',
      '',
      '| Lerntyp      | AFB I (Reproduktion) | AFB II (Reorganisation) | AFB III (Transfer/Reflexion) |',
      '|--------------|----------------------|-------------------------|------------------------------|',
      '| Minimalist   | nenne, benenne, gib an, zeige | (selten) beschreibe | — |',
      '| Pragmatiker  | nenne, beschreibe, gib an | erkläre, ordne zu, vergleiche | (selten) begründe |',
      '| Ehrgeizig    | beschreibe, erkläre | vergleiche, untersuche, ordne ein | begründe, beurteile |',
      '| Passioniert  | erkläre | analysiere, untersuche, vergleiche | beurteile, bewerte, entwickle, diskutiere |',
      '',
      'Wichtig: Beachte zusätzlich die fachspezifischen Operatoren aus der Fachlichen Persona — diese gehen vor, wenn ein Fach (z. B. Deutsch: "interpretiere") eigene Operatoren definiert.',
    ].join('\n'),
    sort_order: 60,
  },
  {
    kategorie: 'global',
    schluessel: 'wortlimit_regeln',
    anzeigename: 'Wortlimit-Regeln pro Lerntyp',
    prompt_text: [
      'Maximale Textlängen für die von dir erzeugten Inhalte. Halte sie strikt ein — Überlänge ist im Sinne der Lerntyp-Differenzierung schädlich.',
      '',
      '**Aufgabenstellungen (Frage-/Anweisungstext):**',
      '- Minimalist: max. 25 Wörter pro Aufgabe.',
      '- Pragmatiker: max. 50 Wörter pro Aufgabe.',
      '- Ehrgeizig: max. 80 Wörter pro Aufgabe.',
      '- Passioniert: max. 120 Wörter pro Aufgabe.',
      '',
      '**Erklärtexte / Inputs (z. B. Einführung in ein Lernpaket):**',
      '- Minimalist: max. 80 Wörter.',
      '- Pragmatiker: max. 150 Wörter.',
      '- Ehrgeizig: max. 250 Wörter.',
      '- Passioniert: max. 400 Wörter.',
      '',
      '**Feedback-Texte (auf Schülerantworten):**',
      '- Alle Lerntypen: max. 60 Wörter pro Feedback. Kürzer ist besser.',
      '',
      'Wenn ein konkreter Aufgabentyp im Erstellungspaket eine eigene Wortzahl vorgibt, gilt diese vor den hier genannten Werten.',
    ].join('\n'),
    sort_order: 70,
  },
  {
    kategorie: 'global',
    schluessel: 'guardrail_feedback',
    anzeigename: 'Feedback-Guardrails (Umgang mit Schülerfehlern)',
    prompt_text: [
      'Regeln für KI-Feedback auf Schülerantworten — gelten für alle Brian-Dialoge, Tutor-Antworten und automatische Hinweise.',
      '',
      '**Tonalität (immer):**',
      '- Niemals demütigend, sarkastisch oder besserwisserisch.',
      '- Anerkenne immer zuerst, was der Schüler bereits richtig gemacht oder versucht hat.',
      '- Du-Anrede, freundlich, ermutigend.',
      '',
      '**Eskalationsstufen bei falschen Antworten (in dieser Reihenfolge):**',
      '1. Hinweis 1: Frage zurück, statt direkt zu korrigieren ("Was meinst du, woran könnte das liegen?").',
      '2. Hinweis 2: Gib einen konkreten Tipp auf den richtigen Lösungsweg, ohne die Lösung zu nennen.',
      '3. Hinweis 3: Nenne ein Teil-Ergebnis oder eine Zwischenformel.',
      '4. Lösung: Erst nach drei Fehlversuchen oder auf explizite Bitte des Schülers.',
      '',
      '**Verboten:**',
      '- Lange theoretische Exkurse, wenn der Schüler nur einen Tippfehler hatte.',
      '- Mehrere Fehler in einer Antwort gleichzeitig adressieren — immer nur den wichtigsten.',
      '- Fachausdrücke einführen, die im aktuellen Lernpaket noch nicht behandelt wurden.',
      '',
      '**Bei Frustration des Schülers** (erkennbar an Reaktionen wie "ich kann das nicht", "egal"): Sofort auf Eskalationsstufe 3 wechseln, eine kleine Erfolgserfahrung anbieten und die Aufgabe ggf. herunterbrechen.',
    ].join('\n'),
    sort_order: 80,
  },
  // ── airgap-1.5.0: UI-Bausteine (Payload 0 / mbk_ui_config) ───────────────
  // Werden vom Air-Gap-Builder in Payload 0 (mbk_ui_config) ausgegeben und
  // tragen einen eigenen `ui_config_hash`. Die MBK kombiniert sie zur Laufzeit
  // mit den Inhalten aus Payload 3/4 (siehe injection_points).
  // Default-Design: helle, schülerorientierte App-Optik mit Card-System,
  // weichen Schatten und farbigen Lerntyp-Akzenten (Vorgabe Didaktik-Team).
  {
    kategorie: 'global',
    schluessel: 'ui_css_variables',
    anzeigename: 'UI: CSS-Variablen (Inline-<style> in jeder HTML)',
    prompt_text: [
      ':root {',
      '  /* Farbpalette */',
      '  --mbk-bg-color: #f4f7f6;',
      '  --mbk-card-bg: #ffffff;',
      '  --mbk-text-main: #2d3748;',
      '  --mbk-text-muted: #718096;',
      '  --mbk-primary: #4299e1;',
      '  --mbk-primary-hover: #3182ce;',
      '',
      '  /* Pfad-Farben für Akzente */',
      '  --mbk-accent-min: #0056b3;',
      '  --mbk-accent-prag: #28a745;',
      '  --mbk-accent-ehr: #ffc107;',
      '  --mbk-accent-pass: #dc3545;',
      '',
      '  /* Struktur & UI */',
      '  --mbk-radius: 12px;',
      '  --mbk-radius-sm: 8px;',
      '  --mbk-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);',
      '  --mbk-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
      '}',
      '',
      'body {',
      '  background-color: var(--mbk-bg-color);',
      '  color: var(--mbk-text-main);',
      '  font-family: var(--mbk-font-family);',
      '  line-height: 1.6;',
      '  margin: 0;',
      '  padding: 20px;',
      '  -webkit-font-smoothing: antialiased;',
      '}',
      '',
      '.mbk-container {',
      '  max-width: 800px;',
      '  margin: 0 auto;',
      '}',
      '',
      '/* Karten-Design für Sektoren und Aufgaben */',
      '.mbk-card {',
      '  background: var(--mbk-card-bg);',
      '  border-radius: var(--mbk-radius);',
      '  box-shadow: var(--mbk-shadow);',
      '  padding: 20px;',
      '  margin-bottom: 16px;',
      '  border: 1px solid #e2e8f0;',
      '  transition: transform 0.2s ease, box-shadow 0.2s ease;',
      '}',
      '',
      '.mbk-card:hover {',
      '  transform: translateY(-2px);',
      '  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);',
      '}',
      '',
      '/* Sektor-Trenner */',
      '.mbk-sektor-title {',
      '  font-size: 1.2em;',
      '  font-weight: 700;',
      '  color: var(--mbk-text-muted);',
      '  margin: 30px 0 15px 5px;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.05em;',
      '}',
      '',
      '/* Badges (z.B. für "System", "Aufgabe") */',
      '.mbk-badge {',
      '  font-size: 0.75em;',
      '  padding: 4px 10px;',
      '  border-radius: 20px;',
      '  background: #edf2f7;',
      '  color: var(--mbk-text-muted);',
      '  font-weight: 600;',
      '  margin-bottom: 8px;',
      '  display: inline-block;',
      '}',
      '',
      '/* Navigation & Tabs */',
      '.mbk-tabs {',
      '  display: flex;',
      '  gap: 8px;',
      '  margin-bottom: 30px;',
      '  background: var(--mbk-card-bg);',
      '  padding: 10px;',
      '  border-radius: var(--mbk-radius);',
      '  box-shadow: var(--mbk-shadow);',
      '  overflow-x: auto;',
      '}',
      '',
      '.mbk-tab {',
      '  padding: 10px 16px;',
      '  text-decoration: none;',
      '  font-weight: 600;',
      '  border-radius: var(--mbk-radius-sm);',
      '  color: var(--mbk-text-muted);',
      '  transition: all 0.2s;',
      '  white-space: nowrap;',
      '}',
      '',
      '.mbk-tab:hover {',
      '  background: #edf2f7;',
      '  color: var(--mbk-text-main);',
      '}',
      '',
      '/* Die aktive Klasse muss beim Generieren des jeweiligen Dashboards gesetzt werden */',
      '.mbk-tab.active-min { background: var(--mbk-accent-min); color: white; }',
      '.mbk-tab.active-prag { background: var(--mbk-accent-prag); color: white; }',
      '.mbk-tab.active-ehr { background: var(--mbk-accent-ehr); color: white; }',
      '.mbk-tab.active-pass { background: var(--mbk-accent-pass); color: white; }',
      '',
      '/* Zurück-Buttons im Header */',
      '.mbk-header {',
      '  margin-bottom: 30px;',
      '  padding-bottom: 20px;',
      '  border-bottom: 2px solid #e2e8f0;',
      '}',
      '',
      '.mbk-btn-back {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  background-color: transparent;',
      '  color: var(--mbk-primary);',
      '  text-decoration: none;',
      '  font-weight: 600;',
      '  padding: 8px 12px;',
      '  margin-right: 10px;',
      '  margin-bottom: 15px;',
      '  border-radius: var(--mbk-radius-sm);',
      '  border: 1px solid var(--mbk-primary);',
      '  transition: all 0.2s;',
      '}',
      '',
      '.mbk-btn-back:hover {',
      '  background-color: var(--mbk-primary);',
      '  color: white;',
      '}',
    ].join('\n'),
    sort_order: 200,
  },
  {
    kategorie: 'global',
    schluessel: 'ui_tab_bar_html',
    anzeigename: 'UI: Tab-Bar (Dashboard-Hopping zwischen den 4 Lerntypen)',
    prompt_text: [
      '<nav class="mbk-tabs">',
      '  <a href="dashboard-minimalist.html" class="mbk-tab">Minimalist</a>',
      '  <a href="dashboard-pragmatiker.html" class="mbk-tab">Pragmatiker</a>',
      '  <a href="dashboard-ehrgeizig.html" class="mbk-tab">Ehrgeizig</a>',
      '  <a href="dashboard-passioniert.html" class="mbk-tab">Passioniert</a>',
      '</nav>',
    ].join('\n'),
    sort_order: 210,
  },
  {
    kategorie: 'global',
    schluessel: 'ui_default_header_html',
    anzeigename: 'UI: Default-Header (Zurück-Buttons + Titel auf Aufgaben/Bausteinen)',
    prompt_text: [
      '<div class="mbk-header">',
      '  <div class="mbk-back-links">',
      '    {{back_targets}}',
      '  </div>',
      '  <h1 style="margin-top: 10px;">{{title}}</h1>',
      '</div>',
    ].join('\n'),
    sort_order: 220,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_einfuehrung',
    anzeigename: 'Systembaustein: Einführung in die Einheit',
    prompt_text:
      'Erstelle für diesen Baustein einen motivierenden Problemaufriss für den Start der Einheit. Fasse in maximal 150 Wörtern zusammen, worum es geht und warum das Thema für die Lebenswelt der Schüler relevant ist. Formuliere am Ende eine spannende Leitfrage, die im Laufe der Einheit beantwortet wird. Formatiere dies als ansprechenden Text für ein Moodle-Textfeld.',
    sort_order: 100,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_einstiegsdiagnose',
    anzeigename: 'Systembaustein: Einstiegsdiagnose',
    prompt_text:
      'Erstelle für diesen Baustein die Struktur für ein Moodle-Quiz zur Überprüfung des Vorwissens. Generiere 4 einfache Multiple-Choice-Fragen zum Thema. Wichtig: Betone im Einleitungstext, dass dieses Quiz nicht benotet wird, sondern nur der Orientierung dient. Formuliere ein freundliches Feedback für das Ende des Tests, das Schülern bei niedriger Punktzahl rät, stressfrei mit den Grundlagen-Lernpaketen zu starten.',
    sort_order: 110,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_lernlandkarte',
    anzeigename: 'Systembaustein: Lernlandkarte',
    prompt_text:
      "Erstelle für diesen Baustein eine strukturierte 'Lernlandkarte'. Liste die kommenden Themenfelder der Einheit stichpunktartig als Markdown-Liste auf. Schreibe zu jedem Themenfeld einen kurzen, einladenden Teaser-Satz (max. 15 Wörter), was die Schüler dort konkret lernen oder tun werden. Ziel ist absolute Transparenz über den Lernweg.",
    sort_order: 120,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_lernpaketebuendel',
    anzeigename: 'Systembaustein: Lernpaketebündel',
    prompt_text:
      'Dieser Baustein bündelt thematisch verwandte Lernpakete. Erstelle einen kurzen, überleitenden Einleitungstext. Erkläre den Schülern kurz und motivierend, wie die folgenden Pakete inhaltlich zusammenhängen und warum sie in dieser Kombination wichtig für das Verständnis des Themas sind.',
    sort_order: 130,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_freiwillige_uebung',
    anzeigename: 'Systembaustein: Freiwillige Übung',
    prompt_text:
      'Generiere für diesen Baustein einen unbenoteten Übungsblock (z.B. für ein Moodle H5P-Element). Erstelle 4 abwechslungsreiche Übungsfragen (z.B. Lückentext-Vorgaben oder Wahr/Falsch-Aussagen) passend zum vorherigen Lernpaket. Betone im Einleitungstext explizit, dass dies ein geschützter Raum zum Ausprobieren und Fehlermachen ist.',
    sort_order: 140,
  },
  {
    kategorie: 'systembaustein',
    schluessel: 'sys_abschlussreflexion',
    anzeigename: 'Systembaustein: Abschlussreflexion (Exit-Ticket)',
    prompt_text:
      "Erstelle für diesen Baustein den Text für eine abschließende Moodle-Umfrage ('Exit-Ticket'). Formuliere eine herzliche Verabschiedung aus der Einheit. Stelle 3 Reflexionsfragen: 1. Was hast du in dieser Einheit besonders gut verstanden? 2. Wobei bist du dir noch unsicher oder was fiel dir schwer? 3. Wie bewertest du die Aufgabenformate? Bedanke dich für den Einsatz.",
    sort_order: 150,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Autorisierung: Plattform-Admin (user.role==='admin') ODER App-Rolle
    // Administrator/Moodle-Designer aus dem Benutzer-Profil. Plattform-Admins
    // dürfen den Seed auch ohne Benutzer-Eintrag ausführen — analog zum
    // Muster in seedSystemBausteine.
    let darfSeeden = user.role === 'admin';
    if (!darfSeeden) {
      const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
      const rolle = profil?.rolle;
      darfSeeden = rolle === ROLLE_ADMIN || rolle === ROLLE_MOODLE;
    }
    if (!darfSeeden) {
      console.log('[seedMBKGlobalPrompts] DENY', { email: user.email, platformRole: user.role });
      return Response.json(
        {
          error: 'Forbidden: Nur Administrator oder Moodle-Designer dürfen den Seed ausführen.',
          debug: { platformRole: user.role || null, email: user.email },
        },
        { status: 403 }
      );
    }

    const existing = await base44.asServiceRole.entities.MBKGlobalPrompt.list();
    const bySchluessel = new Map((existing || []).map((p) => [p.schluessel, p]));

    let created = 0;
    let skipped = 0;
    for (const seed of SEED) {
      if (bySchluessel.has(seed.schluessel)) {
        skipped += 1;
        continue;
      }
      await base44.asServiceRole.entities.MBKGlobalPrompt.create({
        ...seed,
        ist_aktiv: true,
      });
      created += 1;
    }

    return Response.json({ ok: true, created, skipped });
  } catch (error) {
    console.error('[seedMBKGlobalPrompts]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});