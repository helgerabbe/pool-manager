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
      { slug: 'lernpakete-aktivitaeten', label: 'Lernpakete & Aktivitäten' },
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

  'erste-schritte': `# Erste Schritte: Systemübersicht & Rollen

Herzlich willkommen im Pool-Manager! Dieses System ist Ihr zentraler Arbeitsplatz, um modernen, KI-gestützten und kompetenzorientierten Unterricht zu planen.

Bevor Sie Ihre erste eigene Unterrichtseinheit anlegen, gibt Ihnen dieses Kapitel einen kurzen Überblick darüber, wie das System „tickt" und welche Rechte Sie in der App haben.

## Die Philosophie: Das Drei-Ebenen-Modell

Der Pool-Manager bietet Ihnen drei Anforderungsebenen, um Ihre Schüler bestmöglich zu fördern. Alles, was Sie hier bauen, ordnet sich in dieses Modell ein:

| Ebene | Bezeichnung | Was passiert hier? |
|-------|-------------|-------------------|
| **Ebene 1** | Basismodule | Das Fundament – Schüler trainieren Vokabeln, Formeln und grundlegendes Fachwissen. |
| **Ebene 2** | Allgemeine Aufgaben | Der Transfer – Schüler analysieren Texte oder werten Diagramme aus, begleitet durch den KI-Tutor. |
| **Ebene 3** | Projektaufgaben | Die Königsdisziplin – freie, kreative Aufgaben (z.B. Podcasts, Portfolios) mit maßgeschneiderten Bewertungsrubriken. |

> Wie Sie diese Ebenen strukturieren, erfahren Sie im nächsten Kapitel [Einheiten & Struktur](/docs/einheiten-struktur).

## Wer darf was? (Benutzerrollen)

Da oft ganze Schulen oder Fachschaften im Pool-Manager zusammenarbeiten, hat nicht jeder Nutzer dieselben Menüs und Buttons. Ihre Möglichkeiten hängen von Ihrer zugewiesenen Rolle ab:

| Rolle | Aufgabe |
|-------|---------|
| **Fachlehrkraft** | Einheiten erstellen, KI-Aufgaben generieren, Lernziele verknüpfen und Aufgaben für den Export freigeben. |
| **Fachschaftsleitung / Export-Team** | Qualitätssicherung und Zugriff auf das Freigabe-Cockpit – übertragen fertige Aufgaben nach Moodle und Brian.study. |
| **Betrachter** | Alle Einheiten und Aufgaben lesen, aber nichts bearbeiten oder löschen. Ideal für Referendare oder Vertretungskräfte. |
| **Moodle-Designer** | Technische Spezialrolle – organisiert die optische Strukturierung der exportierten Kurse in Moodle. |
| **Admin** | Systemverwaltung – verwaltet Benutzerkonten, lädt neue Kollegen ein und pflegt globale Listen (Fächer, Jahrgänge). |

## Der erste Schritt ins System

Wenn Sie sich das erste Mal einloggen, landen Sie auf Ihrem **Dashboard**.

* Auf der linken Seite finden Sie die Hauptnavigation.
* Unter dem Menüpunkt **„Einheiten"** finden Sie alle Unterrichtsvorhaben Ihrer Schule.

> **Tipp:** Trauen Sie sich ruhig, auf eine bestehende Einheit zu klicken! Solange Sie nicht aktiv auf den Button „Bearbeiten" drücken, befinden Sie sich im sicheren Lese-Modus und können in Ruhe sehen, wie Ihre Kollegen das System nutzen.
`,

  'einheiten-struktur': `# Einheiten & Struktur: Das Fundament

Bevor Sie einzelne Aufgaben oder Lernziele erstellen, benötigen Sie einen strukturierten Rahmen. Der Pool-Manager organisiert Ihren Unterricht in einer klaren Hierarchie – ähnlich wie ein gut aufgeräumter Aktenschrank.

## Die drei Ebenen der Organisation (Die Matroschka-Puppe)

Damit Schülerinnen und Schüler (und Sie als Lehrkraft!) nicht den Überblick verlieren, ist alles in drei ineinandergreifenden Ebenen organisiert:

| Ebene | Metapher | Beschreibung | Beispiel |
|-------|----------|-------------|---------|
| **Einheit** | 🗄️ Der Aktenschrank | Der größte Rahmen – ein großes Oberthema für einen bestimmten Jahrgang | „Geschichte, 9. Klasse: Der Erste Weltkrieg und die Weimarer Republik" |
| **Themenfeld** | 🗂️ Die Schublade | Unterteilt die Einheit in logische Abschnitte | TF 1: „Ursachen des 1. Weltkriegs", TF 2: „Kriegsverlauf" |
| **Lernpaket** | 📁 Die Aktenmappe | Enthält die konkreten Aufgaben, meist für 1–2 Unterrichtsstunden | „Das Attentat von Sarajevo" |

Als Strukturdiagramm:

\`\`\`
Einheit
└── Themenfeld
    └── Lernpaket
        ├── Lernziele
        └── Aufgabenbausteine (Ebene 1, 2, 3)
\`\`\`

## Eine neue Einheit anlegen (Der Wizard)

Wenn Sie auf „Neue Einheit" klicken, öffnet sich der **Einheiten-Wizard**. Dieser Assistent führt Sie Schritt für Schritt durch die Erstellung:

1. **Fach & Jahrgang** auswählen (die Listen pflegt Ihre Administration im Hintergrund)
2. **Titel** vergeben – klar und wiedererkennbar
3. **Gesamtziele** definieren: Was sollen die Schüler am Ende dieser Einheit grob verstanden haben?

> **Hinweis:** Die detaillierten „Ich-kann"-Lernziele kommen erst später, wenn Sie einzelne Lernpakete befüllen.

## Themenfelder anlegen

Themenfelder gliedern Ihre Einheit in inhaltliche Abschnitte. Jedes Themenfeld kann einen **Bearbeitungsmodus** haben:

* **offen** – Lernende können alle Pakete in beliebiger Reihenfolge bearbeiten
* **sequenziell** – Pakete müssen der Reihe nach absolviert werden

> **Tipp:** Der sequenzielle Modus empfiehlt sich, wenn die Lernpakete aufeinander aufbauen (z.B. erst Grundlagen, dann Vertiefung).
`,

  'lernpakete-aktivitaeten': `# Lernpakete & Aktivitäten: Der praktische Arbeitsbereich

Herzlichen Glückwunsch – Sie haben eine Einheit mit Themenfeldern erstellt! Jetzt wird es konkret: In diesem Kapitel erfahren Sie, wie Sie Lernpakete mit Leben füllen.

## Lernpakete anlegen

Ein Lernpaket ist die kleinste Planungseinheit – denken Sie an eine einzelne Unterrichtsstunde oder eine kleine Hausaufgabe.

**So legen Sie ein neues Lernpaket an:**

1. Öffnen Sie Ihre Einheit im **Workspace** (Arbeitsbereich)
2. Klicken Sie im gewünschten Themenfeld auf **„+ Lernpaket"**
3. Vergeben Sie einen Titel (z.B. „Das Attentat von Sarajevo")
4. Schätzen Sie die Bearbeitungsdauer (z.B. 45 Minuten)

> **Tipp:** Ein Lernpaket sollte idealerweise nicht mehr als 3-4 Aktivitäten enthalten, um die Schüler nicht zu überfordern.

## Die drei Lernphasen

Jedes Lernpaket ist automatisch in drei didaktische Phasen unterteilt:

| Phase | Wann nutzen? | Beispiele |
|-------|-------------|---------|
| **Input** | Zu Beginn eines Themas – Schüler erhalten Informationen | Erklärvideos, Fachtexte, Lehrwerk/Quelle, Podcasts, Infoseiten |
| **Übung** | Während der Erarbeitung – Schüler trainieren | Lückentexte, Begriffe zuordnen, Reihenfolge sortieren, Multiple Choice, Mini-Quizzes |
| **Abschluss** | Zum Thema-Abschluss – Kontrolle und Reflexion | Exit-Checks, Tests, Offene Aufgaben |

**Wichtig:** Sie müssen nicht alle drei Phasen befüllen! Ein Lernpaket kann auch nur aus einer Input-Phase bestehen (z.B. wenn Sie nur ein Video zur Verfügung stellen möchten).

## Aktivitäten aus dem Katalog

Der Pool-Manager bietet Ihnen einen vorgefertigten **Aktivitäten-Katalog** – das sind standardisierte Aufgabentypen, die sich bewährt haben.

### So fügen Sie eine Aktivität hinzu:

1. Klicken Sie in der gewünschten Phase auf **„+ Aktivität"**
2. Wählen Sie aus dem Katalog (z.B. „Lückentext", „Begriffe zuordnen", „Multiple Choice")
3. Füllen Sie die Felder aus (die genaue Anzahl hängt vom Aktivitätentyp ab)
4. Speichern Sie Ihre Eingabe

### Alle verfügbaren Aktivitätentypen

Der Pool-Manager bietet folgende Aktivitäten pro Phase:

#### **Input-Aktivitäten** (Zum Erarbeiten von Inhalten)

| Aktivität | Beschreibung | Einsatzgebiet |
|-----------|-------------|---------------|
| **Video anschauen** | Verknüpfung zu einem YouTube-Video oder ähnlich | Erklärvideo, Dokumentation |
| **Lehrwerk/Quelle** | Verweis auf ein Buch oder externe Ressource mit Kapitel-Angabe | Textbasiertes Lernen, Quellenarbeit |
| **Infoseite/Cheat-Sheet** | Kurze, strukturierte Übersichtsseite mit Fachwissen | Schnelle Informationen, Zusammenfassungen |
| **Podcast hören** | Link zu einem Podcast mit Anleitung | Auditive Inhalte, Vorträge |

#### **Übungs-Aktivitäten** (Zum Trainieren und Üben)

| Aktivität | Beschreibung | Einsatzgebiet |
|-----------|-------------|---------------|
| **Lückentext** | Schüler ergänzen fehlende Wörter in einem Text | Vokabeltraining, Fachbegriffe, Grammatik |
| **Begriffe zuordnen** | Paare matching (z.B. Datum ↔ Ereignis, Begriff ↔ Definition) | Zuordnungsaufgaben, Definitionen, Kontext |
| **Reihenfolge bilden** | Elemente chronologisch oder logisch sortieren | Zeitstrahlen, Prozessabläufe, Kausalitäten |
| **Multiple Choice** | Schüler wählen eine oder mehrere richtige Antworten | Wissensabfrage, Verständnis-Checks |
| **Mini-Quiz** | Kurze Frage-Antwort-Serie zur Wissenskontrolle | Schnelle Überprüfung, spielerisches Lernen |
| **Drill-Übung** | Wiederholte Übungen mit variierenden Beispielen | Vokabeln, Formeln, wiederkehrende Muster |

#### **Abschluss-Aktivitäten** (Zur Kontrolle und Reflexion)

| Aktivität | Beschreibung | Einsatzgebiet |
|-----------|-------------|---------------|
| **Test** | Formale Abschlussaufgabe mit Bewertung | Leistungsfeststellung, Abschlussprüfung |
| **Exit-Check** | Kurze Kontrollfrage – Schüler zeigen Verständnis auf | Schnelle Erfolgskontrolle |
| **Offene Aufgabe** | Schüler formulieren frei Gedanken oder Antworten | Reflexion, eigenständiges Schreiben, Transfer |

### Masteraufgaben-fähige Aktivitäten

Einige Aktivitäten können als **Mastervorlagen** verwendet werden, um automatisch Variationen zu generieren:

* ✅ **Lückentext** – KI erstellt Variationen mit anderen Wörtern
* ✅ **Begriffe zuordnen** – KI generiert neue Paare und Distraktoren
* ✅ **Reihenfolge bilden** – KI erstellt neue Reihenfolgen zum gleichen Thema
* ✅ **Multiple Choice** – KI generiert neue Fragen zum Lernziel
* ✅ **Mini-Quiz** – KI erstellt neue Fragen mit unterschiedlichen Formulierungen
* ✅ **KI-Tutor** – Mastervorlage für komplexe Aufgabenszenarien
* ✅ **Bildbeschriftung** – KI erstellt Variationen mit anderen Bildern
* ❌ **Video anschauen** – Keine Generierung (externe Quelle)
* ❌ **Lehrwerk/Quelle** – Keine Generierung (externe Quelle)
* ❌ **Infoseite** – Keine Generierung (statischer Inhalt)
* ❌ **Test** – Keine Generierung (formale Prüfung)
* ❌ **Offene Aufgabe** – Keine Generierung (ergebnisoffen)

## Phasen ein- und ausblenden

Sie können Phasen auch komplett deaktivieren, wenn Sie sie nicht benötigen:

* Nutzen Sie den **Switch** neben dem Phasen-Namen
* Deaktivierte Phasen werden für Schüler nicht angezeigt

> **Beispiel:** Wenn Sie nur einen Input (Video) bereitstellen möchten, deaktivieren Sie Übung und Abschluss. Das Lernpaket besteht dann nur aus der Input-Phase.

## Der Fortschrittsanzeiger

Jedes Lernpaket zeigt Ihnen den **Fertigstellungsgrad** an:

* 🟢 **Grün** = Alle Aktivitäten sind vollständig ausgefüllt
* 🟡 **Gelb** = Mindestens eine Aktivität ist unvollständig (fehlende Pflichtfelder)
* 🔴 **Rot** = Keine Aktivitäten zugeordnet

Klicken Sie auf eine Aktivität, um sie zu bearbeiten. Unvollständige Aktivitäten werden mit einem ⚠️-Symbol markiert.

## Navigation im Workspace

Der Workspace ist Ihr Hauptarbeitsbereich. So finden Sie sich zurecht:

| Bereich | Was sehen Sie? |
|---------|---------------|
| **Linke Sidebar** | Baumansicht: Einheit → Themenfelder → Lernpakete → Aktivitäten |
| **Hauptbereich** | Detailansicht des ausgewählten Elements |
| **Tab 3: Aufgaben erstellen** | Hier arbeiten Sie an Ebene-2- und Ebene-3-Aufgaben (Transfer & Projekte) |

> **Tipp:** Nutzen Sie die Suchfunktion in der Sidebar, um schnell zu einem bestimmten Lernpaket zu springen.
`,

  'lernziele': `# Lernziele & Kompetenzen: Der GPS-Tracker des Lernens

In einem guten Unterricht geht es nicht nur darum, „Stoff durchzunehmen", sondern bestimmte Kompetenzen zu erwerben. Im Pool-Manager sind Lernziele daher nicht einfach nur toter Text, sondern der Motor, der das System antreibt.

Sie helfen dem KI-Tutor Brian.study dabei, die Schwächen der Schüler zu erkennen, und sie bilden die Grundlage für die **Lernlandkarte** – eine Art GPS-Tracker für den Lernfortschritt der Schüler.

## Die „Ich-kann"-Formel

Wir verabschieden uns von sperrigen Lehrplan-Formulierungen. Im Pool-Manager werden Lernziele immer konsequent aus der Schülerperspektive formuliert:

| ❌ Statt | ✅ Besser |
|----------|----------|
| „Vermittlung der Ursachen des 1. Weltkriegs." | „Ich kann die drei Hauptursachen für den Ausbruch des 1. Weltkriegs benennen." |
| „Diagrammanalyse" | „Ich kann ein Diagramm korrekt auswerten und die wichtigsten Aussagen benennen." |

Nur so können Schüler später selbstständig abhaken, ob sie etwas wirklich verstanden haben oder noch üben müssen.

## Fachwissen vs. Fähigkeit

Wenn Sie ein neues Lernziel anlegen, fragt Sie das System nach der Kategorie:

| Kategorie | Was wird beschrieben? | Beispiel |
|-----------|----------------------|---------|
| **Fachwissen** | Faktenwissen, Formeln, Vokabeln, Daten | „Ich kenne den Aufbau einer Pflanzenzelle." |
| **Fähigkeit / Fertigkeit** | Handwerkszeug, Methoden, das „Wie" | „Ich kann eine Pro-Contra-Diskussion moderieren." |

> **Tipp:** Eine gute Einheit braucht immer eine gesunde Mischung aus beiden Kategorien!

## Die schülergerechte Übersetzung

Manchmal schreibt der offizielle Rahmenlehrplan Begriffe vor, die für Schüler nicht greifbar sind (z.B. „Multiperspektivische Quellenkritik"). Das System bietet daher ein Feld für die **schülergerechte Übersetzung**.

Was Sie dort eintragen, ist das, was die Schüler später in ihrer Lernlandkarte sehen:
*„Ich kann erkennen, ob der Autor eines Textes eine bestimmte Absicht verfolgt."*

## Das Mapping: Lernziele mit Aufgaben verknüpfen

Ein Lernziel bringt nichts, wenn es nicht geübt und geprüft wird. Daher werden Ziele im Pool-Manager fest an Aufgaben geknüpft:

* **Ebene 1 (Basismodule):** Jede Übungsaufgabe erhält ein direkt zugehöriges Lernziel. Das System weiß: *Diese Aufgabe trainiert exakt dieses Ziel.*
* **Ebene 2 & 3 (Transfer & Projekte):** In der Lernlandkarte (Tab 3) geben Sie an, welche Grundlagen-Ziele aus Ebene 1 für das Projekt zwingend vorausgesetzt werden.

### Warum ist das Mapping so wichtig?

Wenn ein Schüler bei einer Projektaufgabe (Ebene 3) scheitert, schaut Brian.study nach, welche Lernziele vorausgesetzt waren. Er sucht dann vollautomatisch die passenden Übungsaufgaben aus Ebene 1 heraus und empfiehlt:

> *„Schau dir noch einmal dieses Basismodul an, um deine Lücke zu schließen!"*

## Prioritäten setzen

Im Tab „Lernlandkarte" bei Projekt- und Anwendungsaufgaben können Lernziele als **hochpriorisiert (★)** markiert werden, um den Fokus für die Bearbeitung zu setzen.
`,

  'materialien-medien': `# Materialien & Medien: Der Treibstoff für Ihre Aufgaben

Eine gute Aufgabe funktioniert selten im luftleeren Raum. Oft benötigen Schülerinnen und Schüler einen Ausgangstext, ein Erklärvideo, ein Diagramm oder einen Podcast, um überhaupt arbeiten zu können.

Im Pool-Manager können Sie Materialien zentral verwalten und direkt an Ihre Aufgaben anheften. Das Besondere daran: Sie füllen damit nicht nur die Schüleransicht in Moodle, sondern füttern gleichzeitig das „Gehirn" Ihres KI-Tutors.

## Unterstützte Formate

| Format | Beschreibung |
|--------|-------------|
| **Texte & Arbeitsblätter** | Kurze Textausschnitte, Quellen oder Lesetexte – direkt eintippen oder einfügen |
| **Dateien** | PDFs oder Bilder (Diagramme, Karikaturen, Fotos) |
| **Externe Links** | Links zu YouTube-Videos, Podcasts oder interaktiven Webseiten |

## Wo werden Materialien angeheftet?

Materialien können an zwei verschiedenen Orten auftauchen, je nachdem, was Sie erreichen möchten:

* **Als „Input" im Lernpaket (Ebene 1):** Wenn Schüler sich völlig unabhängig von einer konkreten Aufgabe erst in ein Thema einlesen sollen (z.B. ein Erklärvideo zum Einstieg).
* **Direkt in der Aufgabe (Ebene 2 & 3):** Wenn das Material zwingend zur Lösung der Aufgabe benötigt wird (z.B. eine Karikatur, die analysiert werden soll, oder ein Zeitungsartikel, der zusammengefasst werden muss).

## Das Geheimnis der KI: Wie Brian.study liest

Wenn Sie ein Material an eine Aufgabe der Ebene 2 oder 3 anheften, passiert im Hintergrund Folgendes:

| Für wen? | Was passiert? |
|----------|--------------|
| **Schüler in Moodle** | Das Material wird optisch aufbereitet – Videos werden eingebettet, PDFs können heruntergeladen werden. |
| **KI in Brian.study** | Die App integriert Ihr Material in den KI-Prompt – Brian „liest" den Inhalt und arbeitet damit. |

**Warum ist das so wichtig?** KI neigt manchmal dazu, Dinge zu erfinden („halluzinieren") oder allgemeines Internet-Wissen heranzuziehen. Wenn Sie Brian.study jedoch Ihren eigenen Textausschnitt zur Verfügung stellen, weiß der KI-Tutor: *„Ich darf dem Schüler nur mit den Informationen aus genau diesem Text helfen."* Sie behalten damit die absolute fachliche Kontrolle darüber, auf welcher Grundlage die Schüler lernen.

## Wichtig: Videos und Podcasts für die KI

> **Hinweis:** Brian.study kann (aktuell) keine Videos schauen oder Podcasts anhören.

Wenn Sie ein Video verlinken und möchten, dass der KI-Tutor inhaltliche Fragen der Schüler dazu beantworten kann, fügen Sie im Materialbereich bitte zusätzlich ein kurzes **Video-Skript oder eine inhaltliche Zusammenfassung als Text** ein. So „weiß" die KI, was in dem Video passiert.
`,

  'ebene-1-basismodule': `# Ebene 1: Basismodule & Bausteine

## Was sind Basismodule? (Wichtig vorab!)

Basismodule sind **keine fachübergreifenden Grundlagenmodule**, sondern **einheitenübergreifende Grundlagen innerhalb eines Fachs**. Sie repräsentieren Fähigkeiten, Fertigkeiten oder Fachwissen, das in vielen Einheiten immer wieder gebraucht wird – zum Beispiel „Diagramme lesen" in Erdkunde, „Bruchrechnung" in Mathematik oder „Quellenanalyse" in Geschichte.

### Warum gibt es Basismodule als eigenen Bereich?

Nicht jede Einheit wird im Pool-Manager vollständig eingepflegt. Trotzdem kommt es vor, dass Aufgaben in einer Einheit Grundlagen voraussetzen, die eigentlich in einer anderen – vielleicht noch nicht angelegten – Einheit geübt werden. Genau hier helfen Basismodule:

> **Basismodule sind bewusst leere Hüllen.** Sie bündeln Lernziele, die fachübergreifend in Aufgaben (Ebene 2 und Ebene 3) referenziert werden können – auch dann, wenn die eigentliche „Übungseinheit" für diese Grundlage gar nicht im Pool-Manager vorhanden ist.

### Wozu werden Basismodule konkret genutzt?

| Anwendungsfall | Erklärung |
|----------------|-----------|
| **Lernziel-Mapping bei Ebene-2-Aufgaben** | Im Tab „Lernlandkarte" können Sie Lernziele aus Basismodulen mit einer Transferaufgabe verknüpfen. So weiß der KI-Tutor Brian, welche Grundlagen er bei Wissenslücken empfehlen soll. |
| **Lernziel-Mapping bei Ebene-3-Aufgaben** | Auch bei Projektaufgaben können Basisfähigkeiten als Voraussetzungen hinterlegt werden – z.B. „Ich kann eine Zeitleiste lesen" als Voraussetzung für ein Geschichtsprojekt. |
| **Referenz ohne eigene Einheit** | Eine Fachschaft pflegt z.B. keine eigene Einheit „Bruchrechnen" im Pool, braucht aber trotzdem das Lernziel „Ich kann Brüche addieren" als Voraussetzung in einer Physik-Aufgabe. Das Basismodul liefert genau diese Möglichkeit. |

> **Kurz gesagt:** Basismodule sind das Bindeglied zwischen einheitenspezifischen Aufgaben und dem allgemeinen Kompetenz-Fundament eines Fachs.

---

## Die vier Aufgabenbausteine

Während es in den Ebenen 2 und 3 um Transfer und freie Projekte geht, sichern Sie in Ebene 1 das grundlegende Fachwissen und die Basis-Fähigkeiten (Vokabeln, Formeln, historische Daten, grammatikalische Regeln).

Da diese Aufgaben oft kleinteilig sind, bietet der Pool-Manager eine stark strukturierte Arbeitsweise und smarte KI-Werkzeuge, um Ihnen Zeit zu sparen.

| Baustein | Zweck | Beispiel |
|---------|-------|---------|
| **Pre-Test** | Vorwissen testen – Schüler die den Test bestehen, können den Input ggf. überspringen | „Was weißt du schon über Brüche?" |
| **Input** | Wissen aneignen – noch keine Prüfung, nur Materialbereitstellung | Erklärvideo, Buchseite, Fachtext, Podcast |
| **Übung** | Wissen anwenden – wiederholbares Training bis zur Sicherheit | Vokabeltrainer, Zuordnungsaufgaben, Lückentexte |
| **Exit-Check** | Wissen prüfen – formaler Abschluss, meldet Lernzielerreichung an Moodle / KI-Tutor | Kurze Abschlussaufgabe |

## Flexibilität durch „Opt-out"

Müssen Sie immer alle vier Bausteine ausfüllen? **Nein.**

Der Pool-Manager arbeitet mit einem **Opt-out-Prinzip** (bewusstes Auslassen). Wenn Sie für ein Thema keinen Pre-Test benötigen, lassen Sie das Feld einfach leer – das System erkennt das automatisch und überspringt diesen Schritt für die Schüler. Auch ein Lernpaket, das nur aus einem Input (z.B. einem wichtigen Info-Video) besteht, ist völlig in Ordnung.

## Zeit sparen: Der KI-Serien-Generator

Das Erstellen von 20 ähnlichen Mathe-Aufgaben oder 15 Grammatik-Sätzen kostet viel Zeit. Der **KI-Serien-Generator** nimmt Ihnen diese Arbeit ab:

### Schritt-für-Schritt-Anleitung:

1. **Master-Aufgabe erstellen**
   * Erstellen Sie nur ein einziges, perfektes Beispiel
   * *Beispiel: „Berechne den Flächeninhalt eines Rechtecks mit a = 5 cm und b = 3 cm."*

2. **Lernziel anheften**
   * Verknüpfen Sie die Master-Aufgabe mit dem passenden Lernziel
   * *Beispiel: „Ich kann Flächen berechnen"*

3. **Klone generieren**
   * Klicken Sie auf das KI-Symbol 🪄
   * Wählen Sie die Anzahl der Variationen (z.B. 5 Stück)
   * Das System erstellt automatisch strukturell identische Klone mit anderen Werten

4. **Klone prüfen und freigeben**
   * Überprüfen Sie die generierten Klone einzeln
   * Passen Sie bei Bedarf an
   * Geben Sie die Klone für die Schüler frei

> **Tipp:** Alle Klone erben das Lernziel der Master-Aufgabe automatisch – Sie müssen es nicht bei jedem Klon neu zuweisen!

### Beispiel aus der Praxis:

**Master-Aufgabe (Deutsch):**
> „Bestimme das Subjekt im Satz: 'Der schnelle Fuchs springt über den faulen Hund.'"

**KI generiert 5 Klone:**
1. „Bestimme das Subjekt: 'Die neugierige Katze schläft auf dem warmen Sofa.'"
2. „Bestimme das Subjekt: 'Ein alter Mann geht langsam die Straße entlang.'"
3. „Bestimme das Subjekt: 'Die fleißigen Schüler lernen für die Prüfung.'"
4. „Bestimme das Subjekt: 'Ein großer Vogel fliegt über das hohe Haus.'"
5. „Bestimme das Subjekt: 'Die kleine Maus versteckt sich in der Ecke.'"

**Ergebnis:** Sie haben in 2 Minuten 5 grammatikalisch korrekte Übungsaufgaben erstellt – statt 30 Minuten manueller Arbeit!
`,

  'ebene-2-allgemeine-aufgaben': `# Ebene 2: Allgemeine Aufgaben

Nachdem auf Ebene 1 das Basiswissen (Vokabeln, Formeln, Fakten) gesichert wurde, geht es in Ebene 2 um den **Transfer**. Hier analysieren die Schülerinnen und Schüler Texte, werten Diagramme aus oder schreiben kurze Erörterungen.

Da diese Aufgaben komplexer sind, begleitet der KI-Tutor Brian.study die Lernenden bei jedem Schritt. Der Pool-Manager bietet Ihnen dafür passgenaue Werkzeuge.

## Schritt 1: Der KI-Aufgaben-Assistent (Ihr „Zauberstab")

Haben Sie grob im Kopf, was die Schüler machen sollen, aber es fehlt noch an der perfekten Formulierung? Lassen Sie sich von der App helfen!

In der Übersicht der Allgemeinen Aufgaben finden Sie den Button **„Mit KI entwerfen"** (mit Zauberstab-Symbol).

| Schritt | Was passiert? |
|---------|--------------|
| **Idee eingeben** | Tragen Sie ein paar Stichpunkte ein (z.B. „Vergleich der Weimarer Verfassung mit dem Grundgesetz, Fokus auf die Macht des Präsidenten") |
| **Generieren** | Das System entwirft daraus einen motivierenden Aufgabentitel und eine schülergerechte Aufgabenstellung |
| **Kompetenz-Vorschläge** | Die KI schlägt vor, welche Kompetenzen die Schüler benötigen (z.B. „Quellenanalyse", „Recherchieren") |
| **Übernehmen** | Klicken Sie auf „Als neue Aufgabe übernehmen" – der Text ist danach jederzeit anpassbar |

> **Wichtig zu den Kompetenzen:** Die von der KI vorgeschlagenen Kompetenzen sind zunächst nur „Notizzettel" für Sie. Vergessen Sie nicht, in der **Lernlandkarte (Tab 3)** die echten Basismodule (Ebene 1) mit dieser Aufgabe zu verknüpfen, damit das System weiß, wo Schüler bei Schwierigkeiten üben können.

## Schritt 2: Der Erwartungshorizont (Die Musterlösung)

Im Gegensatz zu den offenen Projektaufgaben (Ebene 3) gibt es in Ebene 2 in der Regel klare fachliche Kriterien oder eine Musterlösung.

Tragen Sie im Feld **Erwartungshorizont** so präzise wie möglich ein, welche inhaltlichen Punkte in der Schülerantwort vorkommen müssen. Dieser Text ist besonders wichtig, da er später das „Gehirn" für die Bewertung durch den KI-Tutor bildet. Ein guter Erwartungshorizont umfasst:

* Fachliche Kerninhalte und Begriffe
* Erwartete Argumentation oder Struktur
* Bewertungshinweise und Gewichtung

## Schritt 3: Den KI-Tutor vorbereiten (Vollautomatisch)

Wechseln Sie in den Reiter **„KI-Tutor Prompt"** und klicken Sie auf **„Alle Felder generieren"**. Das System erstellt automatisch:

* Es übersetzt Ihren Erwartungshorizont in eine Bewertungsrubrik.
* Es weist die KI streng an, den Schülern **niemals einfach die Lösung zu verraten**, sondern nur durch geschickte Rückfragen (**Scaffolding**) zu helfen.
* Es bindet die verknüpften Lernziele ein, damit der Tutor den Schülern bei Lücken gezielt Übungen aus Ebene 1 empfehlen kann.

> **Hinweis:** Sie müssen in diesem Reiter nichts herauskopieren. Lesen Sie die generierten Felder kurz gegen – das Export-Team holt sich diese Daten später automatisch ab.

## Schritt 4: Warum kann ich meine Aufgabe nicht bearbeiten?

Wenn der „Bearbeiten"-Button ausgegraut ist oder Sie nur eine Leseansicht sehen, greift der Sicherheits-Lock der App. Dies passiert in zwei Fällen:

| Ursache | Was tun? |
|---------|---------|
| **Ein Kollege bearbeitet die Aufgabe** | Warten Sie – Sie sehen einen Hinweis, wer gerade aktiv ist. Nach 60 Minuten läuft die Sperre automatisch ab. |
| **Aufgabe wartet auf Export** | Die Aufgabe wurde ins Freigabe-Cockpit geschickt. Sie wird automatisch entsperrt, sobald der Export erfolgreich war. |

Mehr dazu im Kapitel [Export-Workflow](/docs/export-workflow).
`,

  'ebene-3-projektaufgaben': `# Ebene 3: Projektaufgaben & Anwendungsaufgaben

Willkommen auf der höchsten Anforderungsebene! Während es in Ebene 1 und 2 oft um das Verstehen und Üben geht, wenden die Schülerinnen und Schüler ihr Wissen bei den Projektaufgaben (Ebene 3) frei und kreativ an.

Da Projektaufgaben ergebnisoffen sind (es gibt nicht die eine richtige Musterlösung), bietet der Pool-Manager hier spezielle Werkzeuge, um den Schülern klare Leitplanken zu geben und den KI-Tutor "Brian.study" perfekt auf die Aufgabe vorzubereiten.

## Die zwei Aufgabentypen

| Typ | Beschreibung |
|-----|-------------|
| **Anwendungsaufgabe** | Gelerntes auf eine neue, konkrete Situation anwenden |
| **Projektaufgabe** | Längerfristiges, produktionsorientiertes Vorhaben (z.B. eine Ausstellung, ein Podcast) |

## Schritt 1: Abgabeformate definieren (Was wird erwartet?)

Im Tabreiter **„Abgabe & Gütekriterien"** legen Sie als Erstes fest, in welcher Form die Schüler ihr Endergebnis präsentieren sollen.

* **Auswahl-Kacheln:** Klicken Sie auf die passenden Kacheln (z. B. Text, Präsentation, Zeitleiste, Grafik). Sie können auch mehrere Formate gleichzeitig auswählen.
* **Eigenes Format:** Fehlt etwas in der Liste? Tragen Sie im Textfeld darunter ein ganz eigenes Format ein (z. B. „Podcast-Skript" oder „Flyer").

## Schritt 2: Besonderer Fokus (Worauf legen Sie Wert?)

Unter den Formaten finden Sie ein optionales Textfeld für den **besonderen Fokus**. Hier teilen Sie dem System mit, was Ihnen bei der Bewertung dieser spezifischen Aufgabe am wichtigsten ist.

> **Beispiel:** „Achte besonders auf eine saubere Quellenarbeit und eine chronologisch korrekte Reihenfolge der Ereignisse."

**Tipp:** Je genauer Sie hier sind, desto besser kann die KI im nächsten Schritt die Bewertungskriterien für Sie vorschlagen.

## Schritt 3: Gütekriterien generieren (Der KI-Assistent)

Da es keine feste Musterlösung gibt, benötigt der KI-Tutor Brian.study klare **Bewertungsrubriken** (Kriterien und Punkte), um den Schülern sinnvolles Feedback geben zu können. Sie müssen sich diese Kriterien nicht mühsam selbst ausdenken!

1. Klicken Sie auf den Button **„Gütekriterien mit KI generieren"**.
2. Das System nimmt Ihre gewählten Abgabeformate und Ihren „Besonderen Fokus" und erstellt daraus automatisch 2–3 thematische Bewertungskategorien.
3. **Nachbearbeiten:** Sie können die generierten Texte und Punkte anschließend in den Textfeldern nach Ihren Wünschen anpassen.

Jede Rubrik enthält:

| Feld | Beschreibung |
|------|-------------|
| **Titel** | Thema der Rubrik, z.B. „Argumentation" oder „Struktur" |
| **Punkte** | Gewichtung im Gesamtbild |
| **Kriterienbeschreibung** | Was wird konkret erwartet? |

## Schritt 4: Der KI-Tutor Prompt (Vollautomatisch)

Damit Brian.study genau weiß, wie er sich den Schülern gegenüber verhalten soll, benötigt er detaillierte Systemanweisungen (den sogenannten „Prompt").

**Die gute Nachricht: Sie müssen kein KI-Experte sein!**

Im Tabreiter **„KI-Tutor Prompt"** erledigt der Pool-Manager die gesamte Arbeit für Sie:

1. Klicken Sie auf **„Alle Felder generieren"**.
2. Das System baut aus Ihrer Aufgabenstellung, den Gütekriterien und den Abgabeformaten eine vollständige Tutor-Persona zusammen.
3. Es legt automatisch fest, dass der Tutor nur Denkanstöße geben darf (**Scaffolding**) und niemals die Lösung verrät.
4. Außerdem formuliert die KI die Abbruchbedingung (z.B. „Wenn die Zeitleiste vollständig besprochen wurde").

> **Wichtiger Hinweis zum Export:** Sie sehen in diesem Bereich absichtlich keine Kopieren-Buttons. Sie müssen hier nichts herauskopieren! Ihre einzige Aufgabe ist es, die generierten Texte einmal gegenzulesen. Das eigentliche Kopieren und Übertragen in Brian.study übernimmt später das Export-Team im separaten **Export-Cockpit**.

## Schritt 5: Die Lernlandkarte (Kompetenz-Mapping)

Vergessen Sie nicht, im Reiter **„Lernlandkarte"** die Lernziele auszuwählen, die für dieses Projekt zwingend benötigt werden.

* Wenn Sie den **KI-Aufgaben-Wizard** (den „Zauberstab" bei der Aufgabenerstellung) genutzt haben, stehen Ihnen die von der KI vorgeschlagenen Kompetenzen bereits als kleine Tags zur Orientierung zur Verfügung.
* Verknüpfen Sie hier die passenden **Basismodule (Ebene 1)**, damit Schüler bei Lücken genau wissen, wo sie Grundlagen nacharbeiten müssen.
`,

  'ki-tutor-brian': `# Der KI-Tutor: Brian.study

Wenn Ihre Schülerinnen und Schüler an komplexen Aufgaben (Ebene 2 und 3) arbeiten, sind sie nicht auf sich allein gestellt. Während Moodle die Aufgabenstellung liefert, übernimmt **Brian.study** die Rolle des geduldigen, digitalen Lernbegleiters.

Dieses Kapitel erklärt, wie Brian „denkt" und wie der Pool-Manager ihn vollautomatisch auf Ihren Unterricht vorbereitet.

## Wer oder was ist Brian?

Brian ist ein konversationeller Chatbot – er funktioniert wie ein Text-Chat (ähnlich wie WhatsApp), in dem der Schüler mit der KI schreibt.

**Brians wichtigste pädagogische Regel: Scaffolding statt Vorsagen.**

Brian wird Ihren Schülern niemals einfach die fertige Lösung präsentieren. Stattdessen nutzt er gezielte Rückfragen und Denkanstöße, um die Schüler selbst auf den richtigen Weg zu führen. Fehler werden dabei nicht verurteilt, sondern als Lernchance genutzt.

## Das „Gehirn" des Tutors: Die 5 Segmente

Damit Brian weiß, worum es in Ihrer spezifischen Aufgabe geht, baut der Pool-Manager im Hintergrund ein exaktes „Gehirn" für ihn zusammen. Dieses besteht immer aus fünf Bausteinen:

| # | Segment | Was steht darin? | Sichtbar für Schüler? |
|---|---------|-----------------|----------------------|
| 1 | **Dialogname** | Titel der Aufgabe (z.B. „Analyse der Weimarer Verfassung") | ✅ Ja |
| 2 | **Anweisung für Lernende** | Ihre ausformulierte Aufgabenstellung | ✅ Ja |
| 3 | **Interne Anweisung (Persona)** | Erwartungshorizont, Lernziele, Scaffolding-Regeln – Brian wird hier zum motivierenden Coach „konditioniert" | ❌ Nein |
| 4 | **Beendigungs-Regel** | Wann gilt der Dialog als abgeschlossen? (z.B. „Wenn die Zeitleiste vollständig besprochen wurde") | ❌ Nein |
| 5 | **Bewertungsrubriken** | Ihre Gütekriterien (Punkte & Anforderungen) für das strukturierte Abschluss-Feedback | ❌ Nein |

> **Hinweis:** Die interne Anweisung (Segment 3) ist der wichtigste Baustein. Hier fließen Ihre Materialien und der Erwartungshorizont ein – je präziser diese Vorarbeit, desto hilfreicher ist Brian für Ihre Schüler.

## Ihre Rolle als Lehrkraft: Der Autopilot

Das Beste daran: **Sie müssen diese 5 Segmente nicht selbst schreiben!**

1. Wechseln Sie im Tab der Aufgabe in den Reiter **„KI-Tutor Prompt"**.
2. Klicken Sie auf **„Alle Felder generieren"**.
3. Der Pool-Manager zieht sich alle Informationen, die Sie vorher erstellt haben (Aufgabenstellung, Erwartungshorizont, Gütekriterien, Lernziele), und übersetzt sie automatisch in die maschinenlesbare Sprache für Brian.

**Sie müssen in diesem Reiter nichts kopieren oder exportieren.** Prüfen Sie die generierten Texte kurz auf Stimmigkeit – das Export-Team kümmert sich später im Export-Cockpit um die technische Übertragung zu Brian.study.

## Was Brian berücksichtigt

Bei der Generierung verarbeitet das System:

* Aufgabenstellung und **Erwartungshorizont** (Ebene 2) bzw. **Bewertungsrubriken** (Ebene 3)
* Alle verknüpften **Lernziele** – damit Brian bei Wissenslücken auf passende Ebene-1-Übungen verweisen kann
* **Fach und Jahrgangsstufe** der Einheit für einen passenden Ton und fachliche Präzision
`,

  'freigabe-qualitaetssicherung': `# Freigabe & Qualitätssicherung: Der finale Check

Sie haben eine tolle Aufgabe erstellt, Materialien angeheftet und die KI-Gütekriterien generieren lassen. Was nun? Wie kommt die Aufgabe zum Export-Team?

Der Pool-Manager nutzt dafür einen bewussten Zwischenschritt: die **Freigabe**. Dieses System funktioniert wie ein digitaler Briefkasten zwischen den Lehrkräften und dem Team, das den Export nach Moodle und Brian.study übernimmt.

## Der sichere Hafen: „Entwurf"

Keine Sorge: Alles, was Sie im Pool-Manager neu anlegen, hat zunächst automatisch den Status **Entwurf**.

In diesem Status können nur Sie und Ihre Kollegen in der App die Aufgabe sehen. Schüler haben darauf keinen Zugriff, und auch das Export-Team ignoriert diese Aufgaben noch. Sie können also in aller Ruhe experimentieren, Texte umschreiben oder die Aufgabe an verschiedenen Tagen bearbeiten – nichts geht versehentlich „live".

## Der Klick auf „Freigeben"

Sobald Sie mit Ihrer Aufgabe hundertprozentig zufrieden sind, klicken Sie auf den Button **„Für Export freigeben"**.

Was passiert in diesem Moment?

| Was? | Warum? |
|------|--------|
| **Das Schloss schnappt zu** | Die Aufgabe wird für die Bearbeitung gesperrt, damit das Export-Team nicht an einem sich ändernden Dokument arbeitet. |
| **Digitaler Briefkasten** | Die Aufgabe taucht beim Export-Team in einer speziellen To-Do-Liste auf. |

## Das Freigabe-Cockpit (Für das Export-Team)

Das Export-Team (oder die Fachschaftsleitung) hat einen eigenen Bereich: das **Freigabe-Cockpit** (auch Export-Cockpit genannt).

Hier sehen die Verantwortlichen eine aufgeräumte Liste mit allen Aufgaben, die von den Lehrkräften das grüne Licht bekommen haben. Das Team muss sich also nicht mühsam durch alle Einheiten klicken, sondern hat alle „lieferbereiten" Aufgaben zentral an einem Ort.

Von hier aus startet das Team den eigentlichen Export nach Moodle und Brian.study (siehe Kapitel [Export-Workflow](/docs/export-workflow)).

## Ich habe einen Fehler entdeckt! (Freigabe zurückziehen)

Haben Sie eine Aufgabe freigegeben und bemerken kurz danach einen Tippfehler im Erwartungshorizont?

Solange das Export-Team noch nicht mit der Arbeit begonnen hat (die Aufgabe also noch nicht den Status **„In Übertragung"** oder **„Live"** hat), können Sie die Freigabe jederzeit zurückziehen.

Die Aufgabe fällt dann wieder in den Status **Entwurf** zurück, das Schloss öffnet sich, und die Aufgabe verschwindet wieder von der To-Do-Liste des Export-Teams.
`,

  'kollaboration-sperren': `# Kollaboration & Sperren

Der Pool-Manager ist ein echtes Team-Werkzeug. Oft arbeiten mehrere Lehrkräfte einer Fachschaft gleichzeitig in derselben Einheit. Damit Sie sich dabei nicht versehentlich gegenseitig Texte überschreiben oder Chaos bei den KI-Einstellungen entsteht, nutzt die App ein intelligentes **Sperrsystem (Locking)**.

> **Warum Sperren?** Wenn zwei Lehrkräfte gleichzeitig denselben Text ändern, gewinnt am Ende die, die als Letztes auf „Speichern" drückt – und die Arbeit der anderen ist verloren. Das Sperrsystem verhindert genau das.

## Leseansicht als Standard

Wenn Sie eine Aufgabe öffnen (egal ob Ebene 1, 2 oder 3), befinden Sie sich zunächst immer in einer reinen **Leseansicht**. Sie können in Ruhe alles ansehen, Kriterien durchlesen und Materialien prüfen, ohne aus Versehen etwas zu verändern.

Sobald Sie etwas anpassen möchten, klicken Sie aktiv auf den Button **„Bearbeiten"**.

## Was passiert beim Klick auf „Bearbeiten"?

In diesem Moment reserviert das System diese Aufgabe **exklusiv für Sie**. Für alle anderen Kollegen ändert sich die Ansicht sofort:

* Der „Bearbeiten"-Button wird grau (deaktiviert).
* Es erscheint ein Schloss-Symbol 🔒 und ein Hinweis, z.B. *„Wird gerade bearbeitet von Max Muster"*.

Sie können nun in aller Ruhe Ihre Änderungen vornehmen – niemand kann Ihnen in dieser Zeit dazwischenfunken.

## Wie wird eine Aufgabe wieder freigegeben?

| Situation | Was passiert? |
|-----------|--------------|
| **Sie klicken „Speichern" oder „Abbrechen"** | Die Sperre wird sofort aufgehoben – der Nächste kann übernehmen |
| **Aufgabe ist im Export-Cockpit** | Sperre bleibt aktiv, bis das Export-Team beide Systeme (Moodle **und** Brian.study) erfolgreich bespielt hat |
| **Sicherheits-Timeout (60 Min.)** | Inaktive Sperren verfallen automatisch – ideal wenn ein Kollege den Browser geschlossen hat, ohne zu speichern |

## Sperr-Arten im Überblick

| Sperr-Typ | Was wird gesperrt? | Wer setzt sie? |
|-----------|-------------------|----------------|
| **Task-Lock** | Eine einzelne Aufgabe | Jede Lehrkraft beim Klick auf „Bearbeiten" |
| **Export-Lock (Dual-Lock)** | Aufgabe während des Exports | Das Export-Cockpit automatisch |
| **Structural Lock** | Die gesamte Einheitsstruktur (Themenfelder, Lernpakete) | Beim Bearbeiten der Struktur |

## Präsenz-Anzeige

Im Arbeitsbereich sehen Sie, welche Kollegen gerade online sind und an welcher Einheit sie arbeiten – so können Sie Abstimmungen einfach direkt klären, bevor es zu Konflikten kommt.

## Admin-Unlock

Wenn eine Sperre irrtümlich aktiv bleibt (z.B. Browser-Absturz, vergessener Tab), können Administratoren die Sperre manuell aufheben. Der **„Admin-Unlock"**-Button erscheint automatisch, sobald eine Sperre älter als 60 Minuten ist.

## Erste Hilfe bei Sperren

**„Ich muss dringend an diese Aufgabe, aber sie ist gesperrt!"**
Sprechen Sie den angezeigten Kollegen kurz an – oft ist der Tab im Hintergrund noch offen. Alternativ warten Sie auf den automatischen Timeout nach 60 Minuten, oder bitten Sie einen Administrator, die Sperre aufzuheben.

**„Die Aufgabe ist nach dem Export immer noch gesperrt!"**
Das bedeutet meist, dass das Export-Team erst die halbe Arbeit erledigt hat (z.B. die Aufgabe ist schon in Moodle, aber noch nicht in Brian.study hochgeladen). Sobald das Export-Cockpit für **beide** Systeme „Grünes Licht" gibt, öffnet sich das Schloss automatisch.

Mehr dazu im Kapitel [Export-Workflow](/docs/export-workflow).
`,

  'export-workflow': `# Export-Workflow (Moodle & Brian.study)

In diesem Kapitel erfahren Sie, wie Ihre fertigen Aufgaben den Weg zu den Schülern finden. Da der Pool-Manager mit zwei Systemen arbeitet – **Moodle** für die Struktur und **Brian.study** für das KI-Coaching – folgt die App einem speziellen Sicherheits-Workflow, der sicherstellt, dass beide Systeme stets synchron sind.

## Die zwei Wege einer Aufgabe

Aufgaben der Ebene 2 und 3 (Allgemeine Aufgaben und Projektaufgaben) sind **„hybrid"**. Das bedeutet:

* In **Moodle** wird der formale Rahmen, die Aufgabenstellung und der Link zum KI-Tutor bereitgestellt.
* In **Brian.study** arbeitet der eigentliche KI-Tutor, der die Schüler beim Lösen individuell begleitet.

Damit beides zusammenpasst, muss das Export-Team die Aufgabe an **beide Systeme** übertragen. Erst wenn beide Übertragungen erfolgreich waren, gilt eine Aufgabe als vollständig live.

## Den Sync-Status verstehen

An jeder Aufgabe finden Sie ein Status-Label, das verrät, wo die Aufgabe gerade „steckt":

| Status | Farbe | Bedeutung |
|--------|-------|-----------|
| **Neu** | Grau | Die Aufgabe wurde erstellt, aber noch nicht für den Export freigegeben. |
| **In Übertragung** | Gelb | Das Export-Team arbeitet gerade am Upload in Moodle oder Brian.study. |
| **Live** | Grün | Die Aufgabe ist erfolgreich übertragen und für Schüler verfügbar. |
| **Geändert** | Orange | Die Aufgabe war live, wurde aber nachträglich bearbeitet. Ein Re-Export ist nötig. |
| **Fehler** | Rot | Der Export ist fehlgeschlagen. Das Export-Team muss eingreifen. |

> **Hinweis:** Der Status „Geändert" entsteht automatisch, sobald eine Lehrkraft eine bereits exportierte Aufgabe bearbeitet. Moodle und Brian.study werden erst nach dem nächsten Export wieder aktuell sein.

## Warum ist die Aufgabe gesperrt? (Der Dual-Lock)

Sobald eine Aufgabe für den Export freigegeben wird, wird sie **für die Bearbeitung gesperrt**. Das ist ein wichtiger Schutzmechanismus: Würden Inhalte geändert werden, während das Export-Team sie gerade hochlädt, käme es zu Inkonsistenzen zwischen den Systemen.

Das Schloss-Symbol 🔒 an einer Aufgabe zeigt an, dass der Export läuft. **Die Sperre wird erst automatisch aufgehoben, wenn beide Exporte – Moodle UND Brian.study – erfolgreich abgeschlossen wurden.** Erst dann ist die Aufgabe wieder zur Bearbeitung freigegeben.

Als **Administrator** können Sie eine abgelaufene oder fehlerhafte Sperre manuell aufheben, falls der Export-Prozess unterbrochen wurde.

## Der Export-Schritt für Schritt

### Vorbereitung (Lehrkraft)

1. Aufgabe vollständig ausfüllen (Aufgabenstellung, Erwartungshorizont / Rubriken)
2. KI-Tutor-Felder im Tab „KI-Tutor Prompt" generieren und prüfen
3. Aufgabe **freigeben** (Content-Status → \`approved\`)

### Export (Export-Team / Moodle-Designer)

1. Im **Export-Cockpit** alle exportbereiten Aufgaben prüfen
2. **Moodle-Export** durchführen und Übertragung bestätigen
3. **Brian.study-Export** durchführen: Prompt-Segmente kopieren und im Brian-Backend anlegen
4. Beide Exporte im Cockpit als erfolgreich **bestätigen** → Dual-Lock wird aufgehoben

### Nach dem Export

* Aufgabe hat Status \`synced\` in beiden Systemen
* Sperre ist aufgehoben – die Aufgabe kann wieder bearbeitet werden
* Bei nachträglichen Änderungen: Status springt auf \`modified\` → neuer Export-Zyklus beginnt

## Das Export-Cockpit

Das Export-Cockpit (Tab 9 im Arbeitsbereich) ist die zentrale Schaltzentrale für das Export-Team. Dort sind alle Aufgaben aufgelistet, die:

* noch nie exportiert wurden (\`new\`)
* auf einen Re-Export warten (\`modified\`)
* gerade im Export-Prozess sind (\`pending\`)

Im Cockpit können die **Brian.study-Segmente** direkt kopiert werden. Außerdem steht eine **Druckansicht des Moodle-Bauplans** zur Verfügung.
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

## Navigation & Oberfläche

**Frage: Wo finde ich den Workspace (Arbeitsbereich)?**
> Klicken Sie in der linken Navigation auf „Einheiten" und dann auf eine beliebige Einheit. Der Workspace öffnet sich automatisch.

**Frage: Wie komme ich zu einer bestimmten Aktivität?**
> Nutzen Sie die Suchfunktion in der linken Sidebar des Workspace. Geben Sie den Namen der Aktivität ein und klicken Sie auf das Ergebnis.

**Frage: Warum sehe ich keinen „Bearbeiten"-Button?**
> Das hängt von Ihrer Rolle ab:
> * **Betrachter** können nur lesen
> * **Fachlehrkräfte** können bearbeiten
> * Bei **gesperrten** Aufgaben ist der Button deaktiviert

## Bearbeitungssperren

**Frage: Ich muss dringend eine Aufgabe bearbeiten, aber sie ist gesperrt!**

| Lösung | Wann? |
|--------|-------|
| **Kollegen ansprechen** | Wenn die Sperre aktuell ist (weniger als 60 Min.) |
| **Warten** | Sperren laufen nach 60 Minuten automatisch ab |
| **Admin-Unlock** | Wenn die Sperre fehlerhaft ist (nur für Administratoren) |

**Frage: Die Aufgabe ist nach dem Export immer noch gesperrt!**
> Das bedeutet, der Export ist noch nicht vollständig. Der Dual-Lock (Moodle UND Brian.study) wird erst aufgehoben, wenn beide Systeme erfolgreich übertragen wurden.

## Export-Probleme

**Frage: Der Moodle-Export schlägt fehl – was tun?**

Prüfen Sie diese Punkte:
1. Sind alle Pflichtfelder der Aktivität ausgefüllt?
2. Ist der Content-Status auf \`approved\` (freigegeben)?
3. Wurde der Export im Export-Cockpit korrekt bestätigt?

**Frage: Wie exportiere ich eine Aufgabe nach Brian.study?**
> Das Export-Team nutzt das **Export-Cockpit** (Tab 9 im Workspace). Dort können die KI-Prompt-Segmente kopiert und im Brian-Backend eingefügt werden.

## KI-Funktionen

**Frage: Die KI generiert keinen Erwartungshorizont.**
> Für Ebene-2-Aufgaben müssen Sie zuerst eine grobe Aufgabenstellung eingeben. Die KI kann nur auf Basis Ihrer Eingaben arbeiten.

**Frage: Die KI-Vorschläge sind zu allgemein.**
> Geben Sie im „Besonderen Fokus" konkretere Hinweise (z.B. „Achte auf Quellenarbeit" statt nur „Gute Qualität").

**Frage: Kann ich die KI-Generierung abbrechen?**
> Ja, schließen Sie einfach das KI-Fenster. Es wurden noch keine Daten gespeichert.

## Lernziele & Mapping

**Frage: Warum muss ich Lernziele verknüpfen?**
> Ohne Lernziel-Zuordnung weiß der KI-Tutor Brian nicht, welche Übungen er Schülern bei Wissenslücken empfehlen soll.

**Frage: Ich finde das passende Lernziel nicht!**
> Lernziele aus anderen Einheiten oder Basismodulen können ebenfalls ausgewählt werden. Nutzen Sie die Suchfunktion im Lernziel-Dialog.

## Technische Probleme

**Frage: Meine Änderungen werden nicht gespeichert.**
> Mögliche Ursachen:
> * Sitzung abgelaufen → Seite neu laden
> * Keine Berechtigung → Rolle prüfen
> * Aufgabe im Export → Warten bis Export fertig

**Frage: Die App lädt nicht richtig.**
> Versuchen Sie:
> 1. Browser-Cache leeren (Strg+F5)
> 2. Anderen Browser testen (Chrome, Firefox, Edge)
> 3. Administrator informieren

## Support kontaktieren

| Problem-Typ | Ansprechpartner |
|-------------|----------------|
| **Technische Fehler** | Systemadministrator |
| **Inhaltliche Fragen** | Fachschaftsleitung / Export-Team |
| **Benutzerrechte** | Administrator |
> **Tipp:** Machen Sie bei Fehlern einen Screenshot und notieren Sie, was Sie gerade gemacht haben. Das hilft bei der Fehlersuche!
`,
};

export function getDocContent(slug) {
  return DOC_CONTENT[slug] || `# ${slug}\n\nDieser Artikel ist noch in Bearbeitung.`;
}