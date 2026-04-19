/**
 * docsContent.js
 * Zentraler Markdown-Content für das Dokumentationssystem.
 */

export const DOC_GROUPS = [
  {
    label: 'Grundlagen',
    items: [
      { slug: 'erste-schritte', label: 'Erste Schritte' },
      { slug: 'einheiten-struktur', label: 'Einheiten & Struktur' },
      { slug: 'lernziele', label: 'Lernziele' },
      { slug: 'materialien-medien', label: 'Materialien & Medien' },
    ],
  },
  {
    label: 'Aufgaben & KI',
    items: [
      { slug: 'ebene-1-basismodule', label: 'Ebene 1: Basismodule' },
      { slug: 'ebene-2-allgemeine-aufgaben', label: 'Ebene 2: Allgemeine Aufgaben' },
      { slug: 'ebene-3-projektaufgaben', label: 'Ebene 3: Projektaufgaben' },
      { slug: 'ki-tutor-brian', label: 'KI-Tutor Brian.study' },
    ],
  },
  {
    label: 'Workflows & Verwaltung',
    items: [
      { slug: 'freigabe-qualitaetssicherung', label: 'Freigabe & Qualitätssicherung' },
      { slug: 'kollaboration-sperren', label: 'Kollaboration & Sperren' },
      { slug: 'export-workflow', label: 'Export-Workflow' },
    ],
  },
  {
    label: 'System',
    items: [
      { slug: 'administration', label: 'Administration' },
      { slug: 'erste-hilfe-faq', label: 'Erste Hilfe / FAQ' },
    ],
  },
];

// Flache Liste aller Items für Prev/Next-Navigation
export const DOC_NAV = DOC_GROUPS.flatMap(g => g.items);

