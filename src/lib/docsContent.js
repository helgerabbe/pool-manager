/**
 * docsContent.js
 * Statischer Markdown-Content für das Dokumentationssystem.
 * Später können diese durch echte .md-Dateien ersetzt werden.
 */

export const DOC_NAV = [
  { slug: 'einfuehrung', label: 'Einführung & Konzept' },
  { slug: 'ebene-1-basismodule', label: 'Ebene 1: Basismodule' },
  { slug: 'ebene-2-allgemeine-aufgaben', label: 'Ebene 2: Allgemeine Aufgaben' },
  { slug: 'ebene-3-projektaufgaben', label: 'Ebene 3: Projektaufgaben' },
  { slug: 'ki-tutor-brian', label: 'Der KI-Tutor: Brian.study' },
  { slug: 'export-workflow', label: 'Export-Workflow & Dual-Lock' },
];

export const DOC_CONTENT = {
  'einfuehrung': `# Einführung & Konzept

Willkommen in der Dokumentation des Lernplattform-Systems. Dieses System unterstützt Lehrkräfte dabei, strukturierte, differenzierte Unterrichtseinheiten zu planen und in Lernmanagementsysteme wie Moodle und Brian.study zu exportieren.

## Das Drei-Ebenen-Modell

Das Herzstück des Systems ist ein **dreistufiges Differenzierungsmodell**:

- **Ebene 1 – Basismodule:** Grundlegende Wissensvermittlung und Übungsaufgaben
- **Ebene 2 – Allgemeine Aufgaben:** Transferaufgaben mit Kompetenzanbindung
- **Ebene 3 – Projektaufgaben:** Komplexe Anwendungs- und Projektaufgaben mit KI-Tutor

## Workflow-Übersicht

1. Einheit anlegen (Fach, Jahrgang, Ziele)
2. Themenfelder und Lernpakete strukturieren
3. Lernziele pro Paket definieren
4. Aufgaben auf allen drei Ebenen erstellen
5. KI-Tutor-Prompts generieren (Brian.study)
6. Export nach Moodle und Brian.study
`,

  'ebene-1-basismodule': `# Ebene 1: Basismodule

Basismodule bilden das Fundament jeder Unterrichtseinheit. Sie enthalten **Lernpakete** mit zugehörigen **Lernzielen** und **Aufgabenbausteinen**.

## Struktur eines Lernpakets

Jedes Lernpaket besteht aus drei Phasen:

- **Input-Phase:** Wissensvermittlung (Videos, Texte, Erklärungen)
- **Übungsphase:** Anwendung und Festigung
- **Abschlussphase:** Exit-Check und Reflexion

## Lernziele formulieren

Lernziele werden in der Ich-kann-Form formuliert:

> *Ich kann die Ursachen des Ersten Weltkriegs in drei Kategorien einteilen.*

Zu jedem Lernziel gibt es eine **schülergerechte Übersetzung** für die Lernlandkarte.

## Aufgabenbausteine

Jeder Baustein ist einem Lernziel und einer Anforderungsebene zugeordnet. Folgende Typen stehen zur Verfügung:

- Pre-Test, Input/Erklärung, Ebene-1-Übung
- Ebene-2-Aufgabe, Ebene-3-Projekt
- Exit-Check, Musterl ösung
`,

  'ebene-2-allgemeine-aufgaben': `# Ebene 2: Allgemeine Aufgaben

Allgemeine Aufgaben sind **transferorientierte Aufgaben**, die Kompetenzen aus mehreren Lernpaketen verknüpfen.

## Aufgaben anlegen

Eine allgemeine Aufgabe besteht aus:

- **Aufgabenstellung** (Freitext oder Bild)
- **Schwierigkeitsgrad** (1–3 Sterne)
- **Erwartungshorizont** (Basis für den KI-Tutor)
- **Materialien** (PDFs, Bilder, Buchverweise)

## Kompetenzanbindung

Jede Aufgabe kann mit Lernzielen aus Lernpaketen verknüpft werden. Diese Zuordnung erscheint in der **Lernlandkarte** und steuert, welche Ziele als hochpriorisiert markiert werden.

## KI-Tutor Integration

Aus dem Erwartungshorizont generiert das System automatisch:

1. **Dialogname** – Titel des Brian-Dialogs
2. **Anweisung für Lernende** – sichtbar für Schüler
3. **System-Anweisung** – Tutor-Persona (intern)
4. **Abbruchbedingung** – wann ist der Dialog beendet?
`,

  'ebene-3-projektaufgaben': `# Ebene 3: Projektaufgaben

Projektaufgaben sind komplexe, offene Aufgaben auf der höchsten Anforderungsebene. Sie unterscheiden sich von allgemeinen Aufgaben durch:

- Kein klassischer Erwartungshorizont – stattdessen **Abgabe- & Gütekriterien**
- Explizite Definition der **Ergebnisform** (Präsentation, Essay, Schema…)
- **Bewertungsrubriken** für den KI-Tutor

## Aufgabentypen

| Typ | Beschreibung |
|-----|-------------|
| Anwendungsaufgabe | Anwendung gelernter Konzepte auf neue Situationen |
| Projektaufgabe | Längerfristiges, produktionsorientiertes Vorhaben |

## Gütekriterien & Rubriken

Die Gütekriterien definieren, was eine gute Abgabe ausmacht. Sie werden als **Bewertungsrubriken** in Brian.study übertragen und strukturieren das Abschluss-Feedback des KI-Tutors.

Jede Rubrik enthält:
- **Titel** (z.B. "Argumentation")
- **Punkte** (Gewichtung)
- **Kriterienbeschreibung** (was wird erwartet?)

## Lernlandkarte

Im Tab "Lernlandkarte" können Lernziele aus der gesamten Einheit als **hochpriorisiert** markiert werden. Diese Markierung erscheint in der Schüleransicht als ★.
`,

  'ki-tutor-brian': `# Der KI-Tutor: Brian.study

Brian.study ist eine KI-gestützte Lernplattform, die als interaktiver Tutor für Schüler fungiert. Die Integration erfolgt über strukturierte Prompt-Segmente.

## Die fünf Segmente

Jede Aufgabe benötigt fünf Konfigurationsfelder für Brian:

1. **Dialogname** – max. 60 Zeichen, wird als Titel angezeigt
2. **Anweisung für Lernende** – klare Aufgabenbeschreibung in der Du-Form
3. **System-Anweisung** – Tutor-Persona und Scaffolding-Verhalten (nicht sichtbar für Schüler)
4. **Abbruchbedingung** – wann gilt die Aufgabe als erfolgreich abgeschlossen?
5. **Bewertungsrubriken** – strukturieren das Abschluss-Feedback

## KI-Generierung

Alle Felder können per Klick auf "Alle Felder generieren" automatisch aus dem Aufgabeninhalt erstellt werden. Die KI berücksichtigt dabei:

- Aufgabenstellung und Erwartungshorizont
- Zugeordnete Lernziele
- Einheits-Metadaten (Fach, Jahrgang)

## Manuelles Nachbearbeiten

Alle generierten Felder können manuell bearbeitet werden. Änderungen werden beim Klick auf "Speichern" persistiert.

> **Hinweis:** Bei Projektaufgaben entfällt die Erwartungshorizont-Warnung – die Gütekriterien übernehmen diese Funktion.
`,

  'export-workflow': `# Export-Workflow & Dual-Lock

Das Exportsystem koordiniert die Veröffentlichung von Inhalten in **Moodle** und **Brian.study** über ein zweistufiges Sperrsystem.

## Sync-Status

Jede Aufgabe hat zwei unabhängige Sync-Stati:

| Status | Bedeutung |
|--------|-----------|
| \`new\` | Noch nie exportiert |
| \`pending\` | Export beauftragt, läuft |
| \`synced\` | Erfolgreich übertragen |
| \`modified\` | Nach Export verändert – Re-Export nötig |
| \`error\` | Export fehlgeschlagen |

## Dual-Lock Mechanismus

Um unkoordinierte Änderungen nach dem Export zu verhindern, sperrt das System Aufgaben sobald sie exportiert wurden:

1. Aufgabe wird bearbeitet → **Bearbeitungssperre** (locked_by)
2. Moodle-Export bestätigt → \`moodle_sync_status = synced\`
3. Brian-Export bestätigt → \`brian_sync_status = synced\`
4. Beide synced → **Sperre wird automatisch aufgehoben**

## Export-Cockpit

Im Export-Cockpit (Tab 9) können Admins und Moodle-Designer:

- Den Exportstatus aller Aufgaben einsehen
- Brian-Segmente kopieren
- Dual-Locks nach Bestätigung manuell aufheben
- Den Moodle-Bauplan als Druckansicht öffnen
`,
};

export function getDocContent(slug) {
  return DOC_CONTENT[slug] || `# ${slug}\n\nDieser Artikel ist noch in Bearbeitung.`;
}