export const DOC_CONTENT = {

  'erste-schritte': `# Erste Schritte

Willkommen im Pool-Manager! Diese Seite gibt Ihnen einen schnellen Einstieg in die wichtigsten Konzepte und zeigt, wie Sie in wenigen Schritten Ihre erste Unterrichtseinheit anlegen.

## Übersicht

* **Einheit anlegen** – Starten Sie mit Fach, Jahrgangsstufe und einem Titel
* **Struktur aufbauen** – Themenfelder und Lernpakete gliedern den Inhalt
* **Aufgaben erstellen** – Drei Ebenen von Basis bis Projekt
* **Exportieren** – Fertige Inhalte nach Moodle und Brian.study übertragen

## Benutzerrollen

| Rolle | Rechte |
|-------|--------|
| Administrator | Vollzugriff, Benutzerverwaltung |
| Fachschaftsleitung | Einheiten erstellen & freigeben |
| Fachlehrkraft | Inhalte bearbeiten |
| Moodle-Designer | Export-Cockpit bedienen |
| Betrachter | Nur lesen |

## Erster Login

Nach der Einladung per E-Mail erhalten Sie Zugang zum System. Beim ersten Login sollten Sie Ihr Profil unter *Benutzerverwaltung* vervollständigen und Ihre Fachzuständigkeiten hinterlegen.
`,

  'einheiten-struktur': `# Einheiten & Struktur

Eine **Einheit** ist das zentrale Organisationselement im Pool-Manager. Sie bündelt alle Inhalte zu einem Unterrichtsthema – von Lernzielen über Aufgaben bis hin zu Exportpaketen.

## Übersicht

* Eine Einheit gehört zu einem **Fach** und einer **Jahrgangsstufe**
* Sie wird über einen **Wizard** angelegt (Stammdaten → Ziele → Struktur)
* Der **Status** steuert die Sichtbarkeit (Entwurf vs. Aktiv)

## Hierarchie

\`\`\`
Einheit
└── Themenfeld
    └── Lernpaket
        ├── Lernziele
        └── Aufgabenbausteine
\`\`\`

## Themenfelder

Themenfelder gliedern eine Einheit in inhaltliche Bereiche (z.B. "Textanalyse", "Grammatik"). Jedes Themenfeld kann einen **Bearbeitungsmodus** haben:

* **offen** – Lernende können alle Pakete in beliebiger Reihenfolge bearbeiten
* **sequenziell** – Pakete müssen der Reihe nach absolviert werden

## Lernpakete

Lernpakete sind die kleinste inhaltliche Einheit. Sie enthalten Aktivitäten in drei Phasen: **Input**, **Übung** und **Abschluss**.
`,

  'lernziele': `# Lernziele

Lernziele beschreiben, was Schülerinnen und Schüler nach dem Durcharbeiten eines Lernpakets können oder wissen sollen. Sie sind das Bindeglied zwischen Inhalten und Aufgaben.

## Übersicht

* Lernziele werden in der **Ich-kann-Form** formuliert
* Jedes Lernziel gehört zu genau einem **Lernpaket**
* Es gibt zwei Kategorien: **Fachwissen** und **Fähigkeit/Fertigkeit**

## Formulierungshinweise

Gute Lernziele sind:

* **konkret** – messbar und überprüfbar
* **kompetenzorientiert** – beschreiben eine Handlung, kein Wissen
* **schülergerecht** – verständlich ohne Fachsprache

Beispiel: *Ich kann die drei Hauptursachen des Ersten Weltkriegs benennen und erklären.*

## Schülergerechte Übersetzung

Zu jedem Lernziel kann eine vereinfachte Version für die **Lernlandkarte** hinterlegt werden, die direkt für Schüler sichtbar ist.

## Prioritäten in Projektaufgaben

Im Tab "Lernlandkarte" bei Projektaufgaben können Lernziele als **hochpriorisiert (★)** markiert werden, um den Fokus für die Bearbeitung zu setzen.
`,

  'materialien-medien': `# Materialien & Medien

Aufgaben und Aktivitäten können mit verschiedenen Materialtypen angereichert werden – von Texten über Bilder bis hin zu PDFs und Buchverweisen.

## Übersicht

* Materialien können direkt **hochgeladen** oder als **Link/Verweis** hinterlegt werden
* Jede Aufgabe unterstützt mehrere Materialien gleichzeitig
* Bilder werden als Vorschau, PDFs als eingebettete Ansicht dargestellt

## Unterstützte Typen

| Typ | Beschreibung |
|-----|-------------|
| PDF | Dokument-Upload, wird eingebettet angezeigt |
| Bild | Foto oder Screenshot, wird als Vorschau gezeigt |
| Buchverweis | Textangabe (z.B. "Lehrbuch S. 42–45") |
| Freitext | Ergänzender Informationstext |

## Aufgabenbilder

Bei allgemeinen Aufgaben kann statt oder zusätzlich zur Aufgabenstellung ein **Bild hochgeladen** werden (z.B. ein Foto der Tafelaufschrift oder ein Arbeitsblatt-Scan).

## Hinweise zur Dateigröße

Für eine optimale Performance empfehlen wir:

* Bilder: max. 2 MB (JPG oder PNG)
* PDFs: max. 10 MB
* Keine eingebetteten Videos – stattdessen Links verwenden
`,

  'ebene-1-basismodule': `# Ebene 1: Basismodule

Basismodule bilden das Fundament jeder Unterrichtseinheit. Sie enthalten Lernpakete mit Aufgabenbausteinen auf der ersten Anforderungsebene.

## Übersicht

* Basismodule sind **wiederverwendbar** über verschiedene Einheiten
* Sie bestehen aus **Aufgabenbausteinen** verschiedener Typen
* Die KI kann Bausteine automatisch **klonen und variieren** (Serien-Generator)

## Aufgabenbausteine-Typen

* **Pre-Test** – Vorwissen aktivieren
* **Input / Erklärung** – Neuen Stoff einführen
* **Infoseite / Cheat-Sheet** – Nachschlageblatt
* **Ebene-1-Übung** – Grundlegende Anwendung
* **Drill-Übung** – Wiederholung zur Automatisierung
* **Exit-Check** – Lernzielkontrolle am Ende
* **Musterl ösung** – Referenzlösung für Schüler

## Opt-out

Einzelne Bausteine können mit einer **Begründung** als "bewusst ausgelassen" markiert werden. Sie zählen dann als vollständig, ohne dass Inhalte eingefügt werden müssen.

## KI-Serien-Generator

Über den Serien-Generator können aus einer Master-Aufgabe automatisch mehrere variierte Klone erstellt werden – ideal für differenzierte Übungsserien.
`,

  'ebene-2-allgemeine-aufgaben': `# Ebene 2: Allgemeine Aufgaben

Allgemeine Aufgaben sind transferorientierte Aufgaben, die Kompetenzen aus einem oder mehreren Lernpaketen verknüpfen und anwenden.

## Übersicht

* Aufgaben können als **Bild oder Text** hinterlegt werden
* Jede Aufgabe erhält einen **Schwierigkeitsgrad** (1–3 Sterne)
* Der **Erwartungshorizont** steuert die KI-Tutor-Konfiguration

## Kompetenzanbindung

Über das Tab "Kompetenzzuordnung" werden Lernziele aus Lernpaketen mit der Aufgabe verknüpft. Diese Zuordnung:

* erscheint in der **Lernlandkarte**
* steuert, welche Ziele der KI-Tutor berücksichtigt
* ermöglicht hochpriorisierte Markierungen (★)

## Erwartungshorizont

Der Erwartungshorizont beschreibt, was eine vollständige und korrekte Lösung beinhaltet. Er wird für die KI-Generierung benötigt und sollte folgende Punkte umfassen:

* Fachliche Kerninhalte
* Erwartete Argumentation oder Struktur
* Bewertungshinweise

## KI-Aufgaben-Assistent

Mit dem "KI entwerfen"-Button kann aus einer kurzen Idee automatisch eine vollständige Aufgabe mit Titel und Aufgabenstellung generiert werden.
`,

  'ebene-3-projektaufgaben': `# Ebene 3: Projektaufgaben

Projektaufgaben sind komplexe, offene Aufgaben auf der höchsten Anforderungsebene. Sie ersetzen den klassischen Erwartungshorizont durch Gütekriterien und Bewertungsrubriken.

## Übersicht

* Unterscheidung zwischen **Anwendungsaufgaben** und **Projektaufgaben**
* Keine Musterlösung – stattdessen **Abgabeformat & Rubriken**
* Vollständige Integration mit dem **KI-Tutor Brian.study**

## Aufgabentypen

| Typ | Beschreibung |
|-----|-------------|
| Anwendungsaufgabe | Gelerntes auf neue Situation anwenden |
| Projektaufgabe | Längerfristiges, produktionsorientiertes Vorhaben |

## Abgabeformate

Wählen Sie aus vordefinierten Formaten (Präsentation, Essay, Tabelle…) oder definieren Sie ein eigenes Format. Das Format beeinflusst die KI-generierten Gütekriterien.

## Bewertungsrubriken

Jede Rubrik enthält:

* **Titel** (z.B. "Argumentation", "Struktur")
* **Punkte** – Gewichtung im Gesamtbild
* **Kriterienbeschreibung** – Was wird konkret erwartet?

Rubriken werden direkt in den Brian.study-Export übertragen.
`,

  'ki-tutor-brian': `# KI-Tutor Brian.study

Brian.study ist eine KI-gestützte Lernplattform, die als interaktiver Tutor für Schüler fungiert. Der Pool-Manager generiert alle notwendigen Konfigurationsfelder automatisch.

## Übersicht

* Alle Aufgaben (Ebene 2 & 3) können für Brian.study konfiguriert werden
* Die KI generiert alle **fünf Prompt-Segmente** auf Knopfdruck
* Felder können manuell nachbearbeitet werden

## Die fünf Segmente

1. **Dialogname** – max. 60 Zeichen, wird als Titel im Tutor angezeigt
2. **Anweisung für Lernende** – sichtbar für Schüler, klare Du-Form
3. **System-Anweisung** – Tutor-Persona & Scaffolding (nur intern)
4. **Abbruchbedingung** – Wann gilt die Aufgabe als abgeschlossen?
5. **Bewertungsrubriken** – Strukturieren das Abschluss-Feedback

## Generierung

Klicken Sie auf "Alle Felder generieren" im Tab "KI-Tutor Prompt". Die KI berücksichtigt:

* Aufgabenstellung und Erwartungshorizont (Ebene 2) bzw. Rubriken (Ebene 3)
* Zugeordnete Lernziele
* Fach und Jahrgangsstufe der Einheit

## Export

Die generierten Felder werden im **Brian.study Export-Cockpit** (Tab 9) zusammengeführt und können von dort kopiert oder direkt synchronisiert werden.
`,

  'freigabe-qualitaetssicherung': `# Freigabe & Qualitätssicherung

Der Pool-Manager unterscheidet zwischen inhaltlicher Fertigstellung (Content-Status) und technischer Exportbereitschaft (Sync-Status).

## Übersicht

* Jede Aufgabe hat einen **Content-Status**: \`draft\` oder \`approved\`
* Nur freigegebene Aufgaben (\`approved\`) zählen als exportbereit
* Die Freigabe kann bei Bedarf wieder zurückgenommen werden

## Freigabe-Workflow

1. Aufgabe erstellen → Status: **Entwurf** (gelb)
2. Inhalte prüfen und vervollständigen
3. "Freigeben" klicken → Status: **Freigegeben** (grün)
4. Aufgabe erscheint im Export-Cockpit

## Freigabe aufheben

Eine freigegebene Aufgabe kann nur bearbeitet werden, wenn die Freigabe zuerst aufgehoben wird. Bei exportierten Aufgaben (\`synced\`) muss zusätzlich ein Re-Export geplant werden.

## Qualitätsprüfung

Vor der Freigabe empfehlen wir:

* Aufgabenstellung vollständig und verständlich?
* Erwartungshorizont oder Rubriken vorhanden?
* Materialien korrekt zugeordnet?
* KI-Tutor-Felder generiert und geprüft?
`,

  'kollaboration-sperren': `# Kollaboration & Sperren

Mehrere Lehrkräfte können gleichzeitig an einer Einheit arbeiten. Um Datenverlust zu verhindern, setzt das System automatische Bearbeitungssperren.

## Übersicht

* **Task-Lock** – Einzelne Aufgabe wird gesperrt sobald jemand "Bearbeiten" klickt
* **Structural Lock** – Die gesamte Einheitsstruktur wird gesperrt
* Sperren laufen nach **60 Minuten** automatisch ab

## Präsenz-Anzeige

Im Arbeitsbereich sehen Sie, welche Kollegen gerade online sind und an welcher Einheit sie arbeiten.

## Sperre übernehmen (Admin)

Wenn eine Sperre irrtümlich aktiv bleibt (z.B. Browser-Absturz), können Administratoren die Sperre über den **"Admin-Unlock"**-Button aufheben. Dieser erscheint nach 60 Minuten automatisch.

## Konflikte vermeiden

* Vor dem Bearbeiten: Prüfen Sie, ob jemand anderes die Aufgabe geöffnet hat
* Nach der Bearbeitung: Immer auf "Abbrechen" oder "Speichern" klicken, um die Sperre freizugeben
* Bei längerer Abwesenheit: Bearbeitungsmodus beenden
`,

  'export-workflow': `# Export-Workflow

Der Export überträgt fertige Inhalte aus dem Pool-Manager nach Moodle und Brian.study. Er erfolgt in koordinierten Schritten über das Export-Cockpit.

## Übersicht

* Zwei parallele Export-Kanäle: **Moodle** und **Brian.study**
* Ein **Dual-Lock** verhindert unkoordinierte Änderungen nach dem Export
* Der Sync-Status zeigt jederzeit den aktuellen Stand

## Sync-Status

| Status | Bedeutung |
|--------|-----------|
| \`new\` | Noch nie exportiert |
| \`pending\` | Export wurde beauftragt |
| \`synced\` | Erfolgreich übertragen |
| \`modified\` | Nach Export verändert – Re-Export nötig |
| \`error\` | Export fehlgeschlagen |

## Moodle-Export

1. Inhalte im Export-Cockpit prüfen
2. Export-Paket herunterladen oder direkt übertragen
3. Nach erfolgreicher Übertragung: Bestätigung im Cockpit

## Brian.study Export

1. KI-Tutor-Felder für alle Aufgaben generieren
2. Im Export-Cockpit Segmente kopieren oder synchronisieren
3. Dual-Lock nach Bestätigung beider Exports freigeben

## Dual-Lock

Sobald eine Aufgabe in beiden Systemen \`synced\` ist, wird die Bearbeitungssperre automatisch aufgehoben. Bei Bedarf können Admins den Lock manuell freigeben.
`,

  'administration': `# Administration

Der Admin-Bereich ist nur für Benutzer mit der Rolle "Administrator" zugänglich. Hier werden systemweite Einstellungen, Benutzer und Lookup-Daten verwaltet.

## Übersicht

* **Benutzerverwaltung** – Nutzer einladen, Rollen zuweisen
* **Lookup-Tabellen** – Fächer, Jahrgänge, Phasen konfigurieren
* **Wartungsmodus** – System vorübergehend sperren
* **Audit-Log** – Alle Aktionen nachverfolgen

## Benutzer einladen

Neue Nutzer werden per E-Mail eingeladen. Die Rolle wird bei der Einladung festgelegt und kann nachträglich geändert werden.

## Lookup-Tabellen

Folgende Lookup-Daten können angepasst werden:

* **Fächer** – Welche Fächer im System verfügbar sind
* **Jahrgangsstufen** – Verfügbare Jahrgänge
* **Zeitphasen** – Schuljahre/Halbjahre für die Planungsansicht
* **Baustein-Typen** – Typen für Aufgabenbausteine

## Wartungsmodus

Im Wartungsmodus können sich nur Administratoren anmelden. Alle anderen Nutzer sehen einen Hinweisbanner. Aktivieren Sie den Wartungsmodus vor größeren Systemupdates.

## Daten zurücksetzen

Im Admin-Bereich können Test- und Sandbox-Daten zurückgesetzt werden. **Achtung:** Diese Aktion ist nicht rückgängig zu machen.
`,

  'erste-hilfe-faq': `# Erste Hilfe / FAQ

Hier finden Sie Lösungen für die häufigsten Probleme im Pool-Manager.

## Häufige Fragen

* **Warum ist der "Bearbeiten"-Button grau?** Die Aufgabe ist entweder freigegeben (\`approved\`) oder wird gerade von jemand anderem bearbeitet. Prüfen Sie den Status in der Statusleiste oben.
* **Der Moodle-Export schlägt fehl.** Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind und der Content-Status auf \`approved\` steht.
* **Ich kann meine Änderungen nicht speichern.** Möglicherweise ist die Sitzung abgelaufen. Laden Sie die Seite neu und versuchen Sie es erneut.
* **Die KI generiert keinen Erwartungshorizont.** Für allgemeine Aufgaben (Ebene 2) muss ein Erwartungshorizont manuell hinterlegt sein, bevor die KI-Segmente generiert werden können.

## Bearbeitungssperren lösen

Wenn Sie eine Aufgabe nicht bearbeiten können, weil sie gesperrt ist:

1. Warten Sie, bis der andere Nutzer die Bearbeitung beendet
2. Nach 60 Minuten läuft die Sperre automatisch ab
3. Als Admin: Nutzen Sie "Admin-Unlock" für abgelaufene Sperren

## Support kontaktieren

Bei technischen Problemen wenden Sie sich an Ihren Systemadministrator. Für inhaltliche Fragen steht die Fachschaftsleitung zur Verfügung.
`,
};

export function getDocContent(slug) {
  return DOC_CONTENT[slug] || `# ${slug}\n\nDieser Artikel ist noch in Bearbeitung.`;
